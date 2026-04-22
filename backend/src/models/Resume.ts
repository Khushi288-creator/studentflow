import mongoose, { Schema, Document } from 'mongoose'

export interface IResume extends Document {
  userId: string
  headline: string
  summary: string
  skills: string
}

const ResumeSchema = new Schema<IResume>({
  userId: { type: String, required: true, unique: true },
  headline: { type: String, required: true },
  summary: { type: String, required: true },
  skills: { type: String, required: true },
})

export default mongoose.models.Resume || mongoose.model<IResume>('Resume', ResumeSchema)
