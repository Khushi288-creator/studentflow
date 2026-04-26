import mongoose, { Schema, Document } from 'mongoose'

export interface ITimetable extends Document {
  type: string       // 'regular' | 'exam'
  class: string      // '4' | '5' | '6' | '7' | '8'
  day: string        // 'Monday' | 'Tuesday' ... (for regular) or date (for exam)
  slotType: string   // 'prayer' | 'yoga' | 'period' | 'break' | 'pt'
  subject: string
  time: string
  teacherId?: string
  teacherName?: string
  date?: string      // for exam timetable
  createdAt: Date
}

const TimetableSchema = new Schema<ITimetable>({
  type:        { type: String, default: 'regular' },
  class:       { type: String, required: true },
  day:         { type: String, required: true },
  slotType:    { type: String, enum: ['prayer', 'yoga', 'period', 'break', 'pt'], default: 'period' },
  subject:     { type: String, required: true },
  time:        { type: String, required: true },
  teacherId:   String,
  teacherName: String,
  date:        String,
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.Timetable || mongoose.model<ITimetable>('Timetable', TimetableSchema)
