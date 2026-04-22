import express from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import mongoose from 'mongoose'
import { authenticateJWT, requireRole } from '../middleware/auth'
import AttendanceModel from '../models/Attendance'
import AttendanceQrTokenModel from '../models/AttendanceQrToken'
import StudentEnrollmentModel from '../models/StudentEnrollment'
import CourseModel from '../models/Course'
import TeacherModel from '../models/Teacher'
import UserModel from '../models/User'
import StudentProfileModel from '../models/StudentProfile'

const router = express.Router()

// Return date as YYYY-MM-DD in IST (UTC+5:30)
function toLocalDate(d: Date | string): string {
  if (!d) return ''
  const date = d instanceof Date ? d : new Date(d)
  if (isNaN(date.getTime())) return String(d).slice(0, 10)
  const offset = 5.5 * 60 * 60 * 1000
  return new Date(date.getTime() + offset).toISOString().slice(0, 10)
}

// Normalize date to midnight UTC for consistent storage
function toMidnight(dateStr: string): Date {
  const d = new Date(dateStr)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

// ── GET attendance (role-based) ───────────────────────────────────────────
router.get('/attendance', authenticateJWT, async (req, res) => {
  try {
    const { role, userId } = req.auth!

    if (role === 'student') {
      // Get student's enrollments
      const enrollments = await StudentEnrollmentModel.find({ userId }).lean()
      const enrollmentIds = enrollments.map((e: any) => e._id.toString())
      const courseIds = enrollments.map((e: any) => e.courseId)

      const attendance = await AttendanceModel.find({
        studentId: { $in: enrollmentIds },
      }).sort({ date: -1 }).lean()

      // Fetch courses for names
      const courses = await CourseModel.find({ _id: { $in: courseIds } }).lean()
      const courseMap = new Map(courses.map((c: any) => [c._id.toString(), c.name]))

      // Fetch student profile for className
      const profile = await StudentProfileModel.findOne({ userId }).lean() as any

      return res.json({
        attendance: attendance.map((a: any) => ({
          id: a._id.toString(),
          courseId: a.courseId,
          courseName: courseMap.get(a.courseId) ?? '—',
          date: toLocalDate(a.date),
          status: a.status,
          className: profile?.className ?? null,
        })),
      })
    }

    if (role === 'teacher') {
      const teacher = await TeacherModel.findOne({ userId }).lean() as any
      if (!teacher) return res.json({ attendance: [] })

      const courses = await CourseModel.find({ teacherId: teacher._id.toString() }).lean()
      const courseIds = courses.map((c: any) => c._id.toString())
      const courseMap = new Map(courses.map((c: any) => [c._id.toString(), c.name]))

      // Get all enrollments for these courses
      const enrollments = await StudentEnrollmentModel.find({
        courseId: { $in: courseIds },
      }).lean()
      const enrollmentIds = enrollments.map((e: any) => e._id.toString())

      // Build enrollment → userId map
      const enrollmentUserMap = new Map(
        enrollments.map((e: any) => [e._id.toString(), e.userId])
      )
      const enrollmentCourseMap = new Map(
        enrollments.map((e: any) => [e._id.toString(), e.courseId])
      )

      const attendance = await AttendanceModel.find({
        studentId: { $in: enrollmentIds },
      }).sort({ date: -1 }).lean()

      // Fetch all student users and profiles
      const userIds = [...new Set(enrollments.map((e: any) => e.userId))]
      const [users, profiles] = await Promise.all([
        UserModel.find({ _id: { $in: userIds } }).lean(),
        StudentProfileModel.find({ userId: { $in: userIds } }).lean(),
      ])
      const userMap = new Map(users.map((u: any) => [u._id.toString(), u]))
      const profileMap = new Map(profiles.map((p: any) => [p.userId, p]))

      return res.json({
        attendance: attendance.map((a: any) => {
          const studentUserId = enrollmentUserMap.get(a.studentId)
          const user = studentUserId ? userMap.get(studentUserId) as any : null
          const profile = studentUserId ? profileMap.get(studentUserId) as any : null
          const courseId = enrollmentCourseMap.get(a.studentId) ?? a.courseId
          return {
            id: a._id.toString(),
            courseId,
            courseName: courseMap.get(courseId) ?? '—',
            studentName: user?.name ?? '—',
            date: toLocalDate(a.date),
            status: a.status,
            className: profile?.className ?? null,
          }
        }),
      })
    }

    // Admin: all attendance
    const attendance = await AttendanceModel.find({}).sort({ date: -1 }).lean()
    const allCourseIds = [...new Set(attendance.map((a: any) => a.courseId))]
    const courses = await CourseModel.find({ _id: { $in: allCourseIds } }).lean()
    const courseMap = new Map(courses.map((c: any) => [c._id.toString(), c.name]))

    return res.json({
      attendance: attendance.map((a: any) => ({
        id: a._id.toString(),
        courseId: a.courseId,
        courseName: courseMap.get(a.courseId) ?? '—',
        date: toLocalDate(a.date),
        status: a.status,
      })),
    })
  } catch (err: any) {
    console.error('[GET /attendance]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to fetch attendance' })
  }
})

// ── Teacher: manual attendance marking ───────────────────────────────────
router.post('/attendance/manual', authenticateJWT, requireRole(['teacher']), async (req, res) => {
  try {
    const schema = z.object({
      courseId: z.string().min(1, 'courseId required'),
      date: z.string().min(1, 'date required'),
      students: z.array(z.object({
        studentName: z.string().min(1),
        status: z.enum(['present', 'absent', 'late']),
      })).min(1, 'At least one student required'),
    })

    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })
    const { courseId, date, students } = parsed.data

    // Verify teacher owns this course
    const teacher = await TeacherModel.findOne({ userId: req.auth!.userId }).lean() as any
    if (!teacher) return res.status(403).json({ message: 'Teacher profile missing' })

    const course = await CourseModel.findOne({
      _id: courseId,
      teacherId: teacher._id.toString(),
    }).lean()
    if (!course) return res.status(403).json({ message: 'Not your course' })

    const attendanceDate = toMidnight(date)

    // Fetch all students once
    const allStudents = await UserModel.find({ role: 'student' }).lean()

    const results = []
    for (const s of students) {
      const searchName = s.studentName.toLowerCase().trim()

      // Find student by name (exact or partial match)
      const user = (allStudents as any[]).find(u =>
        u.name.toLowerCase() === searchName ||
        u.name.toLowerCase().includes(searchName) ||
        searchName.includes(u.name.toLowerCase().split(' ')[0])
      )

      if (!user) {
        results.push({ studentName: s.studentName, status: s.status, saved: false, reason: 'Student not found' })
        continue
      }

      const studentUserId = user._id.toString()

      // Find or create enrollment
      let enrollment = await StudentEnrollmentModel.findOne({
        userId: studentUserId,
        courseId,
      }).lean() as any

      if (!enrollment) {
        const created = await StudentEnrollmentModel.create({
          userId: studentUserId,
          courseId,
          phone: 'NA',
        })
        enrollment = created.toObject()
      }

      const enrollmentId = enrollment._id.toString()

      // Upsert attendance — update if exists, create if not
      await AttendanceModel.findOneAndUpdate(
        { studentId: enrollmentId, courseId, date: attendanceDate },
        { $set: { status: s.status } },
        { upsert: true, new: true }
      )

      results.push({ studentName: s.studentName, status: s.status, saved: true })
    }

    const savedCount = results.filter(r => r.saved).length
    res.json({
      ok: true,
      saved: savedCount,
      total: students.length,
      message: `Attendance saved for ${savedCount}/${students.length} students`,
      results,
    })
  } catch (err: any) {
    console.error('[POST /attendance/manual]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to save attendance' })
  }
})

// ── QR: generate token ────────────────────────────────────────────────────
router.post('/attendance/qr/generate', authenticateJWT, requireRole(['teacher']), async (req, res) => {
  try {
    const parsed = z.object({ courseId: z.string().min(1) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })
    const { courseId } = parsed.data

    const teacher = await TeacherModel.findOne({ userId: req.auth!.userId }).lean() as any
    if (!teacher) return res.status(403).json({ message: 'Teacher profile missing' })

    const course = await CourseModel.findOne({
      _id: courseId,
      teacherId: teacher._id.toString(),
    }).lean()
    if (!course) return res.status(403).json({ message: 'Not allowed for this course' })

    const token = crypto.randomBytes(16).toString('hex')
    const attendanceDate = toMidnight(new Date().toISOString().slice(0, 10))
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    const qr = await AttendanceQrTokenModel.create({
      courseId,
      token,
      attendanceDate,
      expiresAt,
    })

    res.status(201).json({
      token: qr.token,
      attendanceDate: toLocalDate(qr.attendanceDate),
    })
  } catch (err: any) {
    console.error('[POST /attendance/qr/generate]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to generate QR' })
  }
})

// ── QR: student check-in ──────────────────────────────────────────────────
router.post('/attendance/qr/check-in', authenticateJWT, requireRole(['student']), async (req, res) => {
  try {
    const parsed = z.object({ token: z.string().min(1) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })
    const { token } = parsed.data

    const qr = await AttendanceQrTokenModel.findOne({ token }).lean() as any
    if (!qr) return res.status(400).json({ message: 'Invalid token' })
    if (qr.expiresAt < new Date()) return res.status(400).json({ message: 'Token expired' })

    const userId = req.auth!.userId

    // Find or create enrollment
    let enrollment = await StudentEnrollmentModel.findOne({
      userId,
      courseId: qr.courseId,
    }).lean() as any

    if (!enrollment) {
      const created = await StudentEnrollmentModel.create({
        userId,
        courseId: qr.courseId,
        phone: 'NA',
      })
      enrollment = created.toObject()
    }

    const enrollmentId = enrollment._id.toString()

    await AttendanceModel.findOneAndUpdate(
      { studentId: enrollmentId, courseId: qr.courseId, date: qr.attendanceDate },
      { $set: { status: 'present' } },
      { upsert: true, new: true }
    )

    res.json({ ok: true, message: 'Attendance marked as present' })
  } catch (err: any) {
    console.error('[POST /attendance/qr/check-in]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to check in' })
  }
})

export default router
