import express from 'express'
import PDFDocument from 'pdfkit'
import { prisma } from '../lib/prisma'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import OpenAI from 'openai'

const router = express.Router()

// Lazy-init OpenAI so missing key doesn't crash on startup
let _openai: OpenAI | null = null
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') return null
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

router.get('/reports/results.pdf', async (_req, res) => {
  const doc = new PDFDocument({ margin: 40 })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'inline; filename="results.pdf"')
  doc.pipe(res)

  doc.fontSize(20).text('StudentFlow - Results', { align: 'left' })
  doc.moveDown()

  const results = await prisma.result.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { course: { select: { name: true } } },
  })

  if (!results.length) {
    doc.fontSize(12).text('No stored results found yet.')
    doc.end()
    return
  }

  for (const r of results) {
    doc.fontSize(12).text(`Course: ${r.course.name} | Marks: ${r.marks} | Grade: ${r.grade}`)
  }

  doc.moveDown()
  doc.fontSize(10).text(`Generated at: ${new Date().toISOString()}`)
  doc.end()
})

router.get('/reports/resume.pdf', async (_req, res) => {
  const doc = new PDFDocument({ margin: 40 })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'inline; filename="resume.pdf"')
  doc.pipe(res)

  doc.fontSize(20).text('StudentFlow - Resume', { align: 'left' })
  doc.moveDown()

  const resume = await prisma.resume.findFirst({ orderBy: { id: 'desc' } })
  if (!resume) {
    doc.fontSize(12).text('No resume found yet.')
    doc.end()
    return
  }

  doc.fontSize(14).text(resume.headline || 'Resume')
  doc.moveDown(0.5)
  doc.fontSize(12).text(resume.summary || '')
  doc.moveDown(0.5)
  doc.fontSize(12).text(`Skills: ${resume.skills || ''}`)

  doc.moveDown()
  doc.fontSize(10).text(`Generated at: ${new Date().toISOString()}`)
  doc.end()
})

// --- Smart Extras ---

function optionalAuthRole(req: express.Request): { userId: string; role: string } | null {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
  if (!token) return null
  const secret = process.env.JWT_ACCESS_SECRET
  if (!secret) return null
  try {
    const payload = jwt.verify(token, secret) as any
    return payload?.sub && payload?.role ? { userId: payload.sub, role: payload.role } : null
  } catch {
    return null
  }
}

router.get('/assistant/recommendations', async (req, res) => {
  const auth = optionalAuthRole(req)
  if (!auth || auth.role !== 'student') {
    return res.json({ recommendations: ['Log in as student to get personalized recommendations.'] })
  }

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { userId: auth.userId },
    select: { id: true, courseId: true },
  })
  const studentIds = enrollments.map((e) => e.id)
  const courseIds = enrollments.map((e) => e.courseId)

  const now = new Date()
  const assignments = await prisma.assignment.findMany({
    where: { courseId: { in: courseIds }, dueDate: { gte: now } },
    select: { id: true, courseId: true },
  })

  let pending = 0
  for (const a of assignments) {
    const hasSubmission = await prisma.submission.findFirst({
      where: { assignmentId: a.id, studentId: { in: studentIds } },
      select: { id: true },
    })
    if (!hasSubmission) pending += 1
  }

  return res.json({
    recommendations: [
      pending ? `You have ${pending} pending assignments. Submit them to improve your results.` : 'Nice! No pending assignments right now.',
      'Check your Attendance page to keep your attendance high.',
      'Visit Events for registrations and updates.',
    ],
  })
})

export default router
