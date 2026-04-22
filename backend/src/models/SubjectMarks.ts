import mongoose, { Schema, Document } from 'mongoose'

// Teacher enters marks per student per subject per exam — stored as "pending"
export interface ISubjectMarks extends Document {
  examId: string
  studentUserId: string
  courseId: string
  teacherId: string     // userId of teacher who entered
  marks: number
  maxMarks: number
  status: 'pending' | 'verified'
  createdAt: Date
}

const SubjectMarksSchema = new Schema<ISubjectMarks>({
  examId:        { type: String, required: true },
  studentUserId: { type: String, required: true },
  courseId:      { type: String, required: true },
  teacherId:     { type: String, required: true },
  marks:         { type: Number, required: true, min: 0 },
  maxMarks:      { type: Number, required: true, default: 100 },
  status:        { type: String, enum: ['pending', 'verified'], default: 'pending' },
}, { timestamps: { createdAt: true, updatedAt: false } })

SubjectMarksSchema.index({ examId: 1, studentUserId: 1, courseId: 1 }, { unique: true })

export default mongoose.models.SubjectMarks || mongoose.model<ISubjectMarks>('SubjectMarks', SubjectMarksSchema)
