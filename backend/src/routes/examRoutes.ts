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
import { prisma } from '../lib/prisma'

const router = express.Router()

// ── helpers ────────────────────────────────────────────────────────────────
// Grade scale for exam department:
// A: >= 90  |  B: >= 75  |  C: >= 50  |  D: < 50
function gradeFromPct(pct: number): string {
  if (pct >= 90) return 'A'
  if (pct >= 75) return 'B'
  if (pct >= 50) return 'C'
  return 'D'
}

async function notifyUser(userId: string, title: string, description: string) {
  await NoticeModel.create({ title, description, type: 'result', userId })
}

// ══════════════════════════════════════════════════════════════════════════
// EXAM MANAGEMENT — exam_department only
// ══════════════════════════════════════════════════════════════════════════

// GET /exam/students-by-class/:className — teacher fetches students of a class
router.get('/exam/students-by-class/:className', authenticateJWT, requireRole(['teacher', 'exam_department', 'admin']), async (req, res) => {
  try {
    const className = decodeURIComponent(req.params.className)
    if (!className) return res.status(400).json({ message: 'className required' })

    const students = await prisma.user.findMany({
      where: { role: 'student', studentProfile: { className } },
      select: { id: true, name: true, studentProfile: { select: { className: true } } },
      orderBy: { name: 'asc' },
    })

    res.json({
      students: students.map(s => ({
        id: s.id,
        name: s.name,
        className: s.studentProfile?.className ?? null,
      })),
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})
router.get('/exam/subjects-by-class/:classNum', authenticateJWT, requireRole(['exam_department', 'admin']), async (req, res) => {
  try {
    const classNum = parseInt(req.params.classNum)
    if (isNaN(classNum) || classNum < 4 || classNum > 8) {
      return res.status(400).json({ message: 'Class must be between 4 and 8' })
    }

    const ClassSubjectsModel = require('../models/ClassSubjects').default
    const doc = await ClassSubjectsModel.findOne({ class: classNum }).lean()
    
    if (!doc) {
      return res.json({ subjects: [] })
    }

    res.json({
      subjects: doc.subjects.map((s: any) => s.name),
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// Helper function to check date overlap
function hasDateOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = new Date(start1)
  const e1 = new Date(end1)
  const s2 = new Date(start2)
  const e2 = new Date(end2)
  
  // Check if date ranges overlap
  // Overlap occurs if: start1 <= end2 AND end1 >= start2
  return s1 <= e2 && e1 >= s2
}

// Helper function to check time overlap (if time is specified)
function hasTimeOverlap(time1?: string, time2?: string): boolean {
  // If either exam doesn't have time specified, consider it as potential overlap
  if (!time1 || !time2) return true
  
  // If both have same time string, it's definitely an overlap
  if (time1 === time2) return true
  
  // For simplicity, if both have time specified and dates overlap, consider it a clash
  // In a real system, you'd parse the time ranges and check for overlap
  return true
}

// POST /exam/create
router.post('/exam/create', authenticateJWT, requireRole(['exam_department']), async (req, res) => {
  try {
    const schema = z.object({
      name:      z.string().min(2, 'Exam name required'),
      className: z.string().min(1, 'Class required'),
      subject:   z.string().min(1, 'Subject required'),
      subjects:  z.array(z.string()).optional(), // kept for backward compatibility
      startDate: z.string().min(1),
      endDate:   z.string().min(1),
      time:      z.string().optional(),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const { name, className, subject, startDate, endDate, time } = parsed.data

    // Validation 1: Check for same class + same subject + overlapping dates
    const sameSubjectExams = await ExamModel.find({
      className,
      subject,
      status: { $in: ['upcoming', 'ongoing'] },
    }).lean()

    for (const existing of sameSubjectExams as any[]) {
      if (hasDateOverlap(startDate, endDate, existing.startDate, existing.endDate)) {
        return res.status(409).json({
          message: `Exam for ${subject} in ${className} already scheduled during this period (${existing.startDate} to ${existing.endDate})`,
        })
      }
    }

    // Validation 2: Check for same class + overlapping date/time (any subject)
    // This prevents scheduling multiple exams for the same class at the same time
    const sameClassExams = await ExamModel.find({
      className,
      status: { $in: ['upcoming', 'ongoing'] },
    }).lean()

    for (const existing of sameClassExams as any[]) {
      // Check if dates overlap
      if (hasDateOverlap(startDate, endDate, existing.startDate, existing.endDate)) {
        // If dates overlap, check if times also overlap
        if (hasTimeOverlap(time, existing.time)) {
          return res.status(409).json({
            message: `Exam already scheduled for ${className} at this time. Existing exam: "${existing.name}" (${existing.subject}) from ${existing.startDate} to ${existing.endDate}${existing.time ? ` at ${existing.time}` : ''}`,
          })
        }
      }
    }

    const exam = await ExamModel.create({
      name,
      className,
      subject,
      subjects: parsed.data.subjects ?? [], // backward compatibility
      startDate,
      endDate,
      time,
      status: 'upcoming',
      createdBy: req.auth!.userId,
    })

    res.status(201).json({
      exam: {
        id: exam._id.toString(),
        name: exam.name,
        className: exam.className,
        subject: exam.subject,
        status: exam.status,
      },
    })
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
        subject: e.subject ?? null,
        subjects: e.subjects ?? [], // backward compatibility
        startDate: e.startDate,
        endDate: e.endDate,
        time: e.time ?? null,
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

    // Compute ranks — sort by percentage desc, handle ties (same % = same rank)
    const studentResults: { userId: string; pct: number }[] = []
    for (const [userId, marks] of studentMap.entries()) {
      const total = marks.reduce((a: number, m: any) => a + m.marks, 0)
      const maxTotal = marks.reduce((a: number, m: any) => a + m.maxMarks, 0)
      studentResults.push({ userId, pct: maxTotal > 0 ? (total / maxTotal) * 100 : 0 })
    }
    studentResults.sort((a, b) => b.pct - a.pct)

    // Assign ranks with tie handling: same percentage → same rank
    // e.g. [95, 90, 90, 80] → ranks [1, 2, 2, 4]
    const rankMap = new Map<string, number>()
    let currentRank = 1
    for (let i = 0; i < studentResults.length; i++) {
      if (i > 0 && studentResults[i].pct === studentResults[i - 1].pct) {
        // Tie: assign same rank as previous
        rankMap.set(studentResults[i].userId, rankMap.get(studentResults[i - 1].userId)!)
      } else {
        // No tie: rank = actual position (1-based)
        currentRank = i + 1
        rankMap.set(studentResults[i].userId, currentRank)
      }
    }

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
