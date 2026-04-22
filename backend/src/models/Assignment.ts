import mongoose, { Schema, Document } from 'mongoose'

export interface IAssignment extends Document {
  courseId: string
  title: string
  description: string
  dueDate: Date
  createdAt: Date
}

const AssignmentSchema = new Schema<IAssignment>({
  courseId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  dueDate: { type: Date, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.Assignment || mongoose.model<IAssignment>('Assignment', AssignmentSchema)
