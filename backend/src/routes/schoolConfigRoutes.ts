import express from 'express'
import { z } from 'zod'
import { authenticateJWT, requireRole } from '../middleware/auth'
import SchoolConfigModel from '../models/SchoolConfig'

const router = express.Router()

// ── helpers ────────────────────────────────────────────────────────────────

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
 * Calculate period schedule with prayer and break.
 * Structure:
 * 1. Prayer: Fixed 30 minutes at start
 * 2. Periods 1-3: After prayer
 * 3. Break: Fixed 30 minutes after period 3
 * 4. Remaining periods: After break until end time
 */
function calculatePeriods(
  startTime: string, 
  endTime: string, 
  prayerDuration: number, 
  breakDuration: number,
  breakAfterPeriod: number
) {
  const totalMinutes = toMinutes(endTime) - toMinutes(startTime)
  const netMinutes = totalMinutes - prayerDuration - breakDuration

  // Calculate period duration and count
  // Aim for 40-minute periods
  let periodCount = Math.floor(netMinutes / 40)
  if (periodCount < 4) periodCount = 4 // minimum 4 periods
  if (periodCount > 8) periodCount = 8 // maximum 8 periods
  
  const periodDuration = Math.floor(netMinutes / periodCount)

  // Build period schedule
  const periods: { 
    type: string; 
    label: string; 
    startTime: string; 
    endTime: string; 
    periodNumber?: number 
  }[] = []
  
  let cursor = toMinutes(startTime)

  // 1. Prayer (fixed at start)
  periods.push({
    type: 'prayer',
    label: 'Prayer',
    startTime: toTimeStr(cursor),
    endTime: toTimeStr(cursor + prayerDuration),
  })
  cursor += prayerDuration

  // 2. Periods before break
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

    // 3. Insert break after specified period
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

  return { totalMinutes, netMinutes, periodCount, periodDuration, periods }
}

/** Ensure a default config exists in MongoDB */
async function ensureDefault() {
  const existing = await SchoolConfigModel.findOne({ key: 'default' })
  if (existing) return existing

  const calc = calculatePeriods('07:20', '12:20', 30, 30, 3)
  return SchoolConfigModel.create({
    key: 'default',
    startTime: '07:20',
    endTime: '12:20',
    prayerDuration: 30,
    breakDuration: 30,
    breakAfterPeriod: 3,
    ...calc,
  })
}

// ── GET /school-config — all authenticated users can read ─────────────────
router.get('/school-config', authenticateJWT, async (_req, res) => {
  try {
    const config = await ensureDefault()
    res.json({ config })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ── PUT /school-config — admin only ──────────────────────────────────────
router.put('/school-config', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const schema = z.object({
      startTime:        z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:MM'),
      endTime:          z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:MM'),
      prayerDuration:   z.number().int().min(0).max(60).default(30),
      breakDuration:    z.number().int().min(0).max(60).default(30),
      breakAfterPeriod: z.number().int().min(1).max(8).default(3),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const { startTime, endTime, prayerDuration, breakDuration, breakAfterPeriod } = parsed.data

    // Validate time range
    if (toMinutes(endTime) <= toMinutes(startTime)) {
      return res.status(400).json({ message: 'End time must be after start time' })
    }
    const totalTime = toMinutes(endTime) - toMinutes(startTime)
    if (totalTime < prayerDuration + breakDuration + 40) {
      return res.status(400).json({ message: 'School day too short for prayer, break, and at least one period' })
    }

    const calc = calculatePeriods(startTime, endTime, prayerDuration, breakDuration, breakAfterPeriod)

    const config = await SchoolConfigModel.findOneAndUpdate(
      { key: 'default' },
      { $set: { startTime, endTime, prayerDuration, breakDuration, breakAfterPeriod, ...calc } },
      { upsert: true, new: true }
    )

    res.json({ config, message: 'School timing updated successfully' })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

export default router
