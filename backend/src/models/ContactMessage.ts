import mongoose, { Schema, Document } from 'mongoose'

export interface IContactMessage extends Document {
  userId?: string
  name: string
  email: string
  message: string
  teacherId?: string
  category: string
  senderRole: string
  status: string
  adminReply?: string
  createdAt: Date
}

const ContactMessageSchema = new Schema<IContactMessage>({
  userId: String,
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  teacherId: String,
  category: { type: String, default: 'general' },
  senderRole: { type: String, default: 'student' },
  status: { type: String, default: 'pending' },
  adminReply: String,
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.ContactMessage || mongoose.model<IContactMessage>('ContactMessage', ContactMessageSchema)
