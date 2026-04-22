import mongoose, { Schema, Document } from 'mongoose'

export interface IActivityFaculty extends Document {
  name: string
  activityId: string
  salaryType: string
  salaryAmount: number
  createdAt: Date
}

const ActivityFacultySchema = new Schema<IActivityFaculty>({
  name: { type: String, required: true },
  activityId: { type: String, required: true },
  salaryType: { type: String, default: 'fixed' },
  salaryAmount: { type: Number, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.ActivityFaculty || mongoose.model<IActivityFaculty>('ActivityFaculty', ActivityFacultySchema)
