import mongoose, { Schema, Document } from 'mongoose'

export interface IParentProfile extends Document {
  userId: string
  phone?: string
  photoUrl?: string
  studentId?: string
}

const ParentProfileSchema = new Schema<IParentProfile>({
  userId: { type: String, required: true, unique: true },
  phone: String,
  photoUrl: String,
  studentId: String,
})

export default mongoose.models.ParentProfile || mongoose.model<IParentProfile>('ParentProfile', ParentProfileSchema)
