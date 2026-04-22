import mongoose, { Schema, Document } from 'mongoose'

export interface IDoubt extends Document {
  userId: string
  studentId?: string
  subject?: string
  question: string
  status: 'open' | 'answered'
  teacherReply?: string
  createdAt: Date
}

const DoubtSchema = new Schema<IDoubt>({
  userId: { type: String, required: true },
  studentId: String,
  subject: String,
  question: { type: String, required: true },
  status: { type: String, enum: ['open', 'answered'], default: 'open' },
  teacherReply: String,
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.Doubt || mongoose.model<IDoubt>('Doubt', DoubtSchema)
