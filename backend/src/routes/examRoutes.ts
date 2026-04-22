import express from 'express'
import { z } from 'zod'
import { authenticateJWT, requireRole } from '../middleware/auth'
import ExamModel from '../models/Exam'
import SubjectMarksModel from '../models/SubjectMarks'
import ExamResultModel from '../models/ExamResult'
import UserModel from '../models/User'
import CourseModel from '../models/Course'
import TeacherModel from '../models/Teacher'
import StudentProfileModel from '../models/StudentProfile'
import NoticeModel from '../models/Notice'

const router = express.Router()

// ── helpers ────────────────────────────────────────────────────────────────
function gradeFromPct(pct: number): string {
  if (pct >= 90) return 'A+'
  if (pct >= 80) return 'A'
  if (pct >= 70) return 'B+'
  if (pct >= 60) return 'B'
  if (pct >= 50) return 'C'
  if (pct >= 40) return 'D'
  return 'F'
}

async function notifyUser(userId: string, title: string, description: string) {
  await NoticeModel.create({ title, description, type: 'result', userId })
}

// ══════════════════════════════════════════════════════════════════════════
// EXAM MANAGEMENT — exam_department only
// ══════════════════════════════════════════════════════════════════════════

// POST /exam/create
router.post('/exam/create', authenticateJWT, requireRole(['exam_department']), async (req, res) => {
  try {
    const schema = z.object({
      name:      z.string().min(2, 'Exam name required'),
      className: z.string().min(1, 'Class required'),
      subjects:  z.array(z.string()).min(1, 'At least one subject required'),
      startDate: z.string().min(1),
      endDate:   z.string().min(1),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const exam = await ExamModel.create({
      ...parsed.data,
      status: 'upcoming',
      createdBy: req.auth!.userId,
    })

    res.status(201).json({ exam: { id: exam._id.toString(), name: exam.name, className: exam.className, status: exam.status } })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// GET /exam/list — exam_department + admin + teacher
router.get('/exam/list', authenticateJWT, requireRole(['exam_department', 'admin', 'teacher']), async (req, res) => {
  try {
    const exams = await ExamModel.find({}).sort({ createdAt: -1 }).lean()
    res.json({
      exams: exams.map((e: any) => ({
        id: e._id.toString(),
        name: e.name,
        className: e.className,
        subjects: e.subjects,
        startDate: e.startDate,
        endDate: e.endDate,
        status: e.status,
      })),
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// PUT /exam/:id/status — exam_department only
router.put('/exam/:id/status', authenticateJWT, requireRole(['exam_department']), async (req, res) => {
  try {
    const { status } = req.body
    if (!['upcoming', 'ongoing', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }
    const exam = await ExamModel.findByIdAndUpdate(req.params.id, { status }, { new: true }).lean() as any
    if (!exam) return res.status(404).json({ message: 'Exam not found' })
    res.json({ ok: true, status: exam.status })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ══════════════════════════════════════════════════════════════════════════
// MARKS ENTRY — teacher only (own subjects)
// ══════════════════════════════════════════════════════════════════════════

// POST /marks/add
router.post('/marks/add', authenticateJWT, requireRole(['teacher']), async (req, res) => {
  try {
    const schema = z.object({
      examId:        z.string().min(1),
      courseId:      z.string().min(1),
      studentUserId: z.string().min(1),
      marks:         z.number().int().min(0).max(100),
      maxMarks:      z.number().int().min(1).default(100),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const { examId, courseId, studentUserId, marks, maxMarks } = parsed.data

    // Verify teacher owns this course
    const teacher = await TeacherModel.findOne({ userId: req.auth!.userId }).lean() as any
    if (!teacher) return res.status(403).json({ message: 'Teacher profile not found' })

    const course = await CourseModel.findOne({ _id: courseId, teacherId: teacher._id.toString() }).lean()
    if (!course) return res.status(403).json({ message: 'You can only enter marks for your own subjects' })

    // Verify exam exists
    const exam = await ExamModel.findById(examId).lean() as any
    if (!exam) return res.status(404).json({ message: 'Exam not found' })

    // Verify student exists
    const student = await UserModel.findById(studentUserId).lean() as any
    if (!student || student.role !== 'student') return res.status(404).json({ message: 'Student not found' })

    // Upsert marks (pending status)
    const entry = await SubjectMarksModel.findOneAndUpdate(
      { examId, studentUserId, courseId },
      { $set: { marks, maxMarks, teacherId: req.auth!.userId, status: 'pending' } },
      { upsert: true, new: true }
    ).lean() as any

    res.status(201).json({
      ok: true,
      message: `Marks saved as pending for ${student.name}`,
      entry: { id: entry._id.toString(), marks, maxMarks, status: entry.status },
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// GET /marks/pending — exam_department sees all pending, teacher sees own
router.get('/marks/pending', authenticateJWT, requireRole(['exam_department', 'teacher']), async (req, res) => {
  try {
    const { role, userId } = req.auth!
    const filter: any = { status: 'pending' }

    if (role === 'teacher') {
      filter.teacherId = userId
    }

    const marks = await SubjectMarksModel.find(filter).sort({ createdAt: -1 }).lean()

    // Enrich with names
    const studentIds = [...new Set(marks.map((m: any) => m.studentUserId))]
    const courseIds  = [...new Set(marks.map((m: any) => m.courseId))]
    const examIds    = [...new Set(marks.map((m: any) => m.examId))]

    const [students, courses, exams] = await Promise.all([
      UserModel.find({ _id: { $in: studentIds } }).lean(),
      CourseModel.find({ _id: { $in: courseIds } }).lean(),
      ExamModel.find({ _id: { $in: examIds } }).lean(),
    ])

    const studentMap = new Map(students.map((s: any) => [s._id.toString(), s.name]))
    const courseMap  = new Map(courses.map((c: any) => [c._id.toString(), c.name]))
    const examMap    = new Map(exams.map((e: any) => [e._id.toString(), e.name]))

    res.json({
      marks: marks.map((m: any) => ({
        id: m._id.toString(),
        examId: m.examId,
        examName: examMap.get(m.examId) ?? '—',
        studentUserId: m.studentUserId,
        studentName: studentMap.get(m.studentUserId) ?? '—',
        courseId: m.courseId,
        courseName: courseMap.get(m.courseId) ?? '—',
        marks: m.marks,
        maxMarks: m.maxMarks,
        status: m.status,
      })),
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ══════════════════════════════════════════════════════════════════════════
// RESULT PUBLISH — exam_department only
// ══════════════════════════════════════════════════════════════════════════

// POST /result/publish — publish results for an exam
router.post('/result/publish', authenticateJWT, requireRole(['exam_department']), async (req, res) => {
  try {
    const schema = z.object({
      examId: z.string().min(1, 'examId required'),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const { examId } = parsed.data

    const exam = await ExamModel.findById(examId).lean() as any
    if (!exam) return res.status(404).json({ message: 'Exam not found' })

    // Get all pending marks for this exam
    const allMarks = await SubjectMarksModel.find({ examId }).lean()
    if (!allMarks.length) return res.status(400).json({ message: 'No marks found for this exam' })

    // Mark all as verified
    await SubjectMarksModel.updateMany({ examId }, { $set: { status: 'verified' } })

    // Group marks by student
    const studentMap = new Map<string, any[]>()
    for (const m of allMarks as any[]) {
      if (!studentMap.has(m.studentUserId)) studentMap.set(m.studentUserId, [])
      studentMap.get(m.studentUserId)!.push(m)
    }

    // Fetch course names
    const courseIds = [...new Set(allMarks.map((m: any) => m.courseId))]
    const courses = await CourseModel.find({ _id: { $in: courseIds } }).lean()
    const courseNameMap = new Map(courses.map((c: any) => [c._id.toString(), c.name]))

    // Compute ranks — sort by percentage desc
    const studentResults: { userId: string; pct: number }[] = []
    for (const [userId, marks] of studentMap.entries()) {
      const total = marks.reduce((a: number, m: any) => a + m.marks, 0)
      const maxTotal = marks.reduce((a: number, m: any) => a + m.maxMarks, 0)
      studentResults.push({ userId, pct: maxTotal > 0 ? (total / maxTotal) * 100 : 0 })
    }
    studentResults.sort((a, b) => b.pct - a.pct)
    const rankMap = new Map(studentResults.map((s, i) => [s.userId, i + 1]))

    const published: string[] = []
    for (const [studentUserId, marks] of studentMap.entries()) {
      const subjects = marks.map((m: any) => ({
        courseId:   m.courseId,
        courseName: courseNameMap.get(m.courseId) ?? '—',
        marks:      m.marks,
        maxMarks:   m.maxMarks,
        grade:      gradeFromPct(m.maxMarks > 0 ? (m.marks / m.maxMarks) * 100 : 0),
      }))

      const totalMarks    = subjects.reduce((a, s) => a + s.marks, 0)
      const maxTotalMarks = subjects.reduce((a, s) => a + s.maxMarks, 0)
      const percentage    = maxTotalMarks > 0 ? Math.round((totalMarks / maxTotalMarks) * 100) : 0
      const grade         = gradeFromPct(percentage)
      const rank          = rankMap.get(studentUserId)

      // Upsert published result
      await ExamResultModel.findOneAndUpdate(
        { examId, studentUserId },
        { $set: { subjects, totalMarks, maxTotalMarks, percentage, grade, rank, status: 'published', publishedBy: req.auth!.userId, publishedAt: new Date() } },
        { upsert: true, new: true }
      )

      // Notify student
      await notifyUser(
        studentUserId,
        `📊 Result Published: ${exam.name}`,
        `Your result for ${exam.name} has been published. Total: ${totalMarks}/${maxTotalMarks} (${percentage}%) — Grade: ${grade}`
      )

      published.push(studentUserId)
    }

    // Update exam status to completed
    await ExamModel.findByIdAndUpdate(examId, { status: 'completed' })

    res.json({
      ok: true,
      published: published.length,
      message: `Results published for ${published.length} students`,
    })
  } catch (err: any) {
    console.error('[POST /result/publish]', err?.message)
    res.status(500).json({ message: err?.message })
  }
})

// ══════════════════════════════════════════════════════════════════════════
// VIEW RESULTS
// ══════════════════════════════════════════════════════════════════════════

// GET /result/my — student sees own, parent sees child's
router.get('/result/my', authenticateJWT, async (req, res) => {
  try {
    const { role, userId } = req.auth!
    let studentUserId = userId

    if (role === 'parent') {
      const ParentProfileModel = require('../models/ParentProfile').default
      const profile = await ParentProfileModel.findOne({ userId }).lean() as any
      if (!profile?.studentId) return res.json({ results: [] })
      studentUserId = profile.studentId
    } else if (role !== 'student') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const results = await ExamResultModel.find({ studentUserId, status: 'published' })
      .sort({ publishedAt: -1 }).lean()

    const examIds = results.map((r: any) => r.examId)
    const exams = await ExamModel.find({ _id: { $in: examIds } }).lean()
    const examMap = new Map(exams.map((e: any) => [e._id.toString(), e]))

    res.json({
      results: results.map((r: any) => {
        const exam = examMap.get(r.examId) as any
        return {
          id: r._id.toString(),
          examId: r.examId,
          examName: exam?.name ?? '—',
          className: exam?.className ?? '—',
          subjects: r.subjects,
          totalMarks: r.totalMarks,
          maxTotalMarks: r.maxTotalMarks,
          percentage: r.percentage,
          grade: r.grade,
          rank: r.rank ?? null,
          publishedAt: r.publishedAt,
        }
      }),
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// GET /result/all — admin + exam_department see all published results
router.get('/result/all', authenticateJWT, requireRole(['admin', 'exam_department']), async (req, res) => {
  try {
    const { examId } = req.query
    const filter: any = { status: 'published' }
    if (examId) filter.examId = examId

    const results = await ExamResultModel.find(filter).sort({ percentage: -1 }).lean()

    const studentIds = [...new Set(results.map((r: any) => r.studentUserId))]
    const examIds    = [...new Set(results.map((r: any) => r.examId))]

    const [students, exams] = await Promise.all([
      UserModel.find({ _id: { $in: studentIds } }).lean(),
      ExamModel.find({ _id: { $in: examIds } }).lean(),
    ])

    const studentMap = new Map(students.map((s: any) => [s._id.toString(), s.name]))
    const examMap    = new Map(exams.map((e: any) => [e._id.toString(), e.name]))

    res.json({
      results: results.map((r: any) => ({
        id: r._id.toString(),
        examId: r.examId,
        examName: examMap.get(r.examId) ?? '—',
        studentUserId: r.studentUserId,
        studentName: studentMap.get(r.studentUserId) ?? '—',
        totalMarks: r.totalMarks,
        maxTotalMarks: r.maxTotalMarks,
        percentage: r.percentage,
        grade: r.grade,
        rank: r.rank ?? null,
        subjects: r.subjects,
      })),
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// GET /result/analytics — admin only (view analytics, no create/edit)
router.get('/result/analytics', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const results = await ExamResultModel.find({ status: 'published' }).lean()
    const exams   = await ExamModel.find({}).lean()

    const totalPublished = results.length
    const avgPct = results.length
      ? Math.round(results.reduce((a: number, r: any) => a + r.percentage, 0) / results.length)
      : 0

    // Grade distribution
    const gradeDist: Record<string, number> = {}
    for (const r of results as any[]) {
      gradeDist[r.grade] = (gradeDist[r.grade] ?? 0) + 1
    }

    // Per-exam stats
    const examStats = exams.map((e: any) => {
      const examResults = (results as any[]).filter(r => r.examId === e._id.toString())
      const avg = examResults.length
        ? Math.round(examResults.reduce((a, r) => a + r.percentage, 0) / examResults.length)
        : 0
      return { examId: e._id.toString(), examName: e.name, students: examResults.length, avgPercentage: avg }
    })

    res.json({ totalPublished, avgPct, gradeDist, examStats, totalExams: exams.length })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ══════════════════════════════════════════════════════════════════════════
// EXAM DEPARTMENT USER MANAGEMENT — admin creates exam_department accounts
// ══════════════════════════════════════════════════════════════════════════

router.get('/admin/exam-department', authenticateJWT, requireRole(['admin']), async (_req, res) => {
  try {
    const users = await UserModel.find({ role: 'exam_department' }).lean()
    res.json({
      users: users.map((u: any) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        uniqueId: u.uniqueId ?? null,
      })),
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

export default router
