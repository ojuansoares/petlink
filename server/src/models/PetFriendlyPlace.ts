import mongoose, { Schema, Document } from 'mongoose'

export interface IPetFriendlyPlace extends Document {
  osmId: number
  osmType: string
  name: string
  address: string
  lat: number
  lng: number
  category: string
  addedBy: string
  createdAt: Date
}

const petFriendlyPlaceSchema = new Schema<IPetFriendlyPlace>(
  {
    osmId:    { type: Number, required: true },
    osmType:  { type: String, required: true, enum: ['node', 'way', 'relation'] },
    name:     { type: String, required: true },
    address:  { type: String, required: true },
    lat:      { type: Number, required: true },
    lng:      { type: Number, required: true },
    category: { type: String, required: true },
    addedBy:  { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: { virtuals: true, transform: transformId } }
)

petFriendlyPlaceSchema.index({ osmId: 1, osmType: 1, addedBy: 1 }, { unique: true })
petFriendlyPlaceSchema.index({ addedBy: 1 })

function transformId(_doc: any, ret: any) {
  ret.id = ret._id.toString()
  delete ret._id
  delete ret.__v
  return ret
}

export const PetFriendlyPlace = mongoose.model<IPetFriendlyPlace>('PetFriendlyPlace', petFriendlyPlaceSchema)
