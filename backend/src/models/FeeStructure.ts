import mongoose, { Schema, Document } from 'mongoose'

export interface IFeeStructure extends Document {
  className: string
  feeType: string
  amount: number
  dueDate?: string
  createdAt: Date
}

const FeeStructureSchema = new Schema<IFeeStructure>({
  className: { type: String, required: true },
  feeType: { type: String, default: 'tuition' },
  amount: { type: Number, required: true },
  dueDate: String,
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.FeeStructure || mongoose.model<IFeeStructure>('FeeStructure', FeeStructureSchema)
