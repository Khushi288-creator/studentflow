import mongoose, { Schema, Document } from 'mongoose'

export interface IAttendance extends Document {
  studentId: string
  courseId: string
  date: Date
  status: 'present' | 'absent' | 'late'
  createdAt: Date
}

const AttendanceSchema = new Schema<IAttendance>({
  studentId: { type: String, required: true },
  courseId: { type: String, required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent', 'late'], required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

AttendanceSchema.index({ studentId: 1, courseId: 1, date: 1 }, { unique: true })

export default mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema)
