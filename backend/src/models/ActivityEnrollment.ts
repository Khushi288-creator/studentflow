import mongoose, { Schema, Document } from 'mongoose'

export interface IActivityEnrollment extends Document {
  studentId: string
  activityId: string
  paymentStatus: string
  rating?: number
  createdAt: Date
}

const ActivityEnrollmentSchema = new Schema<IActivityEnrollment>({
  studentId: { type: String, required: true },
  activityId: { type: String, required: true },
  paymentStatus: { type: String, default: 'pending' },
  rating: Number,
}, { timestamps: { createdAt: true, updatedAt: false } })

ActivityEnrollmentSchema.index({ studentId: 1, activityId: 1 }, { unique: true })

export default mongoose.models.ActivityEnrollment || mongoose.model<IActivityEnrollment>('ActivityEnrollment', ActivityEnrollmentSchema)
