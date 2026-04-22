import mongoose, { Schema, Document } from 'mongoose'

export interface ICourse extends Document {
  name: string
  teacherId: string
}

const CourseSchema = new Schema<ICourse>({
  name: { type: String, required: true },
  teacherId: { type: String, required: true },
})

export default mongoose.models.Course || mongoose.model<ICourse>('Course', CourseSchema)
