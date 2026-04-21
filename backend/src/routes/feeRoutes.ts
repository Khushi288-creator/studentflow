import express from 'express'
import { prisma } from '../lib/prisma'
import { authenticateJWT, requireRole } from '../middleware/auth'
import { z } from 'zod'

const router = express.Router()

async function notifyStudent(userId: string, title: string, description: string) {
  await prisma.notice.create({ data: { title, description, type: 'fee', userId } })
}

function computeStatus(paidAmount: number, totalAmount: number): 'paid' | 'pending' | 'overdue' {
  if (paidAmount >= totalAmount) return 'paid'
  if (paidAmount > 0) return 'overdue' // partial = overdue in FeeStatus enum
  return 'pending'
}

// ── Admin: create fee structure + auto-assign to class ────────────────────
const structureSchema = z.object({
  className: z.string().min(1, 'Class is required'),
  feeType: z.enum(['tuition', 'exam', 'transport']),
  amount: z.number().int().positive('Amount must be positive'),
  dueDate: z.string().optional(),
})

router.post('/admin/fees/structure', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    console.log('[POST /admin/fees/structure] body:', JSON.stringify(req.body))
    const parsed = structureSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const { className, feeType, amount, dueDate } = parsed.data

    // Save fee structure
    const structure = await prisma.feeStructure.create({
      data: { className, feeType, amount, dueDate: dueDate || null },
    })

    // Find all students of this class
    const profiles = await prisma.studentProfile.findMany({
      where: { className },
      select: { userId: true },
    })

    if (profiles.length === 0) {
      return res.status(201).json({ structure, assigned: 0, message: 'Structure saved. No students found in this class yet.' })
    }

    let assigned = 0
    for (const profile of profiles) {
      // Get or create enrollment
      let enrollment = await prisma.studentEnrollment.findFirst({ where: { userId: profile.userId } })
      if (!enrollment) {
        const course = await prisma.course.findFirst()
        if (!course) continue
        enrollment = await prisma.studentEnrollment.create({
          data: { userId: profile.userId, courseId: course.id, phone: 'NA' },
        })
      }

      await prisma.fee.create({
        data: {
          studentId: enrollment.id,
          amount,
          paidAmount: 0,
          status: 'pending',
          className,
          feeType,
          dueDate: dueDate || null,
          description: `${feeType.charAt(0).toUpperCase() + feeType.slice(1)} Fee`,
        },
      })

      await notifyStudent(
        profile.userId,
        `📋 New Fee: ${feeType.charAt(0).toUpperCase() + feeType.slice(1)}`,
        `A ${feeType} fee of ₹${amount} has been assigned for Class ${className}${dueDate ? `. Due: ${dueDate}` : ''}.`,
      )
      assigned++
    }

    res.status(201).json({ structure, assigned })
  } catch (err: any) {
    console.error('[POST /admin/fees/structure]', err?.message, err?.stack)
    res.status(500).json({ message: err?.message ?? 'Failed to create fee structure' })
  }
})

// ── Admin: get fee structures ─────────────────────────────────────────────
router.get('/admin/fees/structures', authenticateJWT, requireRole(['admin']), async (_req, res) => {
  try {
    const structures = await prisma.feeStructure.findMany({ orderBy: { createdAt: 'desc' } })
    res.json({ structures })
  } catch (err: any) {
    res.status(500).json({ message: err?.message ?? 'Failed' })
  }
})

// ── Admin: list all fees with filters ─────────────────────────────────────
router.get('/admin/fees', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const { className: classFilter, status: statusFilter } = req.query as Record<string, string>

    const fees = await prisma.fee.findMany({
      orderBy: { createdAt: 'desc' },
      where: {
        ...(classFilter && classFilter !== 'all' ? { className: classFilter } : {}),
        ...(statusFilter && statusFilter !== 'all' ? { status: statusFilter as any } : {}),
      },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true } },
            course: { select: { name: true } },
          },
        },
      },
    })

    res.json({
      fees: fees.map(f => ({
        id: f.id,
        amount: f.amount,
        paidAmount: f.paidAmount,
        pendingAmount: Math.max(0, f.amount - f.paidAmount),
        status: f.status,
        className: f.className ?? f.student.course.name,
        feeType: f.feeType,
        description: f.description ?? '',
        dueDate: f.dueDate ?? '',
        studentUserId: f.student.userId,
        studentName: f.student.user.name,
      })),
    })
  } catch (err: any) {
    console.error('[GET /admin/fees]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed' })
  }
})

// ── Admin: create individual fee ──────────────────────────────────────────
const createFeeSchema = z.object({
  studentUserId: z.string().min(1),
  amount: z.number().int().positive(),
  className: z.string().optional(),
  feeType: z.enum(['tuition', 'exam', 'transport']).optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
})

router.post('/admin/fees', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    console.log('[POST /admin/fees] body:', JSON.stringify(req.body))
    const parsed = createFeeSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const { studentUserId, amount, className, feeType, description, dueDate } = parsed.data

    let enrollment = await prisma.studentEnrollment.findFirst({ where: { userId: studentUserId } })
    if (!enrollment) {
      const course = await prisma.course.findFirst()
      if (!course) return res.status(400).json({ message: 'No courses exist yet.' })
      enrollment = await prisma.studentEnrollment.create({
        data: { userId: studentUserId, courseId: course.id, phone: 'NA' },
      })
    }

    let resolvedClass = className
    if (!resolvedClass) {
      const profile = await prisma.studentProfile.findUnique({ where: { userId: studentUserId } })
      resolvedClass = profile?.className ?? undefined
    }

    const fee = await prisma.fee.create({
      data: {
        studentId: enrollment.id,
        amount,
        paidAmount: 0,
        status: 'pending',
        className: resolvedClass || null,
        feeType: feeType || 'tuition',
        description: description || null,
        dueDate: dueDate || null,
      },
    })

    await notifyStudent(
      studentUserId,
      'Fee Assigned',
      `A fee of ₹${amount}${resolvedClass ? ` for Class ${resolvedClass}` : ''} has been assigned.${dueDate ? ` Due: ${dueDate}` : ''}`,
    )

    res.status(201).json({ fee: { id: fee.id, amount: fee.amount, status: fee.status } })
  } catch (err: any) {
    console.error('[POST /admin/fees]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to create fee' })
  }
})

// ── Admin: update fee ─────────────────────────────────────────────────────
const updateFeeSchema = z.object({
  status: z.enum(['paid', 'pending', 'overdue']).optional(),
  amount: z.number().int().positive().optional(),
  paidAmount: z.number().int().min(0).optional(),
  description: z.string().optional(),
  className: z.string().optional(),
  dueDate: z.string().optional(),
})

router.put('/admin/fees/:feeId', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const feeId = req.params.feeId as string
    const parsed = updateFeeSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Invalid data' })

    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
      include: { student: { select: { userId: true } } },
    })
    if (!fee) return res.status(404).json({ message: 'Fee not found' })

    const newPaid = parsed.data.paidAmount ?? fee.paidAmount
    const newAmount = parsed.data.amount ?? fee.amount
    const autoStatus = computeStatus(newPaid, newAmount)

    const updated = await prisma.fee.update({
      where: { id: feeId },
      data: {
        ...(parsed.data.amount !== undefined && { amount: parsed.data.amount }),
        ...(parsed.data.paidAmount !== undefined && { paidAmount: parsed.data.paidAmount }),
        status: parsed.data.status ?? autoStatus,
        ...(parsed.data.description !== undefined && { description: parsed.data.description || null }),
        ...(parsed.data.className !== undefined && { className: parsed.data.className || null }),
        ...(parsed.data.dueDate !== undefined && { dueDate: parsed.data.dueDate || null }),
      },
    })

    await notifyStudent(fee.student.userId, 'Fee Updated', `Your fee record has been updated by admin.`)
    res.json({ fee: { id: updated.id, amount: updated.amount, paidAmount: updated.paidAmount, status: updated.status } })
  } catch (err: any) {
    console.error('[PUT /admin/fees/:feeId]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to update fee' })
  }
})

// ── Admin: delete fee ─────────────────────────────────────────────────────
router.delete('/admin/fees/:feeId', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const feeId = req.params.feeId as string
    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
      include: { student: { select: { userId: true } } },
    })
    if (!fee) return res.status(404).json({ message: 'Fee not found' })
    await prisma.fee.delete({ where: { id: feeId } })
    await notifyStudent(fee.student.userId, 'Fee Removed', `A fee record of ₹${fee.amount} has been removed.`)
    res.json({ ok: true })
  } catch (err: any) {
    console.error('[DELETE /admin/fees/:feeId]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to delete fee' })
  }
})

// ── Student: get own fees ─────────────────────────────────────────────────
router.get('/fees', authenticateJWT, async (req, res) => {
  try {
    const role = req.auth!.role
    if (role === 'student') {
      const enrollments = await prisma.studentEnrollment.findMany({
        where: { userId: req.auth!.userId },
        select: { id: true },
      })
      const ids = enrollments.map(e => e.id)
      const fees = await prisma.fee.findMany({
        where: { studentId: { in: ids } },
        orderBy: { createdAt: 'desc' },
      })
      return res.json({
        fees: fees.map(f => ({
          id: f.id,
          amount: f.amount,
          paidAmount: f.paidAmount,
          pendingAmount: Math.max(0, f.amount - f.paidAmount),
          status: f.status,
          className: f.className ?? '',
          feeType: f.feeType,
          description: f.description ?? '',
          dueDate: f.dueDate ?? '',
        })),
      })
    }

    if (role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.auth!.userId }, select: { id: true } })
      if (!teacher) return res.json({ fees: [] })
      const courses = await prisma.course.findMany({ where: { teacherId: teacher.id }, select: { id: true } })
      const courseIds = courses.map(c => c.id)
      const enrollments = await prisma.studentEnrollment.findMany({ where: { courseId: { in: courseIds } }, select: { id: true } })
      const ids = enrollments.map(e => e.id)
      const fees = await prisma.fee.findMany({ where: { studentId: { in: ids } }, orderBy: { createdAt: 'desc' } })
      return res.json({ fees: fees.map(f => ({ id: f.id, amount: f.amount, paidAmount: f.paidAmount, status: f.status })) })
    }

    const fees = await prisma.fee.findMany({ orderBy: { createdAt: 'desc' } })
    return res.json({ fees: fees.map(f => ({ id: f.id, amount: f.amount, paidAmount: f.paidAmount, status: f.status })) })
  } catch (err: any) {
    res.status(500).json({ message: err?.message ?? 'Failed' })
  }
})

// ── Student: pay fee (partial or full) ───────────────────────────────────
const paySchema = z.object({
  feeId: z.string().min(1),
  payAmount: z.number().int().positive().optional(), // if omitted → pay full pending
})

router.post('/fees/pay', authenticateJWT, requireRole(['student']), async (req, res) => {
  try {
    console.log('[POST /fees/pay] body:', JSON.stringify(req.body))
    const parsed = paySchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const fee = await prisma.fee.findUnique({ where: { id: parsed.data.feeId } })
    if (!fee) return res.status(404).json({ message: 'Fee not found' })

    const enrollment = await prisma.studentEnrollment.findUnique({
      where: { id: fee.studentId },
      select: { userId: true },
    })
    if (!enrollment || enrollment.userId !== req.auth!.userId) return res.status(403).json({ message: 'Forbidden' })

    const pending = fee.amount - fee.paidAmount
    const paying = parsed.data.payAmount ? Math.min(parsed.data.payAmount, pending) : pending
    const newPaid = fee.paidAmount + paying
    const newStatus = computeStatus(newPaid, fee.amount)

    const updated = await prisma.fee.update({
      where: { id: fee.id },
      data: { paidAmount: newPaid, status: newStatus },
    })

    await notifyStudent(
      req.auth!.userId,
      newStatus === 'paid' ? '✅ Payment Complete' : '💳 Partial Payment Received',
      `₹${paying} paid${fee.className ? ` for Class ${fee.className}` : ''}. ${newStatus === 'paid' ? 'Fully paid!' : `Remaining: ₹${fee.amount - newPaid}`}`,
    )

    res.json({ fee: { id: updated.id, amount: updated.amount, paidAmount: updated.paidAmount, pendingAmount: fee.amount - newPaid, status: updated.status } })
  } catch (err: any) {
    console.error('[POST /fees/pay]', err?.message)
    res.status(500).json({ message: err?.message ?? 'Failed to process payment' })
  }
})

export default router
