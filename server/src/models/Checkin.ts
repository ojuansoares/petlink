import mongoose, { Schema, Document } from 'mongoose'

export interface ICheckin extends Document {
  locationId: mongoose.Types.ObjectId
  userId: string
  petId: string
  photoUrl: string | null
  content: string | null
  createdAt: Date
}

const checkinSchema = new Schema<ICheckin>(
  {
    locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    userId:     { type: String, required: true },
    petId:      { type: String, required: true },
    photoUrl:   { type: String, default: null },
    content:    { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: { virtuals: true, transform: transformId } }
)

checkinSchema.index({ locationId: 1, createdAt: -1 })
checkinSchema.index({ userId: 1 })

function transformId(_doc: any, ret: any) {
  ret.id = ret._id.toString()
  delete ret._id
  delete ret.__v
  return ret
}

export const Checkin = mongoose.model<ICheckin>('Checkin', checkinSchema)
