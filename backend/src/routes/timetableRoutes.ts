import express from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticateJWT, requireRole } from '../middleware/auth'

const router = express.Router()

const timetableSchema = z.object({
  type: z.enum(['regular', 'exam']),
  class: z.string().min(1),
  subject: z.string().min(1),
  date: z.string().optional(),
  time: z.string().min(1),
  teacherId: z.string().optional(),
})

// GET — all (teacher sees own, student sees by class, admin sees all)
router.get('/timetable', authenticateJWT, async (req, res) => {
  const type = (req.query.type as string | undefined) ?? undefined
  const entries = await prisma.timetable.findMany({
    where: type ? { type } : undefined,
    orderBy: { createdAt: 'asc' },
  })
  res.json({ entries })
})

// Admin: create
router.post('/timetable', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const parsed = timetableSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const entry = await prisma.timetable.create({ data: parsed.data })

    const teachers = await prisma.user.findMany({ where: { role: 'teacher' }, select: { id: true } })
    const students = await prisma.user.findMany({ where: { role: 'student' }, select: { id: true } })
    for (const u of [...teachers, ...students]) {
      await prisma.notice.create({
        data: {
          title: 'Timetable Updated',
          description: `New ${parsed.data.type} timetable entry: ${parsed.data.subject} — Class ${parsed.data.class} at ${parsed.data.time}${parsed.data.date ? ' on ' + parsed.data.date : ''}`,
          type: 'timetable',
          userId: u.id,
        },
      })
    }
    res.status(201).json({ entry })
  } catch (err: any) {
    console.error('[POST /timetable]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to create timetable entry' })
  }
})

// Admin: edit
router.put('/timetable/:id', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const id = req.params.id as string
    const parsed = timetableSchema.partial().safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const entry = await prisma.timetable.update({ where: { id }, data: parsed.data })

    const users = await prisma.user.findMany({ where: { role: { in: ['teacher', 'student'] } }, select: { id: true } })
    for (const u of users) {
      await prisma.notice.create({
        data: {
          title: 'Timetable Updated',
          description: `Timetable changed: ${entry.subject} — Class ${entry.class} at ${entry.time}`,
          type: 'timetable',
          userId: u.id,
        },
      })
    }
    res.json({ entry })
  } catch (err: any) {
    console.error('[PUT /timetable/:id]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to update timetable entry' })
  }
})

// Admin: delete
router.delete('/timetable/:id', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const id = req.params.id as string
    await prisma.timetable.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err: any) {
    console.error('[DELETE /timetable/:id]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to delete timetable entry' })
  }
})

export default router
