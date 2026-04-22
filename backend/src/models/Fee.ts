import mongoose, { Schema, Document } from 'mongoose'

export interface IFee extends Document {
  studentId: string
  amount: number
  paidAmount: number
  status: 'paid' | 'pending' | 'overdue'
  className?: string
  feeType: string
  description?: string
  dueDate?: string
  createdAt: Date
}

const FeeSchema = new Schema<IFee>({
  studentId: { type: String, required: true },
  amount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['paid', 'pending', 'overdue'], required: true },
  className: String,
  feeType: { type: String, default: 'tuition' },
  description: String,
  dueDate: String,
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.Fee || mongoose.model<IFee>('Fee', FeeSchema)
