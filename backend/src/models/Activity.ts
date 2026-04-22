import mongoose, { Schema, Document } from 'mongoose'

export interface IActivity extends Document {
  name: string
  description: string
  duration: string
  fees: number
  scheduleDays: string
  scheduleTime?: string
  targetClass: string
  capacity?: number
  level: string
  batch: string
  icon: string
  createdAt: Date
}

const ActivitySchema = new Schema<IActivity>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: String, required: true },
  fees: { type: Number, required: true },
  scheduleDays: { type: String, required: true },
  scheduleTime: String,
  targetClass: { type: String, default: 'All Classes' },
  capacity: Number,
  level: { type: String, default: 'Beginner' },
  batch: { type: String, default: 'Morning' },
  icon: { type: String, default: '🎯' },
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.Activity || mongoose.model<IActivity>('Activity', ActivitySchema)
