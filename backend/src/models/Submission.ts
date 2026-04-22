import mongoose, { Schema, Document } from 'mongoose'

export interface ISubmission extends Document {
  assignmentId: string
  studentId: string
  fileUrl: string
  marks?: number
  createdAt: Date
}

const SubmissionSchema = new Schema<ISubmission>({
  assignmentId: { type: String, required: true },
  studentId: { type: String, required: true },
  fileUrl: { type: String, required: true },
  marks: Number,
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.Submission || mongoose.model<ISubmission>('Submission', SubmissionSchema)
