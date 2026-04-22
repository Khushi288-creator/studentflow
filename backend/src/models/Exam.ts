import mongoose, { Schema, Document } from 'mongoose'

export interface IExam extends Document {
  name: string          // e.g. "Mid-Term 2025"
  className: string     // e.g. "Class 8" or "All"
  subject: string       // single subject name (from ClassSubjects)
  subjects: string[]    // DEPRECATED: kept for backward compatibility with old exams
  startDate: string
  endDate: string
  time?: string         // optional time (e.g. "10:00 AM - 12:00 PM")
  status: 'upcoming' | 'ongoing' | 'completed'
  createdBy: string     // userId of exam_department
  createdAt: Date
}

const ExamSchema = new Schema<IExam>({
  name:      { type: String, required: true },
  className: { type: String, required: true },
  subject:   { type: String },  // new field for single subject
  subjects:  [{ type: String }], // kept for backward compatibility
  startDate: { type: String, required: true },
  endDate:   { type: String, required: true },
  time:      { type: String },  // optional time field
  status:    { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' },
  createdBy: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.Exam || mongoose.model<IExam>('Exam', ExamSchema)
