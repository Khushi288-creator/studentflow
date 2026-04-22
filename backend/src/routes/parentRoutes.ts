import express from 'express'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticateJWT, requireRole } from '../middleware/auth'
import { photoUpload } from '../utils/upload'
import AttendanceModel from '../models/Attendance'
import StudentEnrollmentModel from '../models/StudentEnrollment'

const router = express.Router()

// ── helpers ────────────────────────────────────────────────────────────────
async function notifyUser(userId: string, title: string, description: string, type = 'info') {
  await prisma.notice.create({ data: { title, description, type, userId } })
}

// ══════════════════════════════════════════════════════════════════════════
// ADMIN — manage parents
// ══════════════════════════════════════════════════════════════════════════

// GET all parents
router.get('/admin/parents', authenticateJWT, requireRole(['admin']), async (_req, res) => {
  try {
    const parents = await prisma.user.findMany({
      where: { role: 'parent' },
      include: { parentProfile: true },
      orderBy: { createdAt: 'desc' },
    })
    const students = await prisma.user.findMany({
      where: { role: 'student' },
      select: { id: true, name: true, studentProfile: { select: { className: true } } },
    })
    res.json({
      parents: parents.map(p => ({
        id: p.id, name: p.name, email: p.email, createdAt: p.createdAt,
        uniqueId: p.uniqueId ?? (p.email.endsWith('@school.local') ? p.email.replace('@school.local', '') : null),
        phone: p.parentProfile?.phone ?? null,
        photoUrl: p.parentProfile?.photoUrl ?? null,
        studentId: p.parentProfile?.studentId ?? null,
        profileId: p.parentProfile?.id ?? null,
        studentName: students.find(s => s.id === p.parentProfile?.studentId)?.name ?? null,
      })),
      students: students.map(s => ({
        id: s.id, name: s.name,
        className: s.studentProfile?.className ?? null,
      })),
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// POST create parent
router.post('/admin/parents', authenticateJWT, requireRole(['admin']),
  photoUpload.single('photo'), async (req, res) => {
    try {
      const { name, phone, password, studentId } = req.body
      if (!name || !password) return res.status(400).json({ message: 'Name and password required' })

      // Generate PAR001 style unique ID
      const count = await prisma.user.count({ where: { role: 'parent' } })
      let num = count + 1
      let uniqueId = `PAR${String(num).padStart(3, '0')}`
      while (await prisma.user.findUnique({ where: { email: `${uniqueId}@school.local` } })) {
        num++
        uniqueId = `PAR${String(num).padStart(3, '0')}`
      }
      const email = `${uniqueId}@school.local`

      const hash = await bcrypt.hash(password, 12)
      const user = await prisma.user.create({
        data: { name, email, password: hash, role: 'parent', uniqueId },
      })
      const photoUrl = req.file ? `/uploads/photos/${req.file.filename}` : null
      await prisma.parentProfile.create({
        data: { userId: user.id, phone: phone || null, photoUrl, studentId: studentId || null },
      })

      // Notify linked student
      if (studentId) {
        await notifyUser(studentId, '👨‍👩‍👧 Parent Linked', `A parent account has been created and linked to your profile.`, 'info')
      }

      res.status(201).json({ parent: { id: user.id, name, uniqueId, loginId: uniqueId } })
    } catch (err: any) {
      res.status(500).json({ message: err?.message })
    }
  })

// PUT update parent
router.put('/admin/parents/:id', authenticateJWT, requireRole(['admin']),
  photoUpload.single('photo'), async (req, res) => {
    try {
      const userId = req.params.id as string
      const { name, phone, studentId } = req.body

      if (name) await prisma.user.update({ where: { id: userId }, data: { name } })

      const updateData: any = {}
      if (phone !== undefined) updateData.phone = phone || null
      if (studentId !== undefined) updateData.studentId = studentId || null
      if (req.file) updateData.photoUrl = `/uploads/photos/${req.file.filename}`

      await prisma.parentProfile.upsert({
        where: { userId },
        update: updateData,
        create: { userId, ...updateData },
      })

      res.json({ ok: true })
    } catch (err: any) {
      res.status(500).json({ message: err?.message })
    }
  })

// DELETE parent
router.delete('/admin/parents/:id', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id as string } })
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ══════════════════════════════════════════════════════════════════════════
// PARENT — dashboard & data
// ══════════════════════════════════════════════════════════════════════════

// GET parent profile + child info
router.get('/parents/me', authenticateJWT, requireRole(['parent']), async (req, res) => {
  try {
    const userId = req.auth!.userId
    const parent = await prisma.user.findUnique({
      where: { id: userId },
      include: { parentProfile: true },
    })
    if (!parent?.parentProfile?.studentId) {
      return res.json({ parent: { id: parent!.id, name: parent!.name, email: parent!.email }, child: null })
    }

    const studentId = parent.parentProfile.studentId
    const child = await prisma.user.findUnique({
      where: { id: studentId },
      include: { studentProfile: true },
    })

    res.json({
      parent: {
        id: parent.id, name: parent.name, email: parent.email,
        phone: parent.parentProfile.phone,
        photoUrl: parent.parentProfile.photoUrl,
        profileId: parent.parentProfile.id,
      },
      child: child ? {
        id: child.id, name: child.name,
        className: child.studentProfile?.className ?? null,
        photoUrl: child.studentProfile?.photoUrl ?? null,
        gender: child.studentProfile?.gender ?? null,
      } : null,
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// GET parent dashboard — all child data
router.get('/parents/dashboard', authenticateJWT, requireRole(['parent']), async (req, res) => {
  try {
    const userId = req.auth!.userId
    const profile = await prisma.parentProfile.findUnique({ where: { userId } })
    if (!profile?.studentId) return res.json({ child: null })

    const studentUserId = profile.studentId

    // Child basic info
    const child = await prisma.user.findUnique({
      where: { id: studentUserId },
      include: { studentProfile: true },
    })

    // Enrollments — use Mongoose directly to avoid ObjectId cast issues
    const enrollmentDocs = await StudentEnrollmentModel.find({ userId: studentUserId }).lean()
    const enrollmentIds = enrollmentDocs.map((e: any) => e._id.toString())
    const courseIds = enrollmentDocs.map((e: any) => e.courseId)

    // Attendance — use Mongoose directly
    const attendanceDocs = await AttendanceModel.find({
      studentId: { $in: enrollmentIds },
    }).lean()
    const totalAtt = attendanceDocs.length
    const presentAtt = attendanceDocs.filter((a: any) => a.status === 'present').length
    const attendancePct = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0

    // Fees
    const fees = await prisma.fee.findMany({
      where: { studentId: { in: enrollmentIds } },
      select: { amount: true, paidAmount: true, status: true, feeType: true, dueDate: true },
    })
    const totalFees = fees.reduce((a, f) => a + f.amount, 0)
    const paidFees = fees.reduce((a, f) => a + f.paidAmount, 0)
    const pendingFees = totalFees - paidFees

    // Assignments
    const allCourses = await prisma.course.findMany({ select: { id: true } })
    const assignments = await prisma.assignment.findMany({
      where: { courseId: { in: allCourses.map(c => c.id) } },
      orderBy: { dueDate: 'asc' },
      take: 10,
      include: { course: { select: { name: true } } },
    })
    const submissions = await prisma.submission.findMany({
      where: { studentId: { in: enrollmentIds } },
      select: { assignmentId: true },
    })
    const submittedIds = new Set(submissions.map(s => s.assignmentId))

    // Results
    const results = await prisma.result.findMany({
      where: { studentId: { in: enrollmentIds } },
      include: { course: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    // Achievements
    const achievementRows = await prisma.achievement.findMany({
      where: { studentId: studentUserId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })
    const achievements = achievementRows.map((a: any) => ({
      id: a.id,
      title: a.title,
      type: a.type,
      rank: a.rank ?? null,
      date: a.date ?? null,
      description: a.description ?? null,
    }))

    // Skill Hub enrollments
    const activityEnrollments = await prisma.activityEnrollment.findMany({
      where: { studentId: studentUserId },
      include: { activity: { select: { name: true, icon: true, scheduleDays: true, fees: true } } },
    })

    // Events
    const events = await prisma.event.findMany({
      where: { date: { gte: new Date() } },
      orderBy: { date: 'asc' },
      take: 5,
      select: { id: true, title: true, date: true, time: true, description: true },
    })

    // Holidays
    const holidays = await prisma.holiday.findMany({
      orderBy: { date: 'asc' },
      take: 5,
    })

    // Performance
    const performance = await prisma.performance.findMany({
      where: { studentId: studentUserId },
      orderBy: { createdAt: 'desc' },
    })

    // Timetable
    const timetable = await prisma.timetable.findMany({
      where: { class: child?.studentProfile?.className ?? '' },
      orderBy: { time: 'asc' },
    })

    // Alerts
    const alerts: { type: string; message: string }[] = []
    if (attendancePct < 75 && totalAtt > 0) alerts.push({ type: 'warning', message: `⚠ Low attendance: ${attendancePct}% (minimum 75% required)` })
    if (pendingFees > 0) alerts.push({ type: 'danger', message: `🔴 Fees pending: ₹${pendingFees.toLocaleString('en-IN')}` })
    const pendingAssignments = assignments.filter(a => !submittedIds.has(a.id) && new Date(a.dueDate) >= new Date())
    if (pendingAssignments.length > 0) alerts.push({ type: 'info', message: `📚 ${pendingAssignments.length} assignment(s) pending submission` })

    res.json({
      child: {
        id: child!.id, name: child!.name,
        className: child!.studentProfile?.className ?? null,
        photoUrl: child!.studentProfile?.photoUrl ?? null,
        gender: child!.studentProfile?.gender ?? null,
      },
      attendance: { total: totalAtt, present: presentAtt, percentage: attendancePct },
      fees: { total: totalFees, paid: paidFees, pending: pendingFees, records: fees },
      assignments: assignments.map((a: any) => ({
        id: a.id, title: a.title, courseName: (a as any).course?.name,
        dueDate: a.dueDate instanceof Date ? a.dueDate.toISOString().slice(0, 10) : String(a.dueDate ?? '').slice(0, 10),
        submitted: submittedIds.has(a.id),
      })),
      results: results.map(r => ({
        id: r.id, courseName: (r as any).course?.name, marks: r.marks, grade: r.grade,
      })),
      achievements,
      activityEnrollments: activityEnrollments.map(e => ({
        id: e.id, activityName: e.activity.name, icon: e.activity.icon,
        scheduleDays: e.activity.scheduleDays, fees: e.activity.fees,
        paymentStatus: e.paymentStatus,
      })),
      events: events.map((e: any) => ({
        id: e.id, title: e.title, description: e.description,
        date: e.date instanceof Date ? e.date.toISOString().slice(0, 10) : String(e.date ?? '').slice(0, 10),
        time: e.time ?? '',
      })),
      holidays,
      performance,
      timetable,
      alerts,
    })
  } catch (err: any) {
    console.error('[GET /parents/dashboard]', err?.message)
    res.status(500).json({ message: err?.message })
  }
})

// ══════════════════════════════════════════════════════════════════════════
// MEETINGS
// ══════════════════════════════════════════════════════════════════════════

// GET meetings (parent or teacher or admin)
router.get('/parent-meetings', authenticateJWT, async (req, res) => {
  try {
    const { userId, role } = req.auth!
    let meetings

    if (role === 'parent') {
      const profile = await prisma.parentProfile.findUnique({ where: { userId } })
      if (!profile) return res.json({ meetings: [] })
      meetings = await prisma.parentMeeting.findMany({
        where: { parentId: profile.id },
        orderBy: { createdAt: 'desc' },
        include: { teacher: { select: { name: true } } },
      })
    } else if (role === 'teacher') {
      meetings = await prisma.parentMeeting.findMany({
        where: { teacherId: userId },
        orderBy: { createdAt: 'desc' },
        include: { parent: { include: { user: { select: { name: true } } } } },
      })
    } else {
      meetings = await prisma.parentMeeting.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          teacher: { select: { name: true } },
          parent: { include: { user: { select: { name: true } } } },
        },
      })
    }

    res.json({
      meetings: meetings.map((m: any) => ({
        id: m.id, date: m.date, time: m.time, status: m.status, note: m.note,
        teacherName: m.teacher?.name ?? null,
        parentName: m.parent?.user?.name ?? null,
        studentId: m.studentId,
      })),
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// POST schedule meeting (teacher or admin)
router.post('/parent-meetings', authenticateJWT, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { parentId, studentId, date, time, note } = req.body
    if (!parentId || !studentId || !date || !time) return res.status(400).json({ message: 'parentId, studentId, date, time required' })

    const meeting = await prisma.parentMeeting.create({
      data: { parentId, teacherId: req.auth!.userId, studentId, date, time, note: note || null },
    })

    // Notify parent
    const profile = await prisma.parentProfile.findUnique({ where: { id: parentId }, include: { user: true } })
    if (profile) {
      await notifyUser(profile.userId, '📅 Meeting Scheduled', `A parent-teacher meeting has been scheduled on ${date} at ${time}.`, 'meeting')
    }

    res.status(201).json({ meeting })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// PATCH meeting status (parent accepts/rejects)
router.patch('/parent-meetings/:id', authenticateJWT, requireRole(['parent']), async (req, res) => {
  try {
    const { status } = req.body
    if (!['accepted', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' })

    const meeting = await prisma.parentMeeting.update({
      where: { id: req.params.id as string },
      data: { status },
      include: { teacher: { select: { id: true, name: true } } },
    })

    await notifyUser(meeting.teacherId, `📅 Meeting ${status}`, `Parent has ${status} the meeting scheduled on ${meeting.date}.`, 'meeting')
    res.json({ meeting })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ══════════════════════════════════════════════════════════════════════════
// PERFORMANCE
// ══════════════════════════════════════════════════════════════════════════

// GET performance (parent sees child's, admin/teacher sees by studentId)
router.get('/performance', authenticateJWT, async (req, res) => {
  try {
    const { userId, role } = req.auth!
    let studentUserId = req.query.studentId as string | undefined

    if (role === 'parent') {
      const profile = await prisma.parentProfile.findUnique({ where: { userId } })
      studentUserId = profile?.studentId ?? undefined
    }

    if (!studentUserId) return res.json({ performance: [] })

    const performance = await prisma.performance.findMany({
      where: { studentId: studentUserId },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ performance })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// POST add performance (admin/teacher)
router.post('/performance', authenticateJWT, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { studentId, subject, marks, examName } = req.body
    if (!studentId || !subject || marks === undefined || !examName) {
      return res.status(400).json({ message: 'studentId, subject, marks, examName required' })
    }
    const perf = await prisma.performance.create({
      data: { studentId, subject, marks: Number(marks), examName },
    })
    // Notify parent
    const parentProfile = await prisma.parentProfile.findFirst({ where: { studentId } })
    if (parentProfile) {
      await notifyUser(parentProfile.userId, '📊 New Result Added', `${examName}: ${subject} — ${marks} marks`, 'result')
    }
    res.status(201).json({ performance: perf })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ══════════════════════════════════════════════════════════════════════════
// PARENT ↔ TEACHER MESSAGES
// ══════════════════════════════════════════════════════════════════════════

router.get('/parent-messages/:teacherId', authenticateJWT, async (req, res) => {
  try {
    const { userId, role } = req.auth!
    const teacherId = req.params.teacherId as string

    let parentId: string | null = null
    if (role === 'parent') {
      const profile = await prisma.parentProfile.findUnique({ where: { userId } })
      parentId = profile?.id ?? null
    } else {
      // teacher fetching — parentId from query
      parentId = req.query.parentId as string
    }

    if (!parentId) return res.json({ messages: [] })

    const messages = await prisma.parentMessage.findMany({
      where: { parentId, teacherId },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ messages })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

router.post('/parent-messages', authenticateJWT, async (req, res) => {
  try {
    const { userId, role } = req.auth!
    const { teacherId, text, parentId: bodyParentId } = req.body
    if (!teacherId || !text) return res.status(400).json({ message: 'teacherId and text required' })

    let parentId = bodyParentId
    if (role === 'parent') {
      const profile = await prisma.parentProfile.findUnique({ where: { userId } })
      parentId = profile?.id
    }
    if (!parentId) return res.status(400).json({ message: 'parentId required' })

    const msg = await prisma.parentMessage.create({
      data: { parentId, teacherId, senderId: userId, text },
    })

    // Notify the other party
    if (role === 'parent') {
      await notifyUser(teacherId, '💬 New Message from Parent', text.slice(0, 80), 'message')
    } else {
      const profile = await prisma.parentProfile.findUnique({ where: { id: parentId } })
      if (profile) await notifyUser(profile.userId, '💬 New Message from Teacher', text.slice(0, 80), 'message')
    }

    res.status(201).json({ message: msg })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// GET all parents list (for teacher to pick from)
router.get('/parents/list', authenticateJWT, requireRole(['teacher', 'admin']), async (_req, res) => {
  try {
    const parents = await prisma.user.findMany({
      where: { role: 'parent' },
      include: { parentProfile: true },
    })
    const students = await prisma.user.findMany({
      where: { role: 'student' },
      select: { id: true, name: true },
    })
    res.json({
      parents: parents.map(p => ({
        id: p.id, name: p.name,
        profileId: p.parentProfile?.id,
        studentId: p.parentProfile?.studentId,
        studentName: students.find(s => s.id === p.parentProfile?.studentId)?.name ?? null,
      })),
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// GET teachers list accessible by parent (for chat)
router.get('/parents/teachers', authenticateJWT, requireRole(['parent']), async (_req, res) => {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: 'teacher' },
      select: { id: true, name: true, teacher: { select: { subject: true } } },
      orderBy: { name: 'asc' },
    })
    res.json({
      teachers: teachers.map(t => ({
        id: t.id, name: t.name, subject: t.teacher?.subject ?? null,
      })),
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

export default router
