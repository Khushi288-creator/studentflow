import mongoose, { Schema, Document } from 'mongoose'

export interface IEventRegistration extends Document {
  eventId: string
  userId: string
  createdAt: Date
}

const EventRegistrationSchema = new Schema<IEventRegistration>({
  eventId: { type: String, required: true },
  userId: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

EventRegistrationSchema.index({ eventId: 1, userId: 1 }, { unique: true })

export default mongoose.models.EventRegistration || mongoose.model<IEventRegistration>('EventRegistration', EventRegistrationSchema)
