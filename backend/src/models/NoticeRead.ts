import mongoose, { Schema, Document } from 'mongoose'

export interface INoticeRead extends Document {
  noticeId: string
  userId: string
  readAt: Date
}

const NoticeReadSchema = new Schema<INoticeRead>({
  noticeId: { type: String, required: true },
  userId: { type: String, required: true },
  readAt: { type: Date, default: Date.now },
})

NoticeReadSchema.index({ noticeId: 1, userId: 1 }, { unique: true })

export default mongoose.models.NoticeRead || mongoose.model<INoticeRead>('NoticeRead', NoticeReadSchema)
