import express from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticateJWT, requireRole } from '../middleware/auth'

const router = express.Router()

router.get('/events', authenticateJWT, async (req, res) => {
  const events = await prisma.event.findMany({ orderBy: { date: 'asc' } })
  const registrations = await prisma.eventRegistration.findMany({
    where: { userId: req.auth!.userId },
    select: { eventId: true },
  })
  const registered = new Set(registrations.map((r) => r.eventId))

  res.json({
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date.toISOString().slice(0, 10),
      description: e.description,
      status: e.status,
      time: e.time ?? '',
      targetClass: e.targetClass,
      isRegistered: registered.has(e.id),
    })),
  })
})

router.post('/events/:eventId/register', authenticateJWT, async (req, res) => {
  const eventId = Array.isArray(req.params.eventId) ? req.params.eventId[0] : req.params.eventId
  await prisma.eventRegistration.upsert({
    where: { eventId_userId: { eventId, userId: req.auth!.userId } },
    update: {},
    create: { eventId, userId: req.auth!.userId },
  })
  res.json({ ok: true })
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

  // Notify students — target class or all
  const students = await prisma.user.findMany({ where: { role: 'student' }, select: { id: true } })
  const dateLabel = new Date(date).toLocaleDateString()
  const timeLabel = time?.trim() ? ` at ${time.trim()}` : ''
  const classLabel = targetClass !== 'All Classes' ? ` (${targetClass})` : ''
  for (const s of students) {
    await prisma.notice.create({
      data: {
        title: `New Event: ${title}`,
        description: `${description} — Date: ${dateLabel}${timeLabel}${classLabel}`,
        type: 'event',
        userId: s.id,
      },
    })
  }

  res.status(201).json({
    event: {
      id: event.id,
      title: event.title,
      date: event.date.toISOString().slice(0, 10),
      description: event.description,
      status: event.status,
      time: event.time ?? '',
      targetClass: event.targetClass,
    },
  })
})

// Admin: edit event
router.put('/events/:id', authenticateJWT, requireRole(['admin']), async (req, res) => {
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
      date: event.date.toISOString().slice(0, 10),
      description: event.description,
      status: event.status,
      time: event.time ?? '',
      targetClass: event.targetClass,
    },
  })
})

// Admin: delete event
router.delete('/events/:id', authenticateJWT, requireRole(['admin']), async (req, res) => {
  const id = req.params.id as string
  await prisma.event.delete({ where: { id } })
  res.json({ ok: true })
})

export default router

