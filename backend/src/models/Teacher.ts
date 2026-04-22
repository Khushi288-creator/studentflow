import mongoose, { Schema, Document } from 'mongoose'

export interface ITeacher extends Document {
  userId: string
  subject: string
  phone?: string
  address?: string
  bloodType?: string
  birthday?: string
  sex?: string
  photoUrl?: string
}

const TeacherSchema = new Schema<ITeacher>({
  userId: { type: String, required: true, unique: true },
  subject: { type: String, required: true },
  phone: String,
  address: String,
  bloodType: String,
  birthday: String,
  sex: String,
  photoUrl: String,
})

export default mongoose.models.Teacher || mongoose.model<ITeacher>('Teacher', TeacherSchema)
