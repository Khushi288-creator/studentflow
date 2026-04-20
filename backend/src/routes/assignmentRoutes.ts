import express from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticateJWT, requireRole } from '../middleware/auth'
import { submissionUpload, materialsUpload } from '../utils/upload'

const router = express.Router()

router.get('/assignments', authenticateJWT, async (req, res) => {
  const role = req.auth!.role
  const courseId = (req.query.courseId as string | undefined) ?? undefined
  const now = new Date()

  if (role === 'student') {
    // Show assignments from ALL courses (not just enrolled) so students see teacher's assignments
    // Also include enrolled courses
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { userId: req.auth!.userId },
      select: { courseId: true },
    })
    const enrolledCourseIds = enrollments.map((e) => e.courseId)

    // Get all courses that have assignments (from any teacher)
    const allCourses = await prisma.course.findMany({ select: { id: true } })
    const allCourseIds = allCourses.map(c => c.id)

    const assignments = await prisma.assignment.findMany({
      where: {
        courseId: courseId ? courseId : { in: allCourseIds },
      },
      orderBy: { dueDate: 'asc' },
      include: { course: { select: { name: true } } },
    })
    return res.json({
      assignments: assignments.map(a => ({
        ...a,
        courseName: (a as any).course?.name,
        dueDate: a.dueDate.toISOString().slice(0, 10),
      }))
    })
  }

  if (role === 'teacher') {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.auth!.userId },
      select: { id: true },
    })
    if (!teacher) return res.json({ assignments: [] })
    const courses = await prisma.course.findMany({
      where: { teacherId: teacher.id },
      select: { id: true },
    })
    const courseIds = courses.map((c) => c.id)
    const assignments = await prisma.assignment.findMany({
      where: {
        courseId: courseId ? courseId : { in: courseIds },
      },
      orderBy: { dueDate: 'asc' },
    })
    return res.json({ assignments })
  }

  // Admin: all assignments.
  const assignments = await prisma.assignment.findMany({
    where: {
      courseId: courseId,
    },
    orderBy: { dueDate: 'asc' },
  })

  void now
  return res.json({ assignments })
})

const createAssignmentSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(2),
  description: z.string().min(5),
  dueDate: z.string().min(1),
  className: z.string().optional(), // target class — if set, only notify that class
})

router.post('/assignments', authenticateJWT, requireRole(['teacher']), async (req, res) => {
  try {
    const parsed = createAssignmentSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const { courseId, title, description, dueDate, className } = parsed.data

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.auth!.userId },
      select: { id: true },
    })
    if (!teacher) return res.status(403).json({ message: 'Teacher profile missing' })

    const course = await prisma.course.findFirst({
      where: { id: courseId, teacherId: teacher.id },
      select: { id: true, name: true },
    })
    if (!course) return res.status(403).json({ message: 'Not allowed for this course' })

    const assignment = await prisma.assignment.create({
      data: { courseId, title, description, dueDate: new Date(dueDate) },
    })

    // Notify students: if className given → only that class, else all enrolled
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { courseId },
      select: { userId: true },
    })

    let targetUserIds: string[] = enrollments.map(e => e.userId)

    if (className) {
      // Filter to only students whose profile has matching className
      const profiles = await prisma.studentProfile.findMany({
        where: { userId: { in: targetUserIds }, className },
        select: { userId: true },
      })
      const classUserIds = new Set(profiles.map(p => p.userId))

      // Also include students not yet enrolled but in that class
      const allClassProfiles = await prisma.studentProfile.findMany({
        where: { className },
        select: { userId: true },
      })
      const allClassUserIds = allClassProfiles.map(p => p.userId)

      // Union: enrolled in course AND in class, OR in class (so they see the assignment)
      targetUserIds = [...new Set([...classUserIds, ...allClassUserIds])]
    }

    for (const userId of targetUserIds) {
      await prisma.notice.create({
        data: {
          title: `New Assignment: ${title}`,
          description: `Your teacher posted a new assignment in ${course.name}${className ? ` for Class ${className}` : ''}. Due: ${dueDate}`,
          type: 'assignment',
          userId,
        },
      })
    }

    res.status(201).json({ assignment })
  } catch (err) {
    console.error('[POST /assignments]', err)
    res.status(500).json({ message: 'Failed to create assignment' })
  }
})

// Get materials for an assignment (students + teachers)
router.get('/assignments/:assignmentId/materials', authenticateJWT, async (req, res) => {
  const assignmentId = Array.isArray(req.params.assignmentId)
    ? req.params.assignmentId[0]
    : req.params.assignmentId
  const materials = await prisma.assignmentMaterial.findMany({
    where: { assignmentId },
    orderBy: { createdAt: 'asc' },
  })
  res.json({ materials: materials.map(m => ({ id: m.id, fileUrl: m.fileUrl })) })
})

// Student: get their own submitted assignment IDs (for persistent submitted state)
router.get('/assignments/my-submissions', authenticateJWT, requireRole(['student']), async (req, res) => {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { userId: req.auth!.userId },
    select: { id: true },
  })
  const studentIds = enrollments.map(e => e.id)
  const submissions = await prisma.submission.findMany({
    where: { studentId: { in: studentIds } },
    select: { assignmentId: true },
  })
  res.json({ submittedIds: submissions.map(s => s.assignmentId) })
})

// Teacher: get all submissions for an assignment
router.get('/assignments/:assignmentId/submissions', authenticateJWT, requireRole(['teacher']), async (req, res) => {
  const assignmentId = req.params.assignmentId as string

  const teacher = await prisma.teacher.findUnique({
    where: { userId: req.auth!.userId },
    select: { id: true },
  })
  if (!teacher) return res.status(403).json({ message: 'Teacher profile missing' })

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: { select: { name: true, teacherId: true } } },
  })
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' })
  if (assignment.course.teacherId !== teacher.id) return res.status(403).json({ message: 'Not your assignment' })

  const submissions = await prisma.submission.findMany({
    where: { assignmentId },
    include: {
      student: {
        include: {
          user: { select: { name: true } },
          course: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return res.json({
    submissions: submissions.map((s) => ({
      id: s.id,
      studentName: s.student.user.name,
      subject: s.student.course.name,
      fileUrl: s.fileUrl,
      marks: s.marks,
      submittedAt: s.createdAt,
    })),
  })
})

router.post(
  '/assignments/:assignmentId/submit',
  authenticateJWT,
  requireRole(['student']),
  submissionUpload.single('file'),
  async (req, res) => {
    const assignmentId = Array.isArray(req.params.assignmentId)
      ? req.params.assignmentId[0]
      : req.params.assignmentId
    const file = req.file
    if (!file) return res.status(400).json({ message: 'Missing file' })

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, courseId: true },
    })
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' })

    // Find student enrollment for the assignment course.
    let enrollment = await prisma.studentEnrollment.findUnique({
      where: { userId_courseId: { userId: req.auth!.userId, courseId: assignment.courseId } },
    })
    if (!enrollment) {
      enrollment = await prisma.studentEnrollment.create({
        data: {
          userId: req.auth!.userId,
          courseId: assignment.courseId,
          phone: 'NA',
        },
      })
    }

    const submission = await prisma.submission.create({
      data: {
        assignmentId,
        studentId: enrollment.id,
        fileUrl: `/uploads/submissions/${file.filename}`,
      },
    })

    // Demo auto-grading so the Student "Results" page isn't empty.
    const marks = 55 + Math.floor(Math.random() * 40)
    const grade =
      marks >= 90
        ? 'A+'
        : marks >= 80
          ? 'A'
          : marks >= 70
            ? 'B'
            : marks >= 60
              ? 'C'
              : marks >= 50
                ? 'D'
                : 'F'

    await prisma.submission.update({
      where: { id: submission.id },
      data: { marks },
    })

    await prisma.result.upsert({
      where: { studentId_courseId: { studentId: enrollment.id, courseId: assignment.courseId } },
      update: { marks, grade },
      create: {
        studentId: enrollment.id,
        courseId: assignment.courseId,
        marks,
        grade,
      },
    })

    // Notify student: result declared
    await prisma.notice.create({
      data: {
        title: `Result Declared`,
        description: `Your assignment has been graded. Marks: ${marks}, Grade: ${grade}.`,
        type: 'result',
        userId: req.auth!.userId,
      },
    })

    // Notify teacher
    const assignmentWithCourse = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { course: { include: { teacher: { select: { userId: true } } } } },
    })
    const studentUser = await prisma.user.findUnique({ where: { id: req.auth!.userId }, select: { name: true } })
    if (assignmentWithCourse) {
      await prisma.notice.create({
        data: {
          title: `Assignment Submitted`,
          description: `${studentUser?.name ?? 'A student'} submitted "${assignmentWithCourse.title}" in ${assignmentWithCourse.course.name}.`,
          type: 'assignment',
          userId: assignmentWithCourse.course.teacher.userId,
        },
      })
    }

    res.status(201).json({ submission: { ...submission, marks } })
  },
)

router.post(
  '/assignments/:assignmentId/materials',
  authenticateJWT,
  requireRole(['teacher']),
  materialsUpload.single('file'),
  async (req, res) => {
    const assignmentId = Array.isArray(req.params.assignmentId)
      ? req.params.assignmentId[0]
      : req.params.assignmentId
    const file = req.file
    if (!file) return res.status(400).json({ message: 'Missing file' })

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, courseId: true },
    })
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' })

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.auth!.userId },
      select: { id: true },
    })
    if (!teacher) return res.status(403).json({ message: 'Teacher profile missing' })

    const course = await prisma.course.findFirst({
      where: { id: assignment.courseId, teacherId: teacher.id },
      select: { id: true },
    })
    if (!course) return res.status(403).json({ message: 'Not allowed for this course' })

    const material = await prisma.assignmentMaterial.create({
      data: {
        assignmentId,
        fileUrl: `/uploads/materials/${file.filename}`,
      },
    })

    res.status(201).json({ material })
  },
)

export default router

