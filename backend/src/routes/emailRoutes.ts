import express from 'express'
import { z } from 'zod'
import { authenticateJWT, requireRole } from '../middleware/auth'
import { sendMail, buildEmailHtml } from '../utils/mailer'
import UserModel from '../models/User'
import StudentProfileModel from '../models/StudentProfile'

const router = express.Router()

// ── GET /admin/email/recipients — list available target groups ────────────
router.get('/admin/email/recipients', authenticateJWT, requireRole(['admin']), async (_req, res) => {
  try {
    const students = await UserModel.find({ role: 'student' }).lean()
    const teachers = await UserModel.find({ role: 'teacher' }).lean()
    const parents  = await UserModel.find({ role: 'parent'  }).lean()

    // Get distinct classes
    const profiles = await StudentProfileModel.find({ className: { $ne: null } })
      .distinct('className')
    const classes = profiles.filter(Boolean).sort()

    res.json({
      totalUsers: students.length + teachers.length + parents.length,
      students: students.length,
      teachers: teachers.length,
      parents: parents.length,
      classes,
      // Individual users list (id + name + email + role)
      users: [...students, ...teachers, ...parents].map((u: any) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
      })),
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ── POST /admin/email/send ────────────────────────────────────────────────
const sendSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Message body is required'),
  // target: 'all' | 'students' | 'teachers' | 'parents' | 'class:ClassName' | 'user:userId'
  target: z.string().min(1, 'Target is required'),
})

router.post('/admin/email/send', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const parsed = sendSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const { subject, body, target } = parsed.data

    let recipients: string[] = []

    if (target === 'all') {
      const users = await UserModel.find({
        role: { $in: ['student', 'teacher', 'parent'] },
        email: { $not: /^(STU|TCH|PAR|ADM)\d+@school\.local$/ },
      }).lean()
      recipients = users.map((u: any) => u.email).filter(Boolean)

    } else if (target === 'students') {
      const users = await UserModel.find({
        role: 'student',
        email: { $not: /^STU\d+@school\.local$/ },
      }).lean()
      recipients = users.map((u: any) => u.email).filter(Boolean)

    } else if (target === 'teachers') {
      const users = await UserModel.find({
        role: 'teacher',
        email: { $not: /^TCH\d+@school\.local$/ },
      }).lean()
      recipients = users.map((u: any) => u.email).filter(Boolean)

    } else if (target === 'parents') {
      const users = await UserModel.find({
        role: 'parent',
        email: { $not: /^PAR\d+@school\.local$/ },
      }).lean()
      recipients = users.map((u: any) => u.email).filter(Boolean)

    } else if (target.startsWith('class:')) {
      const className = target.replace('class:', '')
      const profiles = await StudentProfileModel.find({ className }).lean()
      const userIds = profiles.map((p: any) => p.userId)
      const users = await UserModel.find({
        _id: { $in: userIds },
        email: { $not: /^STU\d+@school\.local$/ },
      }).lean()
      recipients = users.map((u: any) => u.email).filter(Boolean)

    } else if (target.startsWith('user:')) {
      const userId = target.replace('user:', '')
      const user = await UserModel.findById(userId).lean() as any
      if (user?.email && !user.email.endsWith('@school.local')) {
        recipients = [user.email]
      }
    }

    // Filter out @school.local placeholder emails
    recipients = recipients.filter(e => e && !e.endsWith('@school.local'))

    if (recipients.length === 0) {
      return res.status(400).json({
        message: 'No valid email addresses found for the selected target. Users with @school.local IDs do not have real emails.',
      })
    }

    const html = buildEmailHtml(subject, body.replace(/\n/g, '<br>'))
    const result = await sendMail(recipients, subject, html)

    if ((result as any).skipped) {
      return res.json({
        ok: true,
        sent: 0,
        skipped: true,
        message: 'Email not sent — EMAIL_USER/EMAIL_PASS not configured in .env. Configure Gmail credentials to enable real email sending.',
        recipients: recipients.length,
      })
    }

    res.json({
      ok: true,
      sent: recipients.length,
      message: `Email sent to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''} successfully!`,
    })
  } catch (err: any) {
    console.error('[POST /admin/email/send]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to send email' })
  }
})

export default router
