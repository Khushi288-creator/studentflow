import mongoose, { Schema, Document } from 'mongoose'

export interface IPasswordResetToken extends Document {
  userId: string
  token: string
  expiresAt: Date
  usedAt?: Date
  createdAt: Date
}

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>({
  userId: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  usedAt: Date,
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.PasswordResetToken || mongoose.model<IPasswordResetToken>('PasswordResetToken', PasswordResetTokenSchema)
