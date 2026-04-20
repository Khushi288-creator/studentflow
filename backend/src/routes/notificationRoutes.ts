import express from 'express'
import { prisma } from '../lib/prisma'
import { authenticateJWT } from '../middleware/auth'

const router = express.Router()

// Get notifications for logged-in user (personal + broadcast)
router.get('/notifications', authenticateJWT, async (req, res) => {
  const userId = req.auth!.userId

  const notices = await prisma.notice.findMany({
    where: { OR: [{ userId }, { userId: null }] },
    orderBy: { date: 'desc' },
    take: 50,
  })

  const reads = await prisma.noticeRead.findMany({
    where: { userId },
    select: { noticeId: true, readAt: true },
  })
  const readMap = new Map(reads.map((r) => [r.noticeId, r.readAt]))

  res.json({
    notifications: notices.map((n) => ({
      id: n.id,
      title: n.title,
      description: n.description,
      type: n.type,
      date: n.date.toISOString().slice(0, 10),
      createdAt: n.date.toISOString(),
      readAt: readMap.get(n.id) ? new Date(readMap.get(n.id) as Date).toISOString() : undefined,
    })),
  })
})

// Unread count
router.get('/notifications/unread-count', authenticateJWT, async (req, res) => {
  const userId = req.auth!.userId

  const total = await prisma.notice.count({
    where: { OR: [{ userId }, { userId: null }] },
  })

  const read = await prisma.noticeRead.count({ where: { userId } })

  res.json({ count: Math.max(0, total - read) })
})

// Mark all as read
router.post('/notifications/mark-read', authenticateJWT, async (req, res) => {
  const userId = req.auth!.userId

  const notices = await prisma.notice.findMany({
    where: { OR: [{ userId }, { userId: null }] },
    select: { id: true },
  })

  for (const n of notices) {
    await prisma.noticeRead.upsert({
      where: { noticeId_userId: { noticeId: n.id, userId } },
      update: {},
      create: { noticeId: n.id, userId },
    })
  }

  res.json({ ok: true })
})

export default router
