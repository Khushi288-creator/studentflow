import express from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticateJWT, requireRole } from '../middleware/auth'

const router = express.Router()

// Return date as YYYY-MM-DD in IST (UTC+5:30) to avoid off-by-one day issues
function toLocalDate(d: Date): string {
  const offset = 5.5 * 60 * 60 * 1000 // IST offset in ms
  return new Date(d.getTime() + offset).toISOString().slice(0, 10)
}

router.get('/attendance', authenticateJWT, async (req, res) => {
  const role = req.auth!.role

  if (role === 'student') {
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { userId: req.auth!.userId },
      select: { id: true },
    })
    const studentIds = enrollments.map((e) => e.id)
    const attendance = await prisma.attendance.findMany({
      where: { studentId: { in: studentIds } },
      orderBy: { date: 'desc' },
      include: {
        course: { select: { id: true, name: true } },
        student: { include: { user: { select: { studentProfile: { select: { className: true } } } } } },
      },
    })
    return res.json({
      attendance: attendance.map((a) => ({
        id: a.id,
        courseId: a.courseId,
        courseName: a.course.name,
        date: toLocalDate(a.date),
        status: a.status,
        className: a.student.user.studentProfile?.className ?? null,
      })),
    })
  }

  if (role === 'teacher') {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.auth!.userId },
      select: { id: true },
    })
    if (!teacher) return res.json({ attendance: [] })
    const courses = await prisma.course.findMany({
      where: { teacherId: teacher.id },
      select: { id: true },
    })
    const courseIds = courses.map((c) => c.id)
    const attendance = await prisma.attendance.findMany({
      where: { courseId: { in: courseIds } },
      orderBy: { date: 'desc' },
      include: {
        course: { select: { id: true, name: true } },
        student: { include: { user: { select: { name: true, studentProfile: { select: { className: true } } } } } },
      },
    })
    return res.json({
      attendance: attendance.map((a) => ({
        id: a.id,
        courseId: a.courseId,
        courseName: a.course.name,
        studentName: a.student.user.name,
        date: toLocalDate(a.date),
        status: a.status,
        className: a.student.user.studentProfile?.className ?? null,
      })),
    })
  }

  // Admin: all attendance.
  const attendance = await prisma.attendance.findMany({
    orderBy: { date: 'desc' },
    include: { course: { select: { id: true, name: true } } },
  })

  return res.json({
    attendance: attendance.map((a) => ({
      id: a.id,
      courseId: a.courseId,
      courseName: a.course.name,
      date: toLocalDate(a.date),
      status: a.status,
    })),
  })
})

// Teacher manually marks attendance by student name
router.post('/attendance/manual', authenticateJWT, requireRole(['teacher']), async (req, res) => {
  const schema = z.object({
    courseId: z.string().min(1),
    date: z.string().min(1),
    students: z.array(z.object({
      studentName: z.string().min(1),
      status: z.enum(['present', 'absent', 'late']),
    })).min(1),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })
  const { courseId, date, students } = parsed.data

  // Verify teacher owns this course
  const teacher = await prisma.teacher.findUnique({ where: { userId: req.auth!.userId }, select: { id: true } })
  if (!teacher) return res.status(403).json({ message: 'Teacher profile missing' })
  const course = await prisma.course.findFirst({ where: { id: courseId, teacherId: teacher.id }, select: { id: true } })
  if (!course) return res.status(403).json({ message: 'Not your course' })

  const attendanceDate = new Date(date)
  attendanceDate.setHours(0, 0, 0, 0)

  const results = []
  for (const s of students) {
    // Find user by name — partial match (case-insensitive, contains)
    const allStudents = await prisma.user.findMany({
      where: { role: 'student' },
      select: { id: true, name: true },
    })
    const searchName = s.studentName.toLowerCase().trim()
    const user = allStudents.find((u) =>
      u.name.toLowerCase() === searchName ||
      u.name.toLowerCase().includes(searchName) ||
      searchName.includes(u.name.toLowerCase().split(' ')[0])
    )
    if (!user) {
      results.push({ studentName: s.studentName, status: s.status, saved: false, reason: 'Student not found' })
      continue
    }

    // Find or create enrollment
    let enrollment = await prisma.studentEnrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    })
    if (!enrollment) {
      enrollment = await prisma.studentEnrollment.create({
        data: { userId: user.id, courseId, phone: 'NA' },
      })
    }

    // Upsert attendance with actual status
    await prisma.attendance.upsert({
      where: { studentId_courseId_date: { studentId: enrollment.id, courseId, date: attendanceDate } },
      update: { status: s.status as any },
      create: { studentId: enrollment.id, courseId, date: attendanceDate, status: s.status as any },
    })
    results.push({ studentName: s.studentName, status: s.status, saved: true })
  }

  res.json({ saved: results.filter(r => (r as any).saved !== false).length, results })
})

router.post('/attendance/qr/generate', authenticateJWT, requireRole(['teacher']), async (req, res) => {
  const parsed = z.object({ courseId: z.string().min(1) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })
  const { courseId } = parsed.data

  const teacher = await prisma.teacher.findUnique({
    where: { userId: req.auth!.userId },
    select: { id: true },
  })
  if (!teacher) return res.status(403).json({ message: 'Teacher profile missing' })

  const course = await prisma.course.findFirst({ where: { id: courseId, teacherId: teacher.id }, select: { id: true } })
  if (!course) return res.status(403).json({ message: 'Not allowed for this course' })

  const token = crypto.randomBytes(16).toString('hex')
  const attendanceDate = new Date()
  attendanceDate.setHours(0, 0, 0, 0)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  const qr = await prisma.attendanceQrToken.create({
    data: {
      courseId,
      token,
      attendanceDate,
      expiresAt,
    },
  })

  res.status(201).json({
    token: qr.token,
    attendanceDate: toLocalDate(qr.attendanceDate),
  })
})

router.post('/attendance/qr/check-in', authenticateJWT, requireRole(['student']), async (req, res) => {
  const parsed = z.object({ token: z.string().min(1) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })
  const { token } = parsed.data

  const qr = await prisma.attendanceQrToken.findUnique({ where: { token } })
  if (!qr) return res.status(400).json({ message: 'Invalid token' })
  if (qr.expiresAt < new Date()) return res.status(400).json({ message: 'Token expired' })

  let enrollment = await prisma.studentEnrollment.findUnique({
    where: { userId_courseId: { userId: req.auth!.userId, courseId: qr.courseId } },
  })
  if (!enrollment) {
    // Late enrollment for demo purposes.
    enrollment = await prisma.studentEnrollment.create({
      data: { userId: req.auth!.userId, courseId: qr.courseId, phone: 'NA' },
    })
  }

  await prisma.attendance.upsert({
    where: {
      studentId_courseId_date: {
        studentId: enrollment.id,
        courseId: qr.courseId,
        date: qr.attendanceDate,
      },
    },
    update: { status: 'present' },
    create: { studentId: enrollment.id, courseId: qr.courseId, date: qr.attendanceDate, status: 'present' },
  })

  res.json({ ok: true })
})

export default router

