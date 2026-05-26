import mongoose, { Schema, Document } from 'mongoose'

export interface IConsultationMedia extends Document {
  consultationId: string
  type: 'photo' | 'color'
  value: string
  createdAt: Date
}

const consultationMediaSchema = new Schema<IConsultationMedia>(
  {
    consultationId: { type: String, required: true, unique: true },
    type:           { type: String, enum: ['photo', 'color'], required: true },
    value:          { type: String, required: true },
  },
  { timestamps: true }
)

export const ConsultationMedia = mongoose.model<IConsultationMedia>('ConsultationMedia', consultationMediaSchema)
