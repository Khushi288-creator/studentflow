import mongoose, { Schema, Document } from 'mongoose'

export interface IActivityAttendance extends Document {
  studentId: string
  activityId: string
  date: string
  status: string
  createdAt: Date
}

const ActivityAttendanceSchema = new Schema<IActivityAttendance>({
  studentId: { type: String, required: true },
  activityId: { type: String, required: true },
  date: { type: String, required: true },
  status: { type: String, default: 'present' },
}, { timestamps: { createdAt: true, updatedAt: false } })

ActivityAttendanceSchema.index({ studentId: 1, activityId: 1, date: 1 }, { unique: true })

export default mongoose.models.ActivityAttendance || mongoose.model<IActivityAttendance>('ActivityAttendance', ActivityAttendanceSchema)
