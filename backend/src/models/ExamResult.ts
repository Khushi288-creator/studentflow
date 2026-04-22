import mongoose, { Schema, Document } from 'mongoose'

// Published result — created by exam_department after verifying all marks
export interface IExamResult extends Document {
  examId: string
  studentUserId: string
  subjects: {
    courseId: string
    courseName: string
    marks: number
    maxMarks: number
    grade: string
  }[]
  totalMarks: number
  maxTotalMarks: number
  percentage: number
  grade: string
  rank?: number
  status: 'published'
  publishedBy: string   // userId of exam_department
  publishedAt: Date
  createdAt: Date
}

const ExamResultSchema = new Schema<IExamResult>({
  examId:        { type: String, required: true },
  studentUserId: { type: String, required: true },
  subjects: [{
    courseId:   String,
    courseName: String,
    marks:      Number,
    maxMarks:   Number,
    grade:      String,
  }],
  totalMarks:    { type: Number, required: true },
  maxTotalMarks: { type: Number, required: true },
  percentage:    { type: Number, required: true },
  grade:         { type: String, required: true },
  rank:          Number,
  status:        { type: String, default: 'published' },
  publishedBy:   { type: String, required: true },
  publishedAt:   { type: Date, default: Date.now },
}, { timestamps: { createdAt: true, updatedAt: false } })

ExamResultSchema.index({ examId: 1, studentUserId: 1 }, { unique: true })

export default mongoose.models.ExamResult || mongoose.model<IExamResult>('ExamResult', ExamResultSchema)
