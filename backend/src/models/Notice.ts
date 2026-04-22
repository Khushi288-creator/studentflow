import mongoose, { Schema, Document } from 'mongoose'

export interface INotice extends Document {
  title: string
  description: string
  date: Date
  type: string
  userId?: string
}

const NoticeSchema = new Schema<INotice>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, default: Date.now },
  type: { type: String, default: 'notice' },
  userId: String,
})

export default mongoose.models.Notice || mongoose.model<INotice>('Notice', NoticeSchema)
