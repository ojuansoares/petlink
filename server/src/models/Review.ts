import mongoose, { Schema, Document } from 'mongoose'

export interface IReview extends Document {
  locationId: mongoose.Types.ObjectId
  authorId: string
  authorName: string
  rating: number
  comment: string | null
  createdAt: Date
}

const reviewSchema = new Schema<IReview>(
  {
    locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    authorId:   { type: String, required: true },
    authorName: { type: String, required: true },
    rating:     { type: Number, required: true, min: 1, max: 5 },
    comment:    { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: { virtuals: true, transform: transformId } }
)

reviewSchema.index({ locationId: 1, createdAt: -1 })
reviewSchema.index({ locationId: 1, authorId: 1 }, { unique: true })

function transformId(_doc: any, ret: any) {
  ret.id = ret._id.toString()
  delete ret._id
  delete ret.__v
  return ret
}

export const Review = mongoose.model<IReview>('Review', reviewSchema)
