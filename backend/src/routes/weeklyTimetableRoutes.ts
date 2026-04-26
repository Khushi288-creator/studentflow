import express from 'express'
import { z } from 'zod'
import { authenticateJWT, requireRole } from '../middleware/auth'
import TimetableModel from '../models/Timetable'
import SchoolConfigModel from '../models/SchoolConfig'
import ClassSubjectsModel from '../models/ClassSubjects'
import UserModel from '../models/User'

const router = express.Router()

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Convert "HH:MM" to total minutes from midnight */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Convert total minutes from midnight back to "HH:MM" */
function toTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Generate period schedule for a given day
 */
function generateDaySchedule(
  startTime: string,
  endTime: string,
  prayerDuration: number,
  breakDuration: number,
  breakAfterPeriod: number,
  yogaDuration?: number,
  includeYoga: boolean = false
) {
  const totalMinutes = toMinutes(endTime) - toMinutes(startTime)
  let netMinutes = totalMinutes - prayerDuration - breakDuration
  
  if (includeYoga && yogaDuration) {
    netMinutes -= yogaDuration
  }
  
  // Calculate period count and duration
  let periodCount = Math.floor(netMinutes / 40)
  if (periodCount < 3) periodCount = 3
  if (periodCount > 8) periodCount = 8
  
  const periodDuration = Math.floor(netMinutes / periodCount)
  
  const periods: any[] = []
  let cursor = toMinutes(startTime)
  
  // 1. Prayer (fixed at start)
  periods.push({
    type: 'prayer',
    label: 'Prayer',
    startTime: toTimeStr(cursor),
    endTime: toTimeStr(cursor + prayerDuration),
  })
  cursor += prayerDuration
  
  // 2. Yoga (Saturday only, after prayer)
  if (includeYoga && yogaDuration) {
    periods.push({
      type: 'yoga',
      label: 'Yoga',
      startTime: toTimeStr(cursor),
      endTime: toTimeStr(cursor + yogaDuration),
    })
    cursor += yogaDuration
  }
  
  // 3. Teaching periods with break
  for (let i = 1; i <= periodCount; i++) {
    const pStart = cursor
    const pEnd = cursor + periodDuration
    periods.push({
      type: 'period',
      label: `Period ${i}`,
      startTime: toTimeStr(pStart),
      endTime: toTimeStr(pEnd),
      periodNumber: i,
    })
    cursor = pEnd
    
    // Insert break after specified period
    if (i === breakAfterPeriod && breakDuration > 0) {
      periods.push({
        type: 'break',
        label: 'Break',
        startTime: toTimeStr(cursor),
        endTime: toTimeStr(cursor + breakDuration),
      })
      cursor += breakDuration
    }
  }
  
  return periods
}

// ── GET /weekly-timetable/config — get weekly schedule configuration ──────
router.get('/weekly-timetable/config', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    let config = await SchoolConfigModel.findOne({ key: 'default' })
    
    // Create default if not exists
    if (!config) {
      const weekdayPeriods = generateDaySchedule('07:20', '12:20', 30, 30, 3)
      const saturdayPeriods = generateDaySchedule('07:20', '11:00', 30, 30, 3, 30, true)
      
      config = await SchoolConfigModel.create({
        key: 'default',
        weekdayStartTime: '07:20',
        weekdayEndTime: '12:20',
        saturdayStartTime: '07:20',
        saturdayEndTime: '11:00',
        prayerDuration: 30,
        breakDuration: 30,
        breakAfterPeriod: 3,
        yogaDuration: 30,
        weekdayPeriods,
        saturdayPeriods,
        subjectRules: {
          mainSubjects: ['Mathematics', 'Science', 'English', 'Hindi', 'Gujarati'],
          secondarySubjects: ['Drawing', 'General Knowledge', 'Computer'],
          ptRequired: true,
        },
      })
    }
    
    res.json({ config })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ── PUT /weekly-timetable/config — update weekly configuration ────────────
router.put('/weekly-timetable/config', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const schema = z.object({
      weekdayStartTime:    z.string().regex(/^\d{2}:\d{2}$/),
      weekdayEndTime:      z.string().regex(/^\d{2}:\d{2}$/),
      saturdayStartTime:   z.string().regex(/^\d{2}:\d{2}$/),
      saturdayEndTime:     z.string().regex(/^\d{2}:\d{2}$/),
      prayerDuration:      z.number().int().min(0).max(60),
      breakDuration:       z.number().int().min(0).max(60),
      breakAfterPeriod:    z.number().int().min(1).max(8),
      yogaDuration:        z.number().int().min(0).max(60),
      subjectRules:        z.object({
        mainSubjects:      z.array(z.string()),
        secondarySubjects: z.array(z.string()),
        ptRequired:        z.boolean(),
      }).optional(),
    })
    
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message })
    }
    
    const data = parsed.data
    
    // Generate schedules
    const weekdayPeriods = generateDaySchedule(
      data.weekdayStartTime,
      data.weekdayEndTime,
      data.prayerDuration,
      data.breakDuration,
      data.breakAfterPeriod
    )
    
    const saturdayPeriods = generateDaySchedule(
      data.saturdayStartTime,
      data.saturdayEndTime,
      data.prayerDuration,
      data.breakDuration,
      data.breakAfterPeriod,
      data.yogaDuration,
      true
    )
    
    const config = await SchoolConfigModel.findOneAndUpdate(
      { key: 'default' },
      {
        $set: {
          ...data,
          weekdayPeriods,
          saturdayPeriods,
        },
      },
      { upsert: true, new: true }
    )
    
    res.json({ config, message: 'Weekly schedule updated successfully' })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ── GET /weekly-timetable/structure — get weekly structure for class ──────
router.get('/weekly-timetable/structure', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const config = await SchoolConfigModel.findOne({ key: 'default' })
    if (!config) {
      return res.status(404).json({ message: 'School configuration not found' })
    }
    
    // Build weekly structure
    const weeklyStructure: Record<string, any[]> = {}
    
    for (const day of DAYS) {
      const isSaturday = day === 'Saturday'
      const periods = isSaturday ? config.saturdayPeriods : config.weekdayPeriods
      
      weeklyStructure[day] = periods.map((p: any) => ({
        type: p.type,
        label: p.label,
        startTime: p.startTime,
        endTime: p.endTime,
        timeSlot: `${p.startTime} - ${p.endTime}`,
        periodNumber: p.periodNumber,
        isEditable: p.type === 'period', // Only periods are editable
      }))
    }
    
    res.json({
      weeklyStructure,
      subjectRules: config.subjectRules,
      days: DAYS,
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ── GET /weekly-timetable/class/:class — get existing weekly timetable ────
router.get('/weekly-timetable/class/:class', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const classNum = req.params.class as string
    
    // Get all timetable entries for this class
    const entries = await TimetableModel.find({
      class: classNum,
      type: 'regular',
    }).lean()
    
    // Group by day and time
    const timetableMap: Record<string, Record<string, any>> = {}
    
    for (const entry of entries) {
      if (!timetableMap[entry.day]) {
        timetableMap[entry.day] = {}
      }
      timetableMap[entry.day][entry.time] = {
        id: entry._id.toString(),
        subject: entry.subject,
        slotType: entry.slotType,
        teacherId: entry.teacherId,
        teacherName: entry.teacherName,
      }
    }
    
    res.json({ timetable: timetableMap })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ── POST /weekly-timetable/save — save complete weekly timetable ──────────
router.post('/weekly-timetable/save', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const schema = z.object({
      class: z.string().min(1),
      timetable: z.array(z.object({
        day: z.string().min(1),
        timeSlot: z.string().min(1),
        subject: z.string().min(1),
        slotType: z.string().optional(),
      })),
    })
    
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message })
    }
    
    const { class: classNum, timetable } = parsed.data
    
    // Get config for validation
    const config = await SchoolConfigModel.findOne({ key: 'default' })
    if (!config) {
      return res.status(404).json({ message: 'School configuration not found' })
    }
    
    // Validation 1: Check subject frequency rules
    const subjectCount: Record<string, number> = {}
    const subjectPerDay: Record<string, Record<string, number>> = {}
    let ptCount = 0
    
    for (const entry of timetable) {
      // Count total occurrences
      subjectCount[entry.subject] = (subjectCount[entry.subject] || 0) + 1
      
      // Count per day
      if (!subjectPerDay[entry.day]) {
        subjectPerDay[entry.day] = {}
      }
      subjectPerDay[entry.day][entry.subject] = (subjectPerDay[entry.day][entry.subject] || 0) + 1
      
      // Count PT
      if (entry.subject.toLowerCase().includes('physical') || entry.subject.toLowerCase() === 'pt') {
        ptCount++
      }
    }
    
    // Check main subjects (must appear 3+ times)
    const mainSubjects = config.subjectRules?.mainSubjects || []
    for (const subject of mainSubjects) {
      const count = subjectCount[subject] || 0
      if (count < 3) {
        return res.status(400).json({
          message: `Main subject "${subject}" must appear at least 3 times per week. Currently: ${count} times.`,
        })
      }
    }
    
    // Check PT requirement
    if (config.subjectRules?.ptRequired && ptCount !== 1) {
      return res.status(400).json({
        message: `Physical Training must appear exactly 1 time per week. Currently: ${ptCount} times.`,
      })
    }
    
    // Check daily repetition (max 2 per day)
    for (const [day, subjects] of Object.entries(subjectPerDay)) {
      for (const [subject, count] of Object.entries(subjects)) {
        if (count > 2) {
          return res.status(400).json({
            message: `Subject "${subject}" appears ${count} times on ${day}. Maximum 2 per day allowed.`,
          })
        }
      }
    }
    
    // Validation 2: Check teacher clashes
    const teacherAssignments: Array<{
      teacherId: string
      teacherName: string
      subject: string
      day: string
      timeSlot: string
    }> = []
    
    // Get teacher for each subject
    const classSubjects = await ClassSubjectsModel.findOne({ class: parseInt(classNum) })
    
    for (const entry of timetable) {
      if (classSubjects) {
        const subjectData = classSubjects.subjects.find(
          (s: any) => s.name.toLowerCase() === entry.subject.toLowerCase()
        )
        
        if (subjectData && subjectData.teacherId) {
          const teacher = await UserModel.findById(subjectData.teacherId)
          if (teacher) {
            teacherAssignments.push({
              teacherId: subjectData.teacherId,
              teacherName: teacher.name,
              subject: entry.subject,
              day: entry.day,
              timeSlot: entry.timeSlot,
            })
          }
        }
      }
    }
    
    // Check for clashes with other classes
    const allOtherTimetables = await TimetableModel.find({
      class: { $ne: classNum },
      type: 'regular',
    }).lean()
    
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
    
    // Detect clashes
    const clashes: any[] = []
    
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
    await TimetableModel.deleteMany({
      class: classNum,
      type: 'regular',
    })
    
    // Create new timetable entries
    const createdEntries = []
    
    for (const entry of timetable) {
      let teacherId: string | undefined
      let teacherName: string | undefined
      
      if (classSubjects) {
        const subjectData = classSubjects.subjects.find(
          (s: any) => s.name.toLowerCase() === entry.subject.toLowerCase()
        )
        
        if (subjectData && subjectData.teacherId) {
          const teacher = await UserModel.findById(subjectData.teacherId)
          if (teacher) {
            teacherId = subjectData.teacherId
            teacherName = teacher.name
          }
        }
      }
      
      const created = await TimetableModel.create({
        type: 'regular',
        class: classNum,
        day: entry.day,
        subject: entry.subject,
        slotType: entry.slotType || 'period',
        time: entry.timeSlot,
        teacherId,
        teacherName,
      })
      
      createdEntries.push(created)
    }
    
    res.status(201).json({
      message: `Weekly timetable saved successfully for Class ${classNum}`,
      entriesCreated: createdEntries.length,
    })
  } catch (err: any) {
    console.error('[POST /weekly-timetable/save]', err)
    res.status(500).json({ message: err?.message })
  }
})

export default router
