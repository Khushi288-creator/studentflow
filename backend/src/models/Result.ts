import mongoose, { Schema, Document } from 'mongoose'

export interface IResult extends Document {
  studentId: string
  courseId: string
  marks: number
  grade: string
  createdAt: Date
}

const ResultSchema = new Schema<IResult>({
  studentId: { type: String, required: true },
  courseId: { type: String, required: true },
  marks: { type: Number, required: true },
  grade: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

ResultSchema.index({ studentId: 1, courseId: 1 }, { unique: true })

export default mongoose.models.Result || mongoose.model<IResult>('Result', ResultSchema)
