import mongoose, { Schema, Document } from 'mongoose'

export interface IHoliday extends Document {
  name: string
  date: string
  createdAt: Date
}

const HolidaySchema = new Schema<IHoliday>({
  name: { type: String, required: true },
  date: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.Holiday || mongoose.model<IHoliday>('Holiday', HolidaySchema)
