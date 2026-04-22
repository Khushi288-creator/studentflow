import mongoose, { Schema, Document } from 'mongoose'

export interface IAchievement extends Document {
  studentId: string
  title: string
  type: string
  rank?: string
  date?: string
  description?: string
  createdAt: Date
}

const AchievementSchema = new Schema<IAchievement>({
  studentId: { type: String, required: true },
  title: { type: String, required: true },
  type: { type: String, required: true },
  rank: String,
  date: String,
  description: String,
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.Achievement || mongoose.model<IAchievement>('Achievement', AchievementSchema)
