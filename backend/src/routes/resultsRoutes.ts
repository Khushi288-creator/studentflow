import express from 'express'
import { authenticateJWT, requireRole } from '../middleware/auth'
import { z } from 'zod'
import ResultModel from '../models/Result'
import StudentEnrollmentModel from '../models/StudentEnrollment'
import CourseModel from '../models/Course'
import TeacherModel from '../models/Teacher'
import UserModel from '../models/User'
import NoticeModel from '../models/Notice'

const router = express.Router()

function gradeFromMarks(marks: number): string {
  if (marks >= 90) return 'A+'
  if (marks >= 80) return 'A'
  if (marks >= 70) return 'B'
  if (marks >= 60) return 'C'
  if (marks >= 50) return 'D'
  return 'F'
}

// ── Admin: list all results ───────────────────────────────────────────────
router.get('/admin/results', authenticateJWT, requireRole(['admin', 'exam_department']), async (_req, res) => {
  try {
    const results = await ResultModel.find({}).sort({ createdAt: -1 }).lean()
    const enrollmentIds = [...new Set(results.map((r: any) => r.studentId).filter(Boolean))]
    const courseIds     = [...new Set(results.map((r: any) => r.courseId).filter(Boolean))]

    const [enrollments, courses] = await Promise.all([
      enrollmentIds.length ? StudentEnrollmentModel.find({ _id: { $in: enrollmentIds } }).lean() : [],
      courseIds.length     ? CourseModel.find({ _id: { $in: courseIds } }).lean() : [],
    ])

    const userIds = (enrollments as any[]).map(e => e.userId).filter(Boolean)
    const users = userIds.length ? await UserModel.find({ _id: { $in: userIds } }).lean() : []

    const enrollMap  = new Map((enrollments as any[]).map(e => [e._id?.toString(), e]))
    const courseMap  = new Map((courses as any[]).map(c => [c._id?.toString(), c]))
    const userMap    = new Map((users as any[]).map(u => [u._id?.toString(), u]))

    res.json({
      results: results.map((r: any) => {
        const enrollment = enrollMap.get(r.studentId?.toString()) as any
        const user       = enrollment ? userMap.get(enrollment.userId?.toString()) as any : null
        const course     = courseMap.get(r.courseId?.toString()) as any
        return {
          id: r._id?.toString(),
          marks: r.marks,
          grade: r.grade,
          courseName: course?.name ?? '—',
          studentName: user?.name ?? '—',
          studentUserId: enrollment?.userId ?? '',
        }
      }),
    })
  } catch (err: any) {
    console.error('[GET /admin/results]', err?.message)
    res.status(500).json({ message: err?.message })
  }
})

// ── Admin: create/update result ───────────────────────────────────────────
// Admin can VIEW + analytics only — actual creation is exam_department's job
// But we keep this for backward compatibility (admin can still add legacy results)
router.post('/admin/results', authenticateJWT, requireRole(['admin', 'exam_department']), async (req, res) => {
  try {
    const schema = z.object({
      studentUserId: z.string().min(1),
      courseId:      z.string().min(1),
      marks:         z.number().int().min(0).max(100),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const { studentUserId, courseId, marks } = parsed.data
    const grade = gradeFromMarks(marks)

    // Ensure enrollment exists
    let enrollment = await StudentEnrollmentModel.findOne({ userId: studentUserId, courseId }).lean() as any
    if (!enrollment) {
      const created = await StudentEnrollmentModel.create({ userId: studentUserId, courseId, phone: 'NA' })
      enrollment = created.toObject()
    }
    const enrollmentId = enrollment._id?.toString()

    const result = await ResultModel.findOneAndUpdate(
      { studentId: enrollmentId, courseId },
      { $set: { marks, grade } },
      { new: true, upsert: true }
    ).lean() as any

    // Notify student
    const course = await CourseModel.findById(courseId).lean() as any
    await NoticeModel.create({
      title: '📊 Result Updated',
      description: `Your result for ${course?.name ?? 'a subject'} has been updated. Marks: ${marks}, Grade: ${grade}.`,
      type: 'result',
      userId: studentUserId,
    })

    res.status(201).json({ result: { id: result._id?.toString(), marks: result.marks, grade: result.grade } })
  } catch (err: any) {
    console.error('[POST /admin/results]', err?.message)
    res.status(500).json({ message: err?.message })
  }
})

// ── GET /results — role-based ─────────────────────────────────────────────
router.get('/results', authenticateJWT, async (req, res) => {
  try {
    const { role, userId } = req.auth!

    if (role === 'student') {
      const enrollments = await StudentEnrollmentModel.find({ userId }).lean()
      const enrollmentIds = (enrollments as any[]).map(e => e._id.toString())
      const courseIds     = (enrollments as any[]).map(e => e.courseId)

      const results = await ResultModel.find({ studentId: { $in: enrollmentIds } })
        .sort({ createdAt: -1 }).lean()

      const courses = await CourseModel.find({ _id: { $in: courseIds } }).lean()
      const courseMap = new Map((courses as any[]).map(c => [c._id.toString(), c.name]))

      return res.json({
        results: results.map((r: any) => ({
          id: r._id.toString(),
          courseId: r.courseId,
          courseName: courseMap.get(r.courseId) ?? '—',
          marks: r.marks,
          grade: r.grade,
        })),
      })
    }

    if (role === 'teacher') {
      const teacher = await TeacherModel.findOne({ userId }).lean() as any
      if (!teacher) return res.json({ results: [] })

      const courses = await CourseModel.find({ teacherId: teacher._id.toString() }).lean()
      const courseIds = (courses as any[]).map(c => c._id.toString())
      const courseMap = new Map((courses as any[]).map(c => [c._id.toString(), c.name]))

      const enrollments = await StudentEnrollmentModel.find({ courseId: { $in: courseIds } }).lean()
      const enrollmentIds = (enrollments as any[]).map(e => e._id.toString())

      const results = await ResultModel.find({ studentId: { $in: enrollmentIds } })
        .sort({ createdAt: -1 }).lean()

      return res.json({
        results: results.map((r: any) => ({
          id: r._id.toString(),
          courseId: r.courseId,
          courseName: courseMap.get(r.courseId) ?? '—',
          marks: r.marks,
          grade: r.grade,
        })),
      })
    }

    // admin / exam_department
    const results = await ResultModel.find({}).sort({ createdAt: -1 }).lean()
    const courseIds = [...new Set((results as any[]).map(r => r.courseId))]
    const courses = await CourseModel.find({ _id: { $in: courseIds } }).lean()
    const courseMap = new Map((courses as any[]).map(c => [c._id.toString(), c.name]))

    return res.json({
      results: results.map((r: any) => ({
        id: r._id.toString(),
        courseId: r.courseId,
        courseName: courseMap.get(r.courseId) ?? '—',
        marks: r.marks,
        grade: r.grade,
      })),
    })
  } catch (err: any) {
    console.error('[GET /results]', err?.message)
    res.status(500).json({ message: err?.message })
  }
})

export default router
