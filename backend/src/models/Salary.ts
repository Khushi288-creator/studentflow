import mongoose, { Schema, Document } from 'mongoose'

export interface ISalary extends Document {
  teacherId: string
  month: number
  year: number
  baseSalary: number
  hra: number
  bonus: number
  leaveDeduction: number
  latePenalty: number
  netSalary: number
  status: string
  paidAt?: Date
  createdAt: Date
}

const SalarySchema = new Schema<ISalary>({
  teacherId: { type: String, required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  baseSalary: { type: Number, required: true },
  hra: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  leaveDeduction: { type: Number, default: 0 },
  latePenalty: { type: Number, default: 0 },
  netSalary: { type: Number, required: true },
  status: { type: String, default: 'pending' },
  paidAt: Date,
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.Salary || mongoose.model<ISalary>('Salary', SalarySchema)
