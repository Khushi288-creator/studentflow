import mongoose, { Schema, Document } from 'mongoose'

export interface IStudyTask extends Document {
  userId: string
  title: string
  dueDate: Date
  createdAt: Date
}

const StudyTaskSchema = new Schema<IStudyTask>({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  dueDate: { type: Date, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.StudyTask || mongoose.model<IStudyTask>('StudyTask', StudyTaskSchema)
