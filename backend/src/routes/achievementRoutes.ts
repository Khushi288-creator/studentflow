import express from 'express'
import { z } from 'zod'
import mongoose from 'mongoose'
import { prisma } from '../lib/prisma'
import { authenticateJWT, requireRole } from '../middleware/auth'
import UserModel from '../models/User'
import StudentProfileModel from '../models/StudentProfile'

const router = express.Router()

// ── helper: enrich achievement rows with student name/class ───────────────
async function enrichAchievements(rows: any[]) {
  if (!rows.length) return []

  const studentIds = [...new Set(rows.map(r => r.studentId).filter(Boolean))]

  // Query directly via Mongoose to avoid ObjectId cast issues in the wrapper
  const [users, profiles] = await Promise.all([
    UserModel.find({ _id: { $in: studentIds } }).lean(),
    StudentProfileModel.find({ userId: { $in: studentIds } }).lean(),
  ])

  const userMap = new Map(users.map((u: any) => [u._id.toString(), u]))
  const profileMap = new Map(profiles.map((p: any) => [p.userId, p]))

  return rows.map((a: any) => {
    const student = userMap.get(a.studentId) as any
    const profile = profileMap.get(a.studentId) as any
    const createdAt = a.createdAt instanceof Date
      ? a.createdAt.toISOString().slice(0, 10)
      : String(a.createdAt ?? '').slice(0, 10)
    return {
      id: a.id,
      title: a.title,
      type: a.type,
      rank: a.rank ?? null,
      date: a.date ?? null,
      description: a.description ?? null,
      studentId: a.studentId,
      studentName: student?.name ?? 'Unknown',
      className: profile?.className ?? null,
      createdAt,
    }
  })
}

// ── GET — role-based ──────────────────────────────────────────────────────
router.get('/achievements', authenticateJWT, async (req, res) => {
  try {
    const { role, userId } = req.auth!

    const where = role === 'student' ? { studentId: userId } : {}
    const rows = await prisma.achievement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    const enriched = await enrichAchievements(rows)
    res.json({ achievements: enriched })
  } catch (err: any) {
    console.error('[GET /achievements]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to fetch achievements' })
  }
})

// ── Admin: CREATE ─────────────────────────────────────────────────────────
const createSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  title: z.string().min(2, 'Title must be at least 2 characters'),
  type: z.enum(['achievement', 'activity']),
  rank: z.enum(['1st', '2nd', '3rd']).optional().nullable(),
  date: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
})

router.post('/achievements', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Validation failed' })
    }

    const { studentId, title, type, rank, date, description } = parsed.data

    const student = await prisma.user.findUnique({ where: { id: studentId } })
    if (!student) return res.status(404).json({ message: 'Student not found' })
    if ((student as any).role !== 'student') return res.status(400).json({ message: 'Selected user is not a student' })

    const row = await prisma.achievement.create({
      data: {
        studentId,
        title,
        type,
        rank: rank || null,
        date: date?.trim() || null,
        description: description?.trim() || null,
      },
    })

    // Notify student
    const emoji = type === 'achievement' ? '🏆' : '📘'
    await prisma.notice.create({
      data: {
        title: `${emoji} New ${type === 'achievement' ? 'Achievement' : 'Activity'} Added`,
        description: `"${title}"${rank ? ` — ${rank} place` : ''}${description ? `: ${description}` : ''} has been added to your profile.`,
        type: 'notice',
        userId: studentId,
      },
    })

    const [enriched] = await enrichAchievements([row])
    res.status(201).json({ achievement: enriched, message: 'Achievement saved successfully!' })
  } catch (err: any) {
    console.error('[POST /achievements]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to create achievement' })
  }
})

// ── Admin: UPDATE ─────────────────────────────────────────────────────────
const updateSchema = z.object({
  title: z.string().min(2).optional(),
  type: z.enum(['achievement', 'activity']).optional(),
  rank: z.enum(['1st', '2nd', '3rd']).optional().nullable(),
  date: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
})

router.put('/achievements/:id', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const id = req.params.id as string
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const existing = await prisma.achievement.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: 'Achievement not found' })

    const updateData: any = {}
    if (parsed.data.title)       updateData.title = parsed.data.title
    if (parsed.data.type)        updateData.type  = parsed.data.type
    if (parsed.data.rank !== undefined)        updateData.rank = parsed.data.rank || null
    if (parsed.data.date !== undefined)        updateData.date = parsed.data.date?.trim() || null
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description?.trim() || null

    const row = await prisma.achievement.update({ where: { id }, data: updateData })
    const [enriched] = await enrichAchievements([row])
    res.json({ achievement: enriched, message: 'Achievement updated successfully!' })
  } catch (err: any) {
    console.error('[PUT /achievements/:id]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to update achievement' })
  }
})

// ── Admin: DELETE ─────────────────────────────────────────────────────────
router.delete('/achievements/:id', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const id = req.params.id as string
    const existing = await prisma.achievement.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: 'Achievement not found' })
    await prisma.achievement.delete({ where: { id } })
    res.json({ ok: true, message: 'Achievement deleted successfully!' })
  } catch (err: any) {
    console.error('[DELETE /achievements/:id]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to delete achievement' })
  }
})

export default router
