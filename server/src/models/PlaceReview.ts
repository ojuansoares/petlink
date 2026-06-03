import mongoose, { Schema, Document } from 'mongoose'

export interface IPlaceReview extends Document {
  osmId: number
  osmType: string
  placeName: string
  placeAddress: string
  placeLat: number
  placeLng: number
  placeCategory: string | null
  authorId: string
  authorName: string
  rating: number
  comment: string | null
  createdAt: Date
}

const placeReviewSchema = new Schema<IPlaceReview>(
  {
    osmId:         { type: Number, required: true },
    osmType:       { type: String, required: true, enum: ['node', 'way', 'relation'] },
    placeName:     { type: String, required: true },
    placeAddress:  { type: String, required: true },
    placeLat:      { type: Number, required: true },
    placeLng:      { type: Number, required: true },
    placeCategory: { type: String, default: null },
    authorId:      { type: String, required: true },
    authorName:    { type: String, required: true },
    rating:        { type: Number, required: true, min: 1, max: 5 },
    comment:       { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: { virtuals: true, transform: transformId } }
)

placeReviewSchema.index({ osmId: 1, osmType: 1, createdAt: -1 })
placeReviewSchema.index({ osmId: 1, osmType: 1, authorId: 1 }, { unique: true })

function transformId(_doc: any, ret: any) {
  ret.id = ret._id.toString()
  delete ret._id
  delete ret.__v
  return ret
}

export const PlaceReview = mongoose.model<IPlaceReview>('PlaceReview', placeReviewSchema)
