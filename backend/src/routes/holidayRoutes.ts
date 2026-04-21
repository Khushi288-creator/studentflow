import express from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticateJWT, requireRole } from '../middleware/auth'

const router = express.Router()

const schema = z.object({
  name: z.string().min(1),
  date: z.string().min(1),
})

// GET — all roles can view
router.get('/holidays', authenticateJWT, async (_req, res) => {
  const holidays = await prisma.holiday.findMany({ orderBy: { date: 'asc' } })
  res.json({ holidays })
})

// Admin: create
router.post('/holidays', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const holiday = await prisma.holiday.create({ data: parsed.data })

    const students = await prisma.user.findMany({ where: { role: 'student' }, select: { id: true } })
    for (const s of students) {
      await prisma.notice.create({
        data: {
          title: `Holiday: ${parsed.data.name}`,
          description: `${parsed.data.name} on ${parsed.data.date}`,
          type: 'holiday',
          userId: s.id,
        },
      })
    }
    res.status(201).json({ holiday })
  } catch (err: any) {
    console.error('[POST /holidays]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to create holiday' })
  }
})

// Admin: edit
router.put('/holidays/:id', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const id = req.params.id as string
    const parsed = schema.partial().safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })
    const holiday = await prisma.holiday.update({ where: { id }, data: parsed.data })
    res.json({ holiday })
  } catch (err: any) {
    console.error('[PUT /holidays/:id]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to update holiday' })
  }
})

// Admin: delete
router.delete('/holidays/:id', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const id = req.params.id as string
    await prisma.holiday.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err: any) {
    console.error('[DELETE /holidays/:id]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to delete holiday' })
  }
})

export default router
