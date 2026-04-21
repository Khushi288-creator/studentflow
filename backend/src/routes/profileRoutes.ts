import express from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticateJWT } from '../middleware/auth'
import { photoUpload } from '../utils/upload'

const router = express.Router()

// NOTE: GET /me is handled by authRoutes.ts — no duplicate here.

// ── List all students (teacher + admin — for dropdowns) ───────────────────
router.get('/students', authenticateJWT, async (req, res) => {
  try {
    const role = req.auth!.role
    if (role !== 'teacher' && role !== 'admin') return res.status(403).json({ message: 'Forbidden' })
    const users = await prisma.user.findMany({
      where: { role: 'student' },
      select: { id: true, name: true, studentProfile: { select: { className: true } } },
      orderBy: { name: 'asc' },
    })
    res.json({
      students: users.map(u => ({
        id: u.id,
        name: u.name,
        className: u.studentProfile?.className ?? null,
      })),
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message ?? 'Failed' })
  }
})

// Student bio — used by StudentBioCard on dashboard
router.get('/students/me', authenticateJWT, async (req, res) => {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: req.auth!.userId },
  })
  res.json({
    student: profile
      ? {
          gender: profile.gender,
          fatherName: profile.fatherName,
          motherName: profile.motherName,
          dob: profile.dob,
          religion: profile.religion,
          fatherOccupation: profile.fatherOccupation,
          address: profile.address,
          className: profile.className,
          phone: profile.phone,
          photoUrl: profile.photoUrl,
        }
      : null,
  })
})

// Teacher bio — used by TeacherDashboard bio card
router.get('/teachers/me', authenticateJWT, async (req, res) => {
  const teacher = await prisma.teacher.findUnique({
    where: { userId: req.auth!.userId },
    select: { subject: true, phone: true, address: true, bloodType: true, birthday: true, sex: true, photoUrl: true },
  })
  res.json({ teacher: teacher ?? null })
})

// ── Admin: upload photo for student ──────────────────────────────────────
router.post('/admin/students/:userId/photo', authenticateJWT, photoUpload.single('photo'), async (req, res) => {
  const userId = req.params.userId as string
  const file = req.file
  if (!file) return res.status(400).json({ message: 'No file uploaded' })
  const photoUrl = `/uploads/photos/${file.filename}`
  await prisma.studentProfile.upsert({
    where: { userId },
    update: { photoUrl },
    create: { userId, photoUrl },
  })
  res.json({ photoUrl })
})

// ── Admin: upload photo for teacher ──────────────────────────────────────
router.post('/admin/teachers/:userId/photo', authenticateJWT, photoUpload.single('photo'), async (req, res) => {
  const userId = req.params.userId as string
  const file = req.file
  if (!file) return res.status(400).json({ message: 'No file uploaded' })
  const photoUrl = `/uploads/photos/${file.filename}`
  const teacher = await prisma.teacher.findUnique({ where: { userId }, select: { id: true } })
  if (!teacher) return res.status(404).json({ message: 'Teacher not found' })
  await prisma.teacher.update({ where: { userId }, data: { photoUrl } })
  res.json({ photoUrl })
})

// Teacher recent activity
router.get('/teachers/me/activity', authenticateJWT, async (req, res) => {
  const teacher = await prisma.teacher.findUnique({
    where: { userId: req.auth!.userId },
    select: { id: true },
  })
  if (!teacher) return res.json({ lastAttendance: null, lastAssignment: null })

  const courses = await prisma.course.findMany({
    where: { teacherId: teacher.id },
    select: { id: true },
  })
  const courseIds = courses.map(c => c.id)

  const lastAttendance = await prisma.attendance.findFirst({
    where: { courseId: { in: courseIds } },
    orderBy: { createdAt: 'desc' },
    include: { course: { select: { name: true } } },
  })

  const lastAssignment = await prisma.assignment.findFirst({
    where: { courseId: { in: courseIds } },
    orderBy: { createdAt: 'desc' },
    include: { course: { select: { name: true } } },
  })

  res.json({
    lastAttendance: lastAttendance ? {
      date: lastAttendance.date.toISOString().slice(0, 10),
      subject: lastAttendance.course.name,
    } : null,
    lastAssignment: lastAssignment ? {
      title: lastAssignment.title,
      subject: lastAssignment.course.name,
      date: lastAssignment.createdAt.toISOString().slice(0, 10),
    } : null,
  })
})

router.get('/resume', authenticateJWT, async (req, res) => {
  const resume = await prisma.resume.findUnique({
    where: { userId: req.auth!.userId },
  })
  res.json({ resume: resume ?? { headline: '', summary: '', skills: '' } })
})

const resumeSchema = z.object({
  headline: z.string().default(''),
  summary: z.string().default(''),
  skills: z.string().default(''),
})

router.put('/resume', authenticateJWT, async (req, res) => {
  const parsed = resumeSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

  const { headline, summary, skills } = parsed.data

  const resume = await prisma.resume.upsert({
    where: { userId: req.auth!.userId },
    update: { headline, summary, skills },
    create: { userId: req.auth!.userId, headline, summary, skills },
  })

  res.json({ resume })
})

router.get('/study-planner', authenticateJWT, async (req, res) => {
  const tasks = await prisma.studyTask.findMany({
    where: { userId: req.auth!.userId },
    orderBy: { dueDate: 'asc' },
  })
  res.json({ tasks: tasks.map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate.toISOString().slice(0, 10) })) })
})

const plannerSchema = z.object({
  title: z.string().min(2),
  dueDate: z.string().min(1),
})

router.post('/study-planner', authenticateJWT, async (req, res) => {
  const parsed = plannerSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

  const { title, dueDate } = parsed.data
  const task = await prisma.studyTask.create({
    data: { userId: req.auth!.userId, title, dueDate: new Date(dueDate) },
  })
  res.json({ task })
})

// ── GET subjects list (for doubt subject dropdown) ────────────────────────
router.get('/subjects', authenticateJWT, async (_req, res) => {
  const teachers = await prisma.teacher.findMany({
    select: { subject: true },
  })
  // Also get course names
  const courses = await prisma.course.findMany({
    select: { name: true },
    distinct: ['name'],
  })
  const fromTeachers = teachers.map(t => t.subject).filter(Boolean)
  const fromCourses = courses.map(c => c.name).filter(Boolean)
  const all = [...new Set([...fromTeachers, ...fromCourses])].sort()
  res.json({ subjects: all })
})

router.get('/doubts', authenticateJWT, async (req, res) => {
  const role = req.auth!.role

  if (role === 'student') {
    const doubts = await prisma.doubt.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { createdAt: 'desc' },
    })
    return res.json({
      doubts: doubts.map((d) => ({
        id: d.id,
        subject: d.subject ?? '',
        question: d.question,
        status: d.status,
        teacherReply: d.teacherReply,
        createdAt: d.createdAt.toISOString().slice(0, 10),
      })),
    })
  }

  // teacher: only see doubts matching their subject(s)
  if (role === 'teacher') {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.auth!.userId },
      select: { subject: true },
    })
    // Also get course names for this teacher
    const courses = await prisma.course.findMany({
      where: { teacher: { userId: req.auth!.userId } },
      select: { name: true },
    })
    const teacherSubjects = [
      teacher?.subject,
      ...courses.map(c => c.name),
    ].filter(Boolean).map(s => s!.toLowerCase())

    const allDoubts = await prisma.doubt.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: {
          select: {
            name: true,
            studentProfile: { select: { className: true } },
          },
        },
      },
    })

    // Filter to matching subjects (case-insensitive)
    const filtered = allDoubts.filter(d =>
      !d.subject || teacherSubjects.includes(d.subject.toLowerCase())
    )

    return res.json({
      doubts: filtered.map((d) => ({
        id: d.id,
        subject: d.subject ?? '',
        question: d.question,
        status: d.status,
        teacherReply: d.teacherReply,
        createdAt: d.createdAt.toISOString().slice(0, 10),
        studentName: (d as any).user?.name ?? '—',
        className: (d as any).user?.studentProfile?.className ?? null,
      })),
    })
  }

  // admin: all doubts
  const doubts = await prisma.doubt.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: {
        select: {
          name: true,
          studentProfile: { select: { className: true } },
        },
      },
    },
  })
  res.json({
    doubts: doubts.map((d) => ({
      id: d.id,
      subject: d.subject ?? '',
      question: d.question,
      status: d.status,
      teacherReply: d.teacherReply,
      createdAt: d.createdAt.toISOString().slice(0, 10),
      studentName: (d as any).user?.name ?? '—',
      className: (d as any).user?.studentProfile?.className ?? null,
    })),
  })
})

router.post('/doubts', authenticateJWT, async (req, res) => {
  try {
    if (req.auth!.role !== 'student') return res.status(403).json({ message: 'Only students can post doubts' })

    const schema = z.object({
      subject: z.string().min(1, 'Subject is required'),
      question: z.string().min(5, 'Question must be at least 5 characters'),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const { subject, question } = parsed.data

    const doubt = await prisma.doubt.create({
      data: { userId: req.auth!.userId, subject, question, studentId: null, status: 'open' },
    })

    const student = await prisma.user.findUnique({ where: { id: req.auth!.userId }, select: { name: true } })

    const allTeachers = await prisma.teacher.findMany({ select: { userId: true, subject: true } })
    const allCourses = await prisma.course.findMany({ include: { teacher: { select: { userId: true } } } })

    const subjectLower = subject.toLowerCase()
    const notifyIds = new Set<string>()

    for (const t of allTeachers) {
      if (t.subject && t.subject.toLowerCase() === subjectLower) notifyIds.add(t.userId)
    }
    for (const c of allCourses) {
      if (c.name.toLowerCase() === subjectLower) notifyIds.add(c.teacher.userId)
    }
    if (notifyIds.size === 0) allTeachers.forEach(t => notifyIds.add(t.userId))

    for (const userId of notifyIds) {
      await prisma.notice.create({
        data: {
          title: `New Doubt: ${subject}`,
          description: `${student?.name ?? 'A student'} asked: "${question}"`,
          type: 'notice',
          userId,
        },
      })
    }

    res.json({ doubt })
  } catch (err: any) {
    console.error('[POST /doubts]', err?.message, err?.stack)
    res.status(500).json({ message: err?.message ?? 'Failed to submit doubt' })
  }
})

router.post('/doubts/:doubtId/reply', authenticateJWT, async (req, res) => {
  try {
    const role = req.auth!.role
    if (role !== 'teacher' && role !== 'admin') return res.status(403).json({ message: 'Forbidden' })

    const schema = z.object({ reply: z.string().min(2) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const doubtId = Array.isArray(req.params.doubtId) ? req.params.doubtId[0] : req.params.doubtId
    const doubt = await prisma.doubt.findUnique({ where: { id: doubtId } })
    if (!doubt) return res.status(404).json({ message: 'Doubt not found' })

    const updated = await prisma.doubt.update({
      where: { id: doubtId },
      data: { teacherReply: parsed.data.reply, status: 'answered' },
    })

    await prisma.notice.create({
      data: {
        title: `Doubt Answered: ${doubt.subject ?? 'Your doubt'}`,
        description: `Your doubt has been answered: "${parsed.data.reply.slice(0, 100)}"`,
        type: 'notice',
        userId: doubt.userId,
      },
    })

    res.json({ doubt: updated })
  } catch (err: any) {
    console.error('[POST /doubts/:id/reply]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to reply' })
  }
})

export default router

