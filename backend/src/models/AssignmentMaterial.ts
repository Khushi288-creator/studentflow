import mongoose, { Schema, Document } from 'mongoose'

export interface IAssignmentMaterial extends Document {
  assignmentId: string
  fileUrl: string
  createdAt: Date
}

const AssignmentMaterialSchema = new Schema<IAssignmentMaterial>({
  assignmentId: { type: String, required: true },
  fileUrl: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.AssignmentMaterial || mongoose.model<IAssignmentMaterial>('AssignmentMaterial', AssignmentMaterialSchema)
