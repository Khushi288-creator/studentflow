import express from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticateJWT, requireRole } from '../middleware/auth'

const router = express.Router()

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const timetableSchema = z.object({
  type:        z.enum(['regular', 'exam']),
  class:       z.string().min(1),
  day:         z.string().min(1),
  subject:     z.string().min(1),
  time:        z.string().min(1),
  teacherId:   z.string().optional(),
  teacherName: z.string().optional(),
  date:        z.string().optional(),
})

// Helper function to auto-fetch teacher for a subject
async function getTeacherForSubject(classNum: string, subject: string): Promise<{ teacherId?: string; teacherName?: string }> {
  try {
    const ClassSubjectsModel = require('../models/ClassSubjects').default
    const UserModel = require('../models/User').default
    
    const classNumber = parseInt(classNum)
    if (isNaN(classNumber) || classNumber < 4 || classNumber > 8) {
      return {}
    }

    const doc = await ClassSubjectsModel.findOne({ class: classNumber })
    if (!doc) return {}

    const subjectData = doc.subjects.find(
      (s: any) => s.name.toLowerCase() === subject.toLowerCase()
    )

    if (!subjectData || !subjectData.teacherId) return {}

    const teacher = await UserModel.findById(subjectData.teacherId)
    if (!teacher) return {}

    return {
      teacherId: subjectData.teacherId,
      teacherName: teacher.name,
    }
  } catch (err) {
    console.error('[getTeacherForSubject]', err)
    return {}
  }
}

// ── GET /timetable — role-based filtering ─────────────────────────────────
router.get('/timetable', authenticateJWT, async (req, res) => {
  try {
    const { role, userId } = req.auth!
    const type = (req.query.type as string | undefined) ?? undefined
    const classFilter = (req.query.class as string | undefined) ?? undefined

    let where: any = type ? { type } : {}

    if (role === 'student') {
      // Student sees only their class timetable
      const profile = await prisma.studentProfile.findUnique({ where: { userId }, select: { className: true } })
      if (!profile?.className) return res.json({ entries: [] })
      // className stored as "Class 5" or "5" — normalize
      const classNum = profile.className.replace('Class ', '').trim()
      where.class = classNum
    } else if (role === 'parent') {
      // Parent sees child's class timetable
      const ParentProfileModel = require('../models/ParentProfile').default
      const UserModel = require('../models/User').default
      const parentProfile = await ParentProfileModel.findOne({ userId })
      if (!parentProfile?.studentId) return res.json({ entries: [] })
      const studentUser = await UserModel.findOne({ uniqueId: parentProfile.studentId })
      if (!studentUser) return res.json({ entries: [] })
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: studentUser._id.toString() },
        select: { className: true },
      })
      if (!studentProfile?.className) return res.json({ entries: [] })
      const classNum = studentProfile.className.replace('Class ', '').trim()
      where.class = classNum
    } else if (role === 'teacher' || role === 'admin' || role === 'exam_department') {
      // Teacher/Admin/ExamDept see all — optionally filter by class
      if (classFilter) where.class = classFilter
    }

    const entries = await prisma.timetable.findMany({
      where,
      orderBy: [{ class: 'asc' }, { createdAt: 'asc' }],
    })
    res.json({ entries })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ── POST /timetable — admin creates regular timetable ─────────────────────
router.post('/timetable', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const parsed = timetableSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    // Auto-fetch teacher if not provided
    const teacherData = await getTeacherForSubject(parsed.data.class, parsed.data.subject)
    const entryData = {
      ...parsed.data,
      type: 'regular' as const,
      teacherId: parsed.data.teacherId || teacherData.teacherId,
      teacherName: parsed.data.teacherName || teacherData.teacherName,
    }

    // Check for teacher clash before creating
    if (entryData.teacherId) {
      const existingEntry = await prisma.timetable.findFirst({
        where: {
          teacherId: entryData.teacherId,
          day: entryData.day,
          time: entryData.time,
          type: 'regular',
          class: { not: entryData.class },
        },
      })

      if (existingEntry) {
        return res.status(409).json({
          message: `Teacher ${entryData.teacherName} is already teaching ${existingEntry.subject} in Class ${existingEntry.class} on ${entryData.day} at ${entryData.time}`,
        })
      }
    }

    const entry = await prisma.timetable.create({ data: entryData })

    // Notify students of that class
    const profiles = await prisma.studentProfile.findMany({
      where: { className: { in: [`Class ${parsed.data.class}`, parsed.data.class] } },
      select: { userId: true },
    })
    for (const p of profiles) {
      await prisma.notice.create({
        data: {
          title: 'Timetable Updated',
          description: `${parsed.data.subject} — Class ${parsed.data.class} on ${parsed.data.day} at ${parsed.data.time}`,
          type: 'timetable',
          userId: p.userId,
        },
      })
    }
    res.status(201).json({ entry })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ── POST /timetable/exam — exam_department creates exam timetable ──────────
router.post('/timetable/exam', authenticateJWT, requireRole(['exam_department', 'admin']), async (req, res) => {
  try {
    const parsed = timetableSchema.safeParse({ ...req.body, type: 'exam' })
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    // Auto-fetch teacher if not provided
    const teacherData = await getTeacherForSubject(parsed.data.class, parsed.data.subject)
    const entryData = {
      ...parsed.data,
      teacherId: parsed.data.teacherId || teacherData.teacherId,
      teacherName: parsed.data.teacherName || teacherData.teacherName,
    }

    const entry = await prisma.timetable.create({ data: entryData })

    // Notify students of that class
    const profiles = await prisma.studentProfile.findMany({
      where: { className: { in: [`Class ${parsed.data.class}`, parsed.data.class] } },
      select: { userId: true },
    })
    for (const p of profiles) {
      await prisma.notice.create({
        data: {
          title: 'Exam Timetable Updated',
          description: `${parsed.data.subject} exam — Class ${parsed.data.class} on ${parsed.data.day}${parsed.data.date ? ' (' + parsed.data.date + ')' : ''} at ${parsed.data.time}`,
          type: 'timetable',
          userId: p.userId,
        },
      })
    }
    res.status(201).json({ entry })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ── PUT /timetable/:id — admin/exam_dept edits ────────────────────────────
router.put('/timetable/:id', authenticateJWT, requireRole(['admin', 'exam_department']), async (req, res) => {
  try {
    const id = req.params.id as string
    const parsed = timetableSchema.partial().safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })
    const entry = await prisma.timetable.update({ where: { id }, data: parsed.data })
    res.json({ entry })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ── DELETE /timetable/:id — admin/exam_dept deletes ───────────────────────
router.delete('/timetable/:id', authenticateJWT, requireRole(['admin', 'exam_department']), async (req, res) => {
  try {
    const id = req.params.id as string
    await prisma.timetable.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ── GET /timetable/smart/periods — get pre-generated periods for class ────
router.get('/timetable/smart/periods', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const SchoolConfigModel = require('../models/SchoolConfig').default
    
    // Get school config with periods
    const config = await SchoolConfigModel.findOne({ key: 'default' })
    if (!config) {
      return res.status(404).json({ message: 'School configuration not found. Please configure school timing first.' })
    }

    // Filter only teaching periods (exclude prayer and break)
    const teachingPeriods = config.periods.filter((p: any) => p.type === 'period')
    
    res.json({
      periods: teachingPeriods.map((p: any) => ({
        periodNumber: p.periodNumber,
        label: p.label,
        startTime: p.startTime,
        endTime: p.endTime,
        timeSlot: `${p.startTime} - ${p.endTime}`,
      })),
      days: DAYS,
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ── GET /timetable/smart/class/:class — get existing timetable for class ──
router.get('/timetable/smart/class/:class', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const classNum = req.params.class as string
    
    // Get all timetable entries for this class
    const entries = await prisma.timetable.findMany({
      where: { class: classNum, type: 'regular' },
    })
    
    // Group by day and period
    const timetableMap: Record<string, Record<string, any>> = {}
    
    for (const entry of entries) {
      if (!timetableMap[entry.day]) {
        timetableMap[entry.day] = {}
      }
      timetableMap[entry.day][entry.time] = {
        id: entry.id,
        subject: entry.subject,
        teacherId: entry.teacherId,
        teacherName: entry.teacherName,
      }
    }
    
    res.json({ timetable: timetableMap })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ── POST /timetable/smart/save — save complete timetable for class ────────
router.post('/timetable/smart/save', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const schema = z.object({
      class: z.string().min(1),
      timetable: z.array(z.object({
        day: z.string().min(1),
        periodNumber: z.number().int().min(1),
        timeSlot: z.string().min(1),
        subject: z.string().min(1),
      })),
    })
    
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message })
    }
    
    const { class: classNum, timetable } = parsed.data
    
    // Validation 1: Check for empty slots (all periods for all days should be filled)
    const SchoolConfigModel = require('../models/SchoolConfig').default
    const config = await SchoolConfigModel.findOne({ key: 'default' })
    if (!config) {
      return res.status(404).json({ message: 'School configuration not found' })
    }
    
    const teachingPeriods = config.periods.filter((p: any) => p.type === 'period')
    const expectedSlots = DAYS.length * teachingPeriods.length
    
    if (timetable.length !== expectedSlots) {
      return res.status(400).json({ 
        message: `Incomplete timetable. Expected ${expectedSlots} slots, got ${timetable.length}. Please fill all slots.` 
      })
    }
    
    // Validation 2: Check for repeated subjects per day (max 2 occurrences)
    const subjectCountPerDay: Record<string, Record<string, number>> = {}
    
    for (const entry of timetable) {
      if (!subjectCountPerDay[entry.day]) {
        subjectCountPerDay[entry.day] = {}
      }
      subjectCountPerDay[entry.day][entry.subject] = (subjectCountPerDay[entry.day][entry.subject] || 0) + 1
      
      if (subjectCountPerDay[entry.day][entry.subject] > 2) {
        return res.status(400).json({ 
          message: `Subject "${entry.subject}" appears more than 2 times on ${entry.day}. Maximum 2 occurrences per day allowed.` 
        })
      }
    }
    
    // Validation 3: Check for teacher clashes (same teacher cannot teach 2 classes at same time)
    // Build map of teacher assignments with their time slots
    const teacherAssignments: Array<{
      teacherId: string
      teacherName: string
      subject: string
      day: string
      timeSlot: string
    }> = []
    
    for (const entry of timetable) {
      const teacherData = await getTeacherForSubject(classNum, entry.subject)
      if (teacherData.teacherId) {
        teacherAssignments.push({
          teacherId: teacherData.teacherId,
          teacherName: teacherData.teacherName || 'Unknown',
          subject: entry.subject,
          day: entry.day,
          timeSlot: entry.timeSlot,
        })
      }
    }
    
    // Check for clashes with other classes' timetables
    const allOtherTimetables = await prisma.timetable.findMany({
      where: { 
        class: { not: classNum },
        type: 'regular',
      },
    })
    
    // Group other timetables by teacher, day, and time
    const existingTeacherSchedule: Record<string, Array<{ class: string; day: string; time: string; subject: string }>> = {}
    
    for (const entry of allOtherTimetables) {
      if (entry.teacherId) {
        if (!existingTeacherSchedule[entry.teacherId]) {
          existingTeacherSchedule[entry.teacherId] = []
        }
        existingTeacherSchedule[entry.teacherId].push({
          class: entry.class,
          day: entry.day,
          time: entry.time,
          subject: entry.subject,
        })
      }
    }
    
    // Check for clashes
    const clashes: Array<{ teacher: string; day: string; time: string; existingClass: string; newSubject: string; existingSubject: string }> = []
    
    for (const assignment of teacherAssignments) {
      const existingSchedule = existingTeacherSchedule[assignment.teacherId]
      if (existingSchedule) {
        for (const existing of existingSchedule) {
          if (existing.day === assignment.day && existing.time === assignment.timeSlot) {
            clashes.push({
              teacher: assignment.teacherName,
              day: assignment.day,
              time: assignment.timeSlot,
              existingClass: existing.class,
              newSubject: assignment.subject,
              existingSubject: existing.subject,
            })
          }
        }
      }
    }
    
    if (clashes.length > 0) {
      const clashMessages = clashes.map(c => 
        `${c.teacher} is already teaching ${c.existingSubject} in Class ${c.existingClass} on ${c.day} at ${c.time}`
      )
      return res.status(409).json({ 
        message: `Teacher clash detected:\n${clashMessages.join('\n')}`,
        clashes: clashes,
      })
    }
    
    // Delete existing timetable for this class
    await prisma.timetable.deleteMany({
      where: { class: classNum, type: 'regular' },
    })
    
    // Create new timetable entries with auto-assigned teachers
    const createdEntries = []
    
    for (const entry of timetable) {
      const teacherData = await getTeacherForSubject(classNum, entry.subject)
      
      const created = await prisma.timetable.create({
        data: {
          type: 'regular',
          class: classNum,
          day: entry.day,
          subject: entry.subject,
          time: entry.timeSlot,
          teacherId: teacherData.teacherId,
          teacherName: teacherData.teacherName,
        },
      })
      
      createdEntries.push(created)
    }
    
    // Notify students
    const profiles = await prisma.studentProfile.findMany({
      where: { className: { in: [`Class ${classNum}`, classNum] } },
      select: { userId: true },
    })
    
    for (const p of profiles) {
      await prisma.notice.create({
        data: {
          title: 'New Timetable Published',
          description: `Complete timetable for Class ${classNum} has been published. Check your schedule.`,
          type: 'timetable',
          userId: p.userId,
        },
      })
    }
    
    res.status(201).json({ 
      message: `Timetable saved successfully for Class ${classNum}`,
      entriesCreated: createdEntries.length,
    })
  } catch (err: any) {
    console.error('[POST /timetable/smart/save]', err)
    res.status(500).json({ message: err?.message })
  }
})

export default router
