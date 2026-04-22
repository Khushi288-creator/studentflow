import mongoose, { Schema, Document } from 'mongoose'

export interface ITimetable extends Document {
  type: string
  class: string
  subject: string
  date?: string
  time: string
  teacherId?: string
  createdAt: Date
}

const TimetableSchema = new Schema<ITimetable>({
  type: { type: String, default: 'regular' },
  class: { type: String, required: true },
  subject: { type: String, required: true },
  date: String,
  time: { type: String, required: true },
  teacherId: String,
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.Timetable || mongoose.model<ITimetable>('Timetable', TimetableSchema)
