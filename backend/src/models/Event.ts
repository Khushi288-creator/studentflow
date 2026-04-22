import mongoose, { Schema, Document } from 'mongoose'

export interface IEvent extends Document {
  title: string
  date: Date
  description: string
  status: string
  time?: string
  targetClass: string
  createdAt: Date
}

const EventSchema = new Schema<IEvent>({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  description: { type: String, required: true },
  status: { type: String, default: 'upcoming' },
  time: String,
  targetClass: { type: String, default: 'All Classes' },
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema)
