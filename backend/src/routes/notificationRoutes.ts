import express from 'express'
import { prisma } from '../lib/prisma'
import { authenticateJWT } from '../middleware/auth'

const router = express.Router()

// Get notifications for logged-in user (personal + broadcast)
router.get('/notifications', authenticateJWT, async (req, res) => {
  const userId = req.auth!.userId
  const NoticeModel = require('../models/Notice').default
  const NoticeReadModel = require('../models/NoticeRead').default

  const notices = await NoticeModel.find({
    $or: [{ userId }, { userId: null }, { userId: { $exists: false } }]
  }).sort({ date: -1 }).limit(50).lean() as any[]

  const reads = await NoticeReadModel.find({ userId }).lean() as any[]
  const readMap = new Map(reads.map((r: any) => [r.noticeId?.toString(), r.readAt]))

  res.json({
    notifications: notices.map((n: any) => ({
      id: n._id?.toString(),
      title: n.title,
      description: n.description,
      type: n.type,
      date: new Date(n.date).toISOString().slice(0, 10),
      createdAt: new Date(n.date).toISOString(),
      readAt: readMap.get(n._id?.toString()) ? new Date(readMap.get(n._id?.toString()) as Date).toISOString() : undefined,
    })),
  })
})

// Unread count
router.get('/notifications/unread-count', authenticateJWT, async (req, res) => {
  const userId = req.auth!.userId
  const NoticeModel = require('../models/Notice').default
  const NoticeReadModel = require('../models/NoticeRead').default

  const total = await NoticeModel.countDocuments({
    $or: [{ userId }, { userId: null }, { userId: { $exists: false } }]
  })
  const read = await NoticeReadModel.countDocuments({ userId })
  res.json({ count: Math.max(0, total - read) })
})

// Mark all as read
router.post('/notifications/mark-read', authenticateJWT, async (req, res) => {
  const userId = req.auth!.userId
  const NoticeModel = require('../models/Notice').default
  const NoticeReadModel = require('../models/NoticeRead').default

  const notices = await NoticeModel.find({
    $or: [{ userId }, { userId: null }, { userId: { $exists: false } }]
  }).lean() as any[]

  for (const n of notices) {
    const noticeId = n._id?.toString()
    await NoticeReadModel.findOneAndUpdate(
      { noticeId, userId },
      { $setOnInsert: { noticeId, userId, readAt: new Date() } },
      { upsert: true }
    )
  }

  res.json({ ok: true })
})

export default router
