import mongoose, { Schema, Document } from 'mongoose'

export interface IExam extends Document {
  name: string          // e.g. "Mid-Term 2025"
  className: string     // e.g. "Class 8" or "All"
  subjects: string[]    // subject/course IDs
  startDate: string
  endDate: string
  status: 'upcoming' | 'ongoing' | 'completed'
  createdBy: string     // userId of exam_department
  createdAt: Date
}

const ExamSchema = new Schema<IExam>({
  name:      { type: String, required: true },
  className: { type: String, required: true },
  subjects:  [{ type: String }],
  startDate: { type: String, required: true },
  endDate:   { type: String, required: true },
  status:    { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' },
  createdBy: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.Exam || mongoose.model<IExam>('Exam', ExamSchema)
