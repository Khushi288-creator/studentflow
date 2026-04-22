import express from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticateJWT, requireRole } from '../middleware/auth'

const router = express.Router()

// ── helpers ────────────────────────────────────────────────────────────────
// Zod v4: empty string → fallback default value
const strDefault = (def: string) => z.string().transform(v => (v === '' ? def : v))
// empty string or missing → null
const optStr = z.string().transform(v => (v === '' ? null : v)).nullable().optional()

const activitySchema = z.object({
  name:         z.string().min(1),
  description:  z.string().min(1),
  duration:     z.string().min(1),
  fees:         z.coerce.number().int().min(0),
  scheduleDays: z.string().min(1),
  scheduleTime: optStr,
  targetClass:  strDefault('All Classes'),
  capacity:     z.coerce.number().int().positive().optional().nullable(),
  level:        strDefault('Beginner'),
  batch:        strDefault('Morning'),
  icon:         strDefault('🎯'),
})

const facultySchema = z.object({
  name:         z.string().min(1),
  activityId:   z.string().min(1),
  salaryType:   z.enum(['fixed', 'per_student']),
  salaryAmount: z.number().int().min(0),
})

// ── GET all activities (all roles) ────────────────────────────────────────
router.get('/skill-hub/activities', authenticateJWT, async (req, res) => {
  const activities = await prisma.activity.findMany({
    orderBy: { createdAt: 'desc' },
    include: { faculty: true, enrollments: { select: { id: true } } },
  })

  const userId = req.auth!.userId
  const myEnrollments = await prisma.activityEnrollment.findMany({
    where: { studentId: userId },
  })
  const enrollMap = new Map<string, any>(myEnrollments.map((e: any) => [e.activityId, e]))

  res.json({
    activities: activities.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      duration: a.duration,
      fees: a.fees,
      scheduleDays: a.scheduleDays,
      scheduleTime: a.scheduleTime ?? '',
      targetClass: a.targetClass,
      capacity: a.capacity,
      level: a.level,
      batch: a.batch,
      icon: a.icon,
      faculty: (a as any).faculty?.[0] ?? null,
      enrolledCount: (a as any).enrollments?.length ?? 0,
      isEnrolled: enrollMap.has(a.id),
      paymentStatus: (enrollMap.get(a.id) as any)?.paymentStatus ?? null,
      myRating: (enrollMap.get(a.id) as any)?.rating ?? null,
    })),
  })
})

// ── GET faculty list ───────────────────────────────────────────────────────
router.get('/skill-hub/faculty', authenticateJWT, requireRole(['admin']), async (_req, res) => {
  const faculty = await prisma.activityFaculty.findMany({
    orderBy: { createdAt: 'desc' },
    include: { activity: { select: { name: true } } },
  })
  res.json({ faculty })
})

// ── POST create activity (admin) ───────────────────────────────────────────
router.post('/skill-hub/activities', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const parsed = activitySchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })
    const data = {
      ...parsed.data,
      scheduleTime: parsed.data.scheduleTime || null,
    }
    const activity = await prisma.activity.create({ data })
    res.status(201).json({ activity })
  } catch (err: any) {
    console.error('CREATE ACTIVITY ERROR:', err)
    return res.status(500).json({ message: err?.message ?? 'Internal server error' })
  }
})

// ── PUT edit activity (admin) ──────────────────────────────────────────────
router.put('/skill-hub/activities/:id', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const id = req.params.id as string
    const parsed = activitySchema.partial().safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })
    const data = {
      ...parsed.data,
      scheduleTime: parsed.data.scheduleTime !== undefined ? (parsed.data.scheduleTime || null) : undefined,
    }
    const activity = await prisma.activity.update({ where: { id }, data })
    res.json({ activity })
  } catch (err: any) {
    console.error('UPDATE ACTIVITY ERROR:', err)
    return res.status(500).json({ message: err?.message ?? 'Internal server error' })
  }
})

// ── DELETE activity (admin) ────────────────────────────────────────────────
router.delete('/skill-hub/activities/:id', authenticateJWT, requireRole(['admin']), async (req, res) => {
  const id = req.params.id as string
  await prisma.activity.delete({ where: { id } })
  res.json({ ok: true })
})

// ── POST create faculty (admin) ────────────────────────────────────────────
router.post('/skill-hub/faculty', authenticateJWT, requireRole(['admin']), async (req, res) => {
  const parsed = facultySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })
  const faculty = await prisma.activityFaculty.create({ data: parsed.data })
  res.status(201).json({ faculty })
})

// ── DELETE faculty (admin) ─────────────────────────────────────────────────
router.delete('/skill-hub/faculty/:id', authenticateJWT, requireRole(['admin']), async (req, res) => {
  const id = req.params.id as string
  await prisma.activityFaculty.delete({ where: { id } })
  res.json({ ok: true })
})

// ── POST enroll student ────────────────────────────────────────────────────
router.post('/skill-hub/activities/:id/enroll', authenticateJWT, async (req, res) => {
  const activityId = req.params.id as string
  const studentId  = req.auth!.userId

  const existing = await prisma.activityEnrollment.findUnique({
    where: { studentId_activityId: { studentId, activityId } },
  })
  if (existing) return res.status(409).json({ message: 'Already enrolled' })

  const activity = await prisma.activity.findUnique({ where: { id: activityId } })
  if (!activity) return res.status(404).json({ message: 'Activity not found' })

  // capacity check
  if (activity.capacity) {
    const count = await prisma.activityEnrollment.count({ where: { activityId } })
    if (count >= activity.capacity) return res.status(400).json({ message: 'Activity is full' })
  }

  const enrollment = await prisma.activityEnrollment.create({
    data: { studentId, activityId, paymentStatus: 'paid' },
  })
  res.status(201).json({ enrollment })
})

// ── POST rate activity ─────────────────────────────────────────────────────
router.post('/skill-hub/activities/:id/rate', authenticateJWT, async (req, res) => {
  const activityId = req.params.id as string
  const studentId  = req.auth!.userId
  const rating = Number(req.body.rating)
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1–5' })

  const enrollment = await prisma.activityEnrollment.findUnique({
    where: { studentId_activityId: { studentId, activityId } },
  })
  if (!enrollment) return res.status(403).json({ message: 'Not enrolled' })

  await prisma.activityEnrollment.update({
    where: { studentId_activityId: { studentId, activityId } },
    data: { rating },
  })
  res.json({ ok: true })
})

// ── GET salary report (admin) ──────────────────────────────────────────────
router.get('/skill-hub/salary', authenticateJWT, requireRole(['admin']), async (_req, res) => {
  const faculty = await prisma.activityFaculty.findMany({
    include: {
      activity: {
        select: { name: true, enrollments: { select: { id: true } } },
      },
    },
  })

  const report = faculty.map(f => {
    const studentCount = f.activity.enrollments.length
    const netSalary = f.salaryType === 'fixed'
      ? f.salaryAmount
      : f.salaryAmount * studentCount
    return {
      id: f.id,
      facultyName: f.name,
      activityName: f.activity.name,
      salaryType: f.salaryType,
      salaryAmount: f.salaryAmount,
      studentCount,
      netSalary,
    }
  })

  res.json({ report })
})

// ── POST issue certificate (admin) ────────────────────────────────────────
router.post('/skill-hub/activities/:id/certificate', authenticateJWT, requireRole(['admin']), async (req, res) => {
  const activityId = req.params.id as string
  const { studentId } = req.body
  if (!studentId) return res.status(400).json({ message: 'studentId required' })

  const cert = await prisma.activityCertificate.upsert({
    where: { studentId_activityId: { studentId, activityId } } as any,
    update: { issuedDate: new Date().toISOString().slice(0, 10) },
    create: { studentId, activityId, issuedDate: new Date().toISOString().slice(0, 10) },
  })
  res.json({ certificate: cert })
})

// ── GET enrollments for an activity (admin) ────────────────────────────────
router.get('/skill-hub/activities/:id/enrollments', authenticateJWT, requireRole(['admin']), async (req, res) => {
  const activityId = req.params.id as string
  const enrollments = await prisma.activityEnrollment.findMany({
    where: { activityId },
    include: { student: { select: { id: true, name: true } } },
  })
  res.json({ enrollments })
})

export default router
