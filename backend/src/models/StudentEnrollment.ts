import mongoose, { Schema, Document } from 'mongoose'

export interface IStudentEnrollment extends Document {
  userId: string
  courseId: string
  phone: string
  createdAt: Date
}

const StudentEnrollmentSchema = new Schema<IStudentEnrollment>({
  userId: { type: String, required: true },
  courseId: { type: String, required: true },
  phone: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

StudentEnrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true })

export default mongoose.models.StudentEnrollment || mongoose.model<IStudentEnrollment>('StudentEnrollment', StudentEnrollmentSchema)
