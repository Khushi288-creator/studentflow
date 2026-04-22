import mongoose, { Schema, Document } from 'mongoose'

export interface IClassSubject {
  name: string
  teacherId?: string
}

export interface IClassSubjects extends Document {
  class: number          // 4 to 8
  subjects: IClassSubject[]
}

const ClassSubjectsSchema = new Schema<IClassSubjects>({
  class: { type: Number, required: true, unique: true, min: 4, max: 8 },
  subjects: [{
    name:      { type: String, required: true },
    teacherId: { type: String, default: null },
  }],
})

export default mongoose.models.ClassSubjects ||
  mongoose.model<IClassSubjects>('ClassSubjects', ClassSubjectsSchema)
