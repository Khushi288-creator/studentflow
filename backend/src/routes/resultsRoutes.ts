import express from 'express'
import { prisma } from '../lib/prisma'
import { authenticateJWT, requireRole } from '../middleware/auth'
import { z } from 'zod'

const router = express.Router()

function gradeFromMarks(marks: number) {
  if (marks >= 90) return 'A+'
  if (marks >= 80) return 'A'
  if (marks >= 70) return 'B'
  if (marks >= 60) return 'C'
  if (marks >= 50) return 'D'
  return 'F'
}

// ── Admin: list all results with student + course info ────────────────────
router.get('/admin/results', authenticateJWT, requireRole(['admin']), async (_req, res) => {
  const results = await prisma.result.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      course: { select: { name: true } },
      student: { include: { user: { select: { name: true } } } },
    },
  })
  res.json({
    results: results.map((r) => ({
      id: r.id,
      marks: r.marks,
      grade: r.grade,
      courseName: r.course.name,
      studentName: r.student.user.name,
      studentUserId: r.student.userId,
    })),
  })
})

// ── Admin: create / update result for a student ───────────────────────────
const adminResultSchema = z.object({
  studentUserId: z.string().min(1),
  courseId: z.string().min(1),
  marks: z.number().int().min(0).max(100),
})

router.post('/admin/results', authenticateJWT, requireRole(['admin']), async (req, res) => {
  const parsed = adminResultSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

  const { studentUserId, courseId, marks } = parsed.data
  const grade = gradeFromMarks(marks)

  // Ensure enrollment exists
  let enrollment = await prisma.studentEnrollment.findUnique({
    where: { userId_courseId: { userId: studentUserId, courseId } },
  })
  if (!enrollment) {
    enrollment = await prisma.studentEnrollment.create({
      data: { userId: studentUserId, courseId, phone: 'NA' },
    })
  }

  const result = await prisma.result.upsert({
    where: { studentId_courseId: { studentId: enrollment.id, courseId } },
    update: { marks, grade },
    create: { studentId: enrollment.id, courseId, marks, grade },
  })

  // Notify student
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { name: true } })
  await prisma.notice.create({
    data: {
      title: 'Result Declared',
      description: `Your result for ${course?.name ?? 'a subject'} has been updated. Marks: ${marks}, Grade: ${grade}.`,
      type: 'result',
      userId: studentUserId,
    },
  })

  res.status(201).json({ result: { id: result.id, marks: result.marks, grade: result.grade } })
})

router.get('/results', authenticateJWT, async (req, res) => {
  const role = req.auth!.role

  if (role === 'student') {
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { userId: req.auth!.userId },
      select: { id: true, courseId: true },
    })
    const studentIds = enrollments.map((e) => e.id)

    // Get ALL submissions with marks — one row per assignment (not per course)
    const submissions = await prisma.submission.findMany({
      where: { studentId: { in: studentIds }, marks: { not: null } },
      orderBy: { createdAt: 'desc' },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            courseId: true,
            course: { select: { name: true } },
          },
        },
      },
    })

    if (submissions.length) {
      return res.json({
        results: submissions.map((s) => ({
          id: s.id,
          courseId: s.assignment.courseId,
          courseName: s.assignment.course.name,
          assignmentTitle: s.assignment.title,
          marks: s.marks,
          grade: gradeFromMarks(s.marks!),
        })),
      })
    }

    return res.json({ results: [] })
  }

  // Teacher/admin: view results for courses they manage.
  if (role === 'teacher') {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.auth!.userId },
      select: { id: true },
    })
    if (!teacher) return res.json({ results: [] })
    const courses = await prisma.course.findMany({ where: { teacherId: teacher.id }, select: { id: true } })
    const courseIds = courses.map((c) => c.id)

    const results = await prisma.result.findMany({
      where: { courseId: { in: courseIds } },
      orderBy: { createdAt: 'desc' },
      include: { course: { select: { id: true, name: true } } },
    })

    return res.json({
      results: results.map((r) => ({
        id: r.id,
        courseId: r.courseId,
        courseName: r.course.name,
        marks: r.marks,
        grade: r.grade,
      })),
    })
  }

  const results = await prisma.result.findMany({
    orderBy: { createdAt: 'desc' },
    include: { course: { select: { id: true, name: true } } },
  })
  return res.json({
    results: results.map((r) => ({
      id: r.id,
      courseId: r.courseId,
      courseName: r.course.name,
      marks: r.marks,
      grade: r.grade,
    })),
  })
})

export default router

