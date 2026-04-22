import mongoose, { Schema, Document } from 'mongoose'

export interface IActivityCertificate extends Document {
  studentId: string
  activityId: string
  issuedDate: string
  createdAt: Date
}

const ActivityCertificateSchema = new Schema<IActivityCertificate>({
  studentId: { type: String, required: true },
  activityId: { type: String, required: true },
  issuedDate: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.ActivityCertificate || mongoose.model<IActivityCertificate>('ActivityCertificate', ActivityCertificateSchema)
