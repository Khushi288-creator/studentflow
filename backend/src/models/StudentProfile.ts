import mongoose, { Schema, Document } from 'mongoose'

export interface IStudentProfile extends Document {
  userId: string
  gender?: string
  fatherName?: string
  motherName?: string
  dob?: string
  religion?: string
  fatherOccupation?: string
  address?: string
  className?: string
  phone?: string
  photoUrl?: string
}

const StudentProfileSchema = new Schema<IStudentProfile>({
  userId: { type: String, required: true, unique: true },
  gender: String,
  fatherName: String,
  motherName: String,
  dob: String,
  religion: String,
  fatherOccupation: String,
  address: String,
  className: String,
  phone: String,
  photoUrl: String,
})

export default mongoose.models.StudentProfile || mongoose.model<IStudentProfile>('StudentProfile', StudentProfileSchema)
