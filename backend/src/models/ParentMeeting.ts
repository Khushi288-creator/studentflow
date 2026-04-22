import mongoose, { Schema, Document } from 'mongoose'

export interface IParentMeeting extends Document {
  parentId: string
  teacherId: string
  studentId: string
  date: string
  time: string
  status: string
  note?: string
  createdAt: Date
}

const ParentMeetingSchema = new Schema<IParentMeeting>({
  parentId: { type: String, required: true },
  teacherId: { type: String, required: true },
  studentId: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  status: { type: String, default: 'pending' },
  note: String,
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.ParentMeeting || mongoose.model<IParentMeeting>('ParentMeeting', ParentMeetingSchema)
