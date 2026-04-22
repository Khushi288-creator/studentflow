import express from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticateJWT, requireRole } from '../middleware/auth'
import { sendMail, buildEmailHtml } from '../utils/mailer'
import UserModel from '../models/User'
import StudentProfileModel from '../models/StudentProfile'

const router = express.Router()

// helper — safely convert date to ISO string
function toDateStr(d: any): string {
  if (!d) return ''
  if (typeof d === 'string') return d.slice(0, 10)
  if (d instanceof Date) return d.toISOString().slice(0, 10)
  return String(d).slice(0, 10)
}

// GET upcoming events — used by all dashboards
router.get('/events/upcoming', authenticateJWT, async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      where: { date: { gte: new Date() } },
      orderBy: { date: 'asc' },
      take: 5,
    })
    res.json({
      events: events.map((e: any) => ({
        id: e.id, title: e.title, description: e.description,
        date: e.date instanceof Date ? e.date.toISOString().slice(0,10) : String(e.date ?? '').slice(0,10),
        time: e.time ?? '',
        targetClass: e.targetClass,
      })),
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// GET all events (any authenticated user)
router.get('/events', authenticateJWT, async (req, res) => {
  try {
    const events = await prisma.event.findMany({ orderBy: { date: 'asc' } })
    const registrations = await prisma.eventRegistration.findMany({
      where: { userId: req.auth!.userId },
      select: { eventId: true },
    })
    const registered = new Set(registrations.map((r: any) => r.eventId))

    res.json({
      events: events.map((e: any) => ({
        id: e.id,
        title: e.title,
        date: toDateStr(e.date),
        description: e.description,
        status: e.status,
        time: e.time ?? '',
        targetClass: e.targetClass,
        isRegistered: registered.has(e.id),
      })),
    })
  } catch (err: any) {
    console.error('[GET /events]', err?.message)
    res.status(500).json({ message: err?.message })
  }
})

// POST register for event
router.post('/events/:eventId/register', authenticateJWT, async (req, res) => {
  try {
    const eventId = req.params.eventId as string
    const userId = req.auth!.userId
    // Check if already registered
    const existing = await prisma.eventRegistration.findFirst({
      where: { eventId, userId },
    })
    if (!existing) {
      await prisma.eventRegistration.create({ data: { eventId, userId } })
    }
    res.json({ ok: true })
  } catch (err: any) {
    console.error('[POST /events/:eventId/register]', err?.message)
    res.status(500).json({ message: err?.message })
  }
})

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.string().min(1),
  status: z.enum(['upcoming', 'completed']).default('upcoming'),
  time: z.string().optional(),
  targetClass: z.string().default('All Classes'),
})

// Admin: create event
router.post('/events', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const parsed = eventSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })
    const { title, description, date, status, time, targetClass } = parsed.data

    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        status,
        time: time?.trim() || null,
        targetClass,
      },
    })

    // ── Notifications ──────────────────────────────────────────────────
    const dateLabel = new Date(date).toLocaleDateString('en-IN')
    const timeLabel = time?.trim() ? ` at ${time.trim()}` : ''
    const classLabel = targetClass !== 'All Classes' ? ` (${targetClass})` : ''
    const notifTitle = `🎉 New Event: ${title}`
    const notifDesc = `${description} — Date: ${dateLabel}${timeLabel}${classLabel}`

    // Determine which users to notify
    let usersToNotify: { id: string }[] = []

    if (targetClass === 'All Classes' || targetClass === 'ALL') {
      // All students, teachers, parents
      usersToNotify = await prisma.user.findMany({
        where: { role: { in: ['student', 'teacher', 'parent'] } },
        select: { id: true },
      })
    } else {
      // Students in that class
      const profiles = await prisma.studentProfile.findMany({
        where: { className: targetClass },
        select: { userId: true },
      })
      const studentIds = profiles.map((p: any) => p.userId)

      // Parents linked to those students
      const parentProfiles = await prisma.parentProfile.findMany({
        where: { studentId: { in: studentIds } },
        select: { userId: true },
      })

      // Teachers (always notify all teachers for class-specific events too)
      const teachers = await prisma.user.findMany({
        where: { role: 'teacher' },
        select: { id: true },
      })

      usersToNotify = [
        ...profiles.map((p: any) => ({ id: p.userId })),
        ...parentProfiles.map((p: any) => ({ id: p.userId })),
        ...teachers,
      ]
    }

    // Deduplicate and create notices
    const seen = new Set<string>()
    for (const u of usersToNotify) {
      if (seen.has(u.id)) continue
      seen.add(u.id)
      await prisma.notice.create({
        data: { title: notifTitle, description: notifDesc, type: 'event', userId: u.id },
      })
    }

    res.status(201).json({
      event: {
        id: event.id,
        title: event.title,
        date: toDateStr(event.date),
        description: event.description,
        status: event.status,
        time: event.time ?? '',
        targetClass: event.targetClass,
      },
    })

    // ── Send emails in background (non-blocking) ───────────────────────
    setImmediate(async () => {
      try {
        let emailUsers: any[] = []
        if (targetClass === 'All Classes' || targetClass === 'ALL') {
          emailUsers = await UserModel.find({
            role: { $in: ['student', 'teacher', 'parent'] },
            email: { $not: /^(STU|TCH|PAR|ADM)\d+@school\.local$/ },
          }).lean()
        } else {
          const profiles = await StudentProfileModel.find({ className: targetClass }).lean()
          const studentIds = profiles.map((p: any) => p.userId)
          emailUsers = await UserModel.find({
            _id: { $in: studentIds },
            email: { $not: /^STU\d+@school\.local$/ },
          }).lean()
        }
        const emails = emailUsers.map((u: any) => u.email).filter(Boolean)
        if (emails.length > 0) {
          const dateLabel = new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
          const html = buildEmailHtml(
            `🎉 New Event: ${title}`,
            `<p>A new school event has been announced:</p>
             <p><strong>${title}</strong></p>
             <p>${description}</p>
             <p>📅 Date: <strong>${dateLabel}</strong>${time?.trim() ? `<br>🕒 Time: <strong>${time.trim()}</strong>` : ''}
             ${targetClass !== 'All Classes' ? `<br>🎓 Class: <strong>${targetClass}</strong>` : ''}</p>`
          )
          await sendMail(emails, `🎉 New Event: ${title}`, html)
        }
      } catch (e: any) {
        console.error('[eventRoutes] email send error:', e?.message)
      }
    })
  } catch (err: any) {
    console.error('[POST /events]', err?.message)
    res.status(500).json({ message: err?.message })
  }
})

// Admin: edit event
router.put('/events/:id', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const id = req.params.id as string
    const parsed = eventSchema.partial().safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })
    const data: any = { ...parsed.data }
    if (data.date) data.date = new Date(data.date)
    if ('time' in data) data.time = data.time?.trim() || null
    const event = await prisma.event.update({ where: { id }, data })
    res.json({
      event: {
        id: event.id,
        title: event.title,
        date: toDateStr(event.date),
        description: event.description,
        status: event.status,
        time: event.time ?? '',
        targetClass: event.targetClass,
      },
    })
  } catch (err: any) {
    console.error('[PUT /events/:id]', err?.message)
    res.status(500).json({ message: err?.message })
  }
})

// Admin: delete event
router.delete('/events/:id', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const id = req.params.id as string
    await prisma.event.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err: any) {
    console.error('[DELETE /events/:id]', err?.message)
    res.status(500).json({ message: err?.message })
  }
})

export default router
