import express from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticateJWT, requireRole } from '../middleware/auth'

const router = express.Router()

const include = {
  student: {
    select: {
      id: true,
      name: true,
      studentProfile: { select: { className: true } },
    },
  },
}

function fmt(a: any) {
  return {
    id: a.id,
    title: a.title,
    type: a.type,
    rank: a.rank ?? null,
    date: a.date ?? null,
    studentId: a.studentId,
    studentName: a.student.name,
    className: a.student.studentProfile?.className ?? null,
    createdAt: a.createdAt.toISOString().slice(0, 10),
  }
}

// ── GET — role-based ──────────────────────────────────────────────────────
router.get('/achievements', authenticateJWT, async (req, res) => {
  const { role, userId } = req.auth!

  if (role === 'student') {
    const rows = await prisma.achievement.findMany({
      where: { studentId: userId },
      orderBy: { createdAt: 'desc' },
      include,
    })
    return res.json({ achievements: rows.map(fmt) })
  }

  // teacher + admin: all
  const rows = await prisma.achievement.findMany({
    orderBy: { createdAt: 'desc' },
    include,
  })
  res.json({ achievements: rows.map(fmt) })
})

// ── Admin: CREATE ─────────────────────────────────────────────────────────
const createSchema = z.object({
  studentId: z.string().min(1, 'studentId is required'),
  title: z.string().min(2, 'Title must be at least 2 characters'),
  type: z.enum(['achievement', 'activity'], { errorMap: () => ({ message: 'Type must be achievement or activity' }) }),
  rank: z.enum(['1st', '2nd', '3rd']).optional().nullable(),
  date: z.string().optional().nullable(),
})

router.post('/achievements', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    console.log('[POST /achievements] body:', JSON.stringify(req.body))

    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Validation failed'
      console.error('[POST /achievements] validation error:', msg)
      return res.status(400).json({ message: msg })
    }

    const { studentId, title, type, rank, date } = parsed.data

    // Fix: findUnique only accepts unique fields — use separate where + role check
    const student = await prisma.user.findUnique({ where: { id: studentId } })
    if (!student) return res.status(404).json({ message: 'Student not found' })
    if (student.role !== 'student') return res.status(400).json({ message: 'Selected user is not a student' })

    const row = await prisma.achievement.create({
      data: {
        studentId,
        title,
        type,
        rank: rank || null,
        date: date && date.trim() ? date.trim() : null,
      },
      include,
    })

    // Notify student
    const emoji = type === 'achievement' ? '🏆' : '📘'
    await prisma.notice.create({
      data: {
        title: `${emoji} New ${type === 'achievement' ? 'Achievement' : 'Activity'} Added`,
        description: `"${title}"${rank ? ` — ${rank} place` : ''} has been added to your profile.`,
        type: 'notice',
        userId: studentId,
      },
    })

    res.status(201).json({ achievement: fmt(row) })
  } catch (err: any) {
    console.error('[POST /achievements] error:', err?.message, err?.stack)
    res.status(500).json({ message: err?.message ?? 'Failed to create achievement' })
  }
})

// ── Admin: UPDATE ─────────────────────────────────────────────────────────
const updateSchema = z.object({
  title: z.string().min(2).optional(),
  type: z.enum(['achievement', 'activity']).optional(),
  rank: z.enum(['1st', '2nd', '3rd']).optional().nullable(),
  date: z.string().optional().nullable(),
})

router.put('/achievements/:id', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const id = req.params.id as string
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const existing = await prisma.achievement.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: 'Not found' })

    const row = await prisma.achievement.update({
      where: { id },
      data: {
        ...(parsed.data.title && { title: parsed.data.title }),
        ...(parsed.data.type && { type: parsed.data.type }),
        ...(parsed.data.rank !== undefined && { rank: parsed.data.rank || null }),
        ...(parsed.data.date !== undefined && { date: parsed.data.date && parsed.data.date.trim() ? parsed.data.date.trim() : null }),
      },
      include,
    })

    res.json({ achievement: fmt(row) })
  } catch (err: any) {
    console.error('[PUT /achievements/:id] error:', err?.message, err?.stack)
    res.status(500).json({ message: err?.message ?? 'Failed to update achievement' })
  }
})

// ── Admin: DELETE ─────────────────────────────────────────────────────────
router.delete('/achievements/:id', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const id = req.params.id as string
    const existing = await prisma.achievement.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: 'Not found' })
    await prisma.achievement.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err: any) {
    console.error('[DELETE /achievements/:id] error:', err?.message, err?.stack)
    res.status(500).json({ message: err?.message ?? 'Failed to delete achievement' })
  }
})

export default router
