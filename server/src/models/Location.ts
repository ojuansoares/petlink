import mongoose, { Schema, Document } from 'mongoose'

export type LocationCategory = 'park' | 'petshop' | 'vet' | 'hotel' | 'beach' | 'other'

export interface ILocation extends Document {
  name: string
  category: LocationCategory
  description: string | null
  address: string
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
  photoUrl: string | null
  avgRating: number
  reviewsCount: number
  addedBy: string
  createdAt: Date
}

const locationSchema = new Schema<ILocation>(
  {
    name:     { type: String, required: true },
    category: { type: String, enum: ['park', 'petshop', 'vet', 'hotel', 'beach', 'other'], required: true },
    description: { type: String, default: null },
    address:  { type: String, required: true },
    geometry: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    photoUrl: { type: String, default: null },
    avgRating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    addedBy:  { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: { virtuals: true, transform: transformId } }
)

locationSchema.index({ geometry: '2dsphere' })
locationSchema.index({ name: 'text', category: 1 })

function transformId(_doc: any, ret: any) {
  ret.id = ret._id.toString()
  delete ret._id
  delete ret.__v
  return ret
}

export const Location = mongoose.model<ILocation>('Location', locationSchema)
