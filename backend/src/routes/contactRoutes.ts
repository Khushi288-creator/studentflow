import express from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticateJWT, requireRole } from '../middleware/auth'

const router = express.Router()

// ── Public: list teachers (any authenticated user — for dropdowns) ────────
router.get('/teachers', authenticateJWT, async (_req, res) => {
  try {
    // Get all users with teacher role directly
    const UserModel = require('../models/User').default
    const TeacherModel = require('../models/Teacher').default
    const teacherUsers = await UserModel.find({ role: 'teacher' }).lean()
    const teacherProfiles = await TeacherModel.find({}).lean()
    const profileMap = Object.fromEntries(
      teacherProfiles.map((t: any) => [t.userId?.toString(), t])
    )
    res.json({
      teachers: teacherUsers.map((u: any) => {
        const profile = profileMap[u._id?.toString()]
        return {
          id: u._id?.toString(),
          name: u.name,
          subject: profile?.subject ?? '',
        }
      }),
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message ?? 'Failed' })
  }
})

// ── Teacher: contact admin ────────────────────────────────────────────────
const teacherContactSchema = z.object({
  category: z.enum(['technical', 'student_issue', 'request', 'other']),
  message: z.string().min(5, 'Description must be at least 5 characters'),
})

router.post('/contact/teacher', authenticateJWT, requireRole(['teacher']), async (req, res) => {
  try {
    console.log('[POST /contact/teacher] body:', JSON.stringify(req.body))
    const parsed = teacherContactSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const { category, message } = parsed.data
    const teacher = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { name: true, email: true },
    })

    await prisma.contactMessage.create({
      data: {
        userId: req.auth!.userId,
        name: teacher?.name ?? 'Teacher',
        email: teacher?.email ?? '',
        message,
        teacherId: req.auth!.userId,
        category,
        senderRole: 'teacher',
      },
    })

    // Notify all admins
    const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } })
    const catLabel: Record<string, string> = {
      technical: 'Technical Issue', student_issue: 'Student Issue',
      request: 'Request', other: 'Other',
    }
    for (const admin of admins) {
      await prisma.notice.create({
        data: {
          title: `${catLabel[category] ?? category} from ${teacher?.name ?? 'Teacher'}`,
          description: message.slice(0, 200),
          type: 'notice',
          userId: admin.id,
        },
      })
    }

    res.json({ ok: true })
  } catch (err: any) {
    console.error('[POST /contact/teacher]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to send' })
  }
})

// ── Teacher: report student issue ─────────────────────────────────────────
const studentIssueSchema = z.object({
  studentId: z.string().min(1, 'Please select a student'),
  issueType: z.enum(['not_attending', 'misbehavior', 'assignment_not_submitted', 'other']),
  description: z.string().min(5, 'Description must be at least 5 characters'),
})

router.post('/contact/student-issue', authenticateJWT, requireRole(['teacher']), async (req, res) => {
  try {
    console.log('[POST /contact/student-issue] body:', JSON.stringify(req.body))
    const parsed = studentIssueSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const { studentId, issueType, description } = parsed.data

    const student = await prisma.user.findUnique({ where: { id: studentId } })
    if (!student) return res.status(404).json({ message: 'Student not found' })

    const teacher = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { name: true, email: true },
    })

    const issueLabel: Record<string, string> = {
      not_attending: 'Not Attending', misbehavior: 'Misbehavior',
      assignment_not_submitted: 'Assignment Not Submitted', other: 'Other',
    }

    await prisma.contactMessage.create({
      data: {
        userId: req.auth!.userId,
        name: teacher?.name ?? 'Teacher',
        email: teacher?.email ?? '',
        message: `[Student Issue — ${issueLabel[issueType]}] Student: ${student.name}\n\n${description}`,
        teacherId: req.auth!.userId,
        category: 'student_issue',
        senderRole: 'teacher',
      },
    })

    // Notify all admins
    const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } })
    for (const admin of admins) {
      await prisma.notice.create({
        data: {
          title: `Student Issue: ${student.name} (${issueLabel[issueType]})`,
          description: `Reported by ${teacher?.name ?? 'Teacher'}: ${description.slice(0, 150)}`,
          type: 'notice',
          userId: admin.id,
        },
      })
    }

    res.json({ ok: true })
  } catch (err: any) {
    console.error('[POST /contact/student-issue]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to report issue' })
  }
})

// ── Teacher: get own sent messages ────────────────────────────────────────
router.get('/contact/teacher-messages', authenticateJWT, requireRole(['teacher']), async (req, res) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    res.json({
      messages: messages.map(m => ({
        id: m.id,
        message: m.message,
        category: m.category,
        createdAt: m.createdAt.toISOString().slice(0, 10),
      })),
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message ?? 'Failed' })
  }
})

// ── Student: send complaint or message ───────────────────────────────────
const sendSchema = z.object({
  teacherId: z.string().min(1, 'Please select a teacher'),
  message: z.string().min(5, 'Message must be at least 5 characters'),
  category: z.enum(['complaint', 'query', 'request'] as const).refine(v => ['complaint','query','request'].includes(v), { message: 'Category must be complaint, query, or request' }),
})

router.post('/contact', authenticateJWT, requireRole(['student']), async (req, res) => {
  try {
    const parsed = sendSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const { teacherId, message, category } = parsed.data

    // Verify teacher exists
    const teacher = await prisma.user.findUnique({ where: { id: teacherId } })
    if (!teacher || teacher.role !== 'teacher') return res.status(404).json({ message: 'Teacher not found' })

    const student = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { name: true, email: true },
    })

    await prisma.contactMessage.create({
      data: {
        userId: req.auth!.userId,
        name: student?.name ?? 'Student',
        email: student?.email ?? '',
        message,
        teacherId,
        category,
        senderRole: 'student',
      },
    })

    // Notify the teacher
    const categoryLabel = category === 'complaint' ? 'Complaint' : category === 'query' ? 'Query' : 'Request/Notice'
    await prisma.notice.create({
      data: {
        title: `${categoryLabel} from ${student?.name ?? 'a student'}`,
        description: message.slice(0, 200),
        type: 'notice',
        userId: teacherId,
      },
    })

    // If complaint, also notify admin
    if (category === 'complaint') {
      const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } })
      for (const admin of admins) {
        await prisma.notice.create({
          data: {
            title: `Complaint: ${student?.name ?? 'Student'} → ${teacher.name}`,
            description: message.slice(0, 200),
            type: 'notice',
            userId: admin.id,
          },
        })
      }
    }

    res.json({ ok: true })
  } catch (err: any) {
    console.error('[POST /contact]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to send message' })
  }
})

// ── Student: get own messages ─────────────────────────────────────────────
router.get('/contact/my-messages', authenticateJWT, requireRole(['student']), async (req, res) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const teacherIds = [...new Set(messages.map(m => m.teacherId).filter(Boolean))] as string[]
    const teachers = await prisma.user.findMany({
      where: { id: { in: teacherIds } },
      select: { id: true, name: true },
    })
    const teacherMap = Object.fromEntries(teachers.map(t => [t.id, t.name]))

    res.json({
      messages: messages.map(m => ({
        id: m.id,
        teacherName: m.teacherId ? (teacherMap[m.teacherId] ?? '—') : '—',
        message: m.message,
        category: m.category,
        createdAt: m.createdAt.toISOString().slice(0, 10),
      })),
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message ?? 'Failed' })
  }
})

// ── Admin: view all messages (enhanced) ──────────────────────────────────
router.get('/contact/messages', authenticateJWT, requireRole(['admin']), async (_req, res) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    const userIds = [...new Set(messages.map(m => m.userId).filter(Boolean))] as string[]
    const teacherIds = [...new Set(messages.map(m => m.teacherId).filter(Boolean))] as string[]
    const allIds = [...new Set([...userIds, ...teacherIds])]

    const users = await prisma.user.findMany({
      where: { id: { in: allIds } },
      select: { id: true, name: true, role: true },
    })
    const userMap = Object.fromEntries(users.map(u => [u.id, u]))

    console.log('[GET /contact/messages] total:', messages.length)

    res.json({
      messages: messages.map(m => ({
        id: m.id,
        senderName: m.name,
        senderRole: m.senderRole,
        teacherName: m.teacherId ? (userMap[m.teacherId]?.name ?? '—') : '—',
        message: m.message,
        category: m.category,
        status: m.status,
        adminReply: m.adminReply ?? null,
        createdAt: m.createdAt.toISOString().slice(0, 10),
      })),
    })
  } catch (err: any) {
    console.error('[GET /contact/messages]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed' })
  }
})

// ── Admin: reply to a message ─────────────────────────────────────────────
router.post('/contact/messages/:id/reply', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const id = req.params.id as string
    const { reply } = req.body
    if (!reply || !reply.trim()) return res.status(400).json({ message: 'Reply cannot be empty' })

    const msg = await prisma.contactMessage.findUnique({ where: { id } })
    if (!msg) return res.status(404).json({ message: 'Message not found' })

    const updated = await prisma.contactMessage.update({
      where: { id },
      data: { adminReply: reply.trim(), status: 'resolved' },
    })

    // Notify the sender
    if (msg.userId) {
      await prisma.notice.create({
        data: {
          title: 'Admin replied to your message',
          description: reply.trim().slice(0, 200),
          type: 'notice',
          userId: msg.userId,
        },
      })
    }

    res.json({ ok: true, message: { id: updated.id, status: updated.status, adminReply: updated.adminReply } })
  } catch (err: any) {
    console.error('[POST /contact/messages/:id/reply]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to reply' })
  }
})

export default router
