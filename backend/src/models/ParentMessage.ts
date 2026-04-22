import mongoose, { Schema, Document } from 'mongoose'

export interface IParentMessage extends Document {
  parentId: string
  teacherId: string
  senderId: string
  text: string
  createdAt: Date
}

const ParentMessageSchema = new Schema<IParentMessage>({
  parentId: { type: String, required: true },
  teacherId: { type: String, required: true },
  senderId: { type: String, required: true },
  text: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.ParentMessage || mongoose.model<IParentMessage>('ParentMessage', ParentMessageSchema)
