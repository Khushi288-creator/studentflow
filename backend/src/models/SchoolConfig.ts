import mongoose, { Schema, Document } from 'mongoose'

export interface ISchoolConfig extends Document {
  key: string          // always 'default' — singleton pattern
  
  // Weekday timing (Mon-Fri)
  weekdayStartTime: string    // e.g. "07:20"
  weekdayEndTime: string      // e.g. "12:20"
  
  // Saturday timing
  saturdayStartTime: string   // e.g. "07:20"
  saturdayEndTime: string     // e.g. "11:00"
  
  // Fixed durations
  prayerDuration: number      // minutes, e.g. 30 (fixed at start)
  breakDuration: number       // minutes, e.g. 30
  breakAfterPeriod: number    // break after N periods, e.g. 3
  yogaDuration: number        // minutes, e.g. 30 (Saturday only)
  
  // Weekday schedule
  weekdayPeriods: {
    type: string       // "prayer" | "period" | "break"
    label: string      // "Prayer", "Period 1", "Break", etc.
    startTime: string  // "07:20"
    endTime: string    // "07:50"
    periodNumber?: number // 1, 2, 3... (only for type="period")
  }[]
  
  // Saturday schedule
  saturdayPeriods: {
    type: string       // "prayer" | "yoga" | "period" | "break"
    label: string      // "Prayer", "Yoga", "Period 1", "Break", etc.
    startTime: string  // "07:20"
    endTime: string    // "07:50"
    periodNumber?: number // 1, 2, 3... (only for type="period")
  }[]
  
  // Subject rules
  subjectRules: {
    mainSubjects: string[]      // Must appear 3+ times/week
    secondarySubjects: string[] // 1-2 times/week
    ptRequired: boolean         // PT exactly 1 time/week
  }
  
  updatedAt: Date
}

const PeriodSchema = new Schema({
  type:         { type: String, required: true, enum: ['prayer', 'yoga', 'period', 'break', 'pt'] },
  label:        { type: String, required: true },
  startTime:    { type: String, required: true },
  endTime:      { type: String, required: true },
  periodNumber: { type: Number },
}, { _id: false })

const SubjectRulesSchema = new Schema({
  mainSubjects:      [{ type: String }],
  secondarySubjects: [{ type: String }],
  ptRequired:        { type: Boolean, default: true },
}, { _id: false })

const SchoolConfigSchema = new Schema<ISchoolConfig>({
  key:                 { type: String, default: 'default', unique: true },
  weekdayStartTime:    { type: String, required: true, default: '07:20' },
  weekdayEndTime:      { type: String, required: true, default: '12:20' },
  saturdayStartTime:   { type: String, required: true, default: '07:20' },
  saturdayEndTime:     { type: String, required: true, default: '11:00' },
  prayerDuration:      { type: Number, required: true, default: 30 },
  breakDuration:       { type: Number, required: true, default: 30 },
  breakAfterPeriod:    { type: Number, required: true, default: 3 },
  yogaDuration:        { type: Number, required: true, default: 30 },
  weekdayPeriods:      [PeriodSchema],
  saturdayPeriods:     [PeriodSchema],
  subjectRules:        { type: SubjectRulesSchema, default: () => ({
    mainSubjects: ['Mathematics', 'Science', 'English', 'Hindi', 'Gujarati'],
    secondarySubjects: ['Drawing', 'General Knowledge', 'Computer'],
    ptRequired: true,
  })},
}, { timestamps: { createdAt: false, updatedAt: true } })

export default mongoose.models.SchoolConfig ||
  mongoose.model<ISchoolConfig>('SchoolConfig', SchoolConfigSchema)
