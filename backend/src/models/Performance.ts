import mongoose, { Schema, Document } from 'mongoose'

export interface IPerformance extends Document {
  studentId: string
  subject: string
  marks: number
  examName: string
  createdAt: Date
}

const PerformanceSchema = new Schema<IPerformance>({
  studentId: { type: String, required: true },
  subject: { type: String, required: true },
  marks: { type: Number, required: true },
  examName: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.Performance || mongoose.model<IPerformance>('Performance', PerformanceSchema)
