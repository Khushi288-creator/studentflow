import mongoose, { Schema, Document } from 'mongoose'

export interface IAttendanceQrToken extends Document {
  courseId: string
  token: string
  attendanceDate: Date
  expiresAt: Date
  createdAt: Date
}

const AttendanceQrTokenSchema = new Schema<IAttendanceQrToken>({
  courseId: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  attendanceDate: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.AttendanceQrToken || mongoose.model<IAttendanceQrToken>('AttendanceQrToken', AttendanceQrTokenSchema)
