import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  id: string
  uniqueId?: string
  name: string
  email: string
  password: string
  role: 'student' | 'teacher' | 'admin' | 'parent'
  createdAt: Date
}

const UserSchema = new Schema<IUser>({
  uniqueId: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher', 'admin', 'parent', 'exam_department'], required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
