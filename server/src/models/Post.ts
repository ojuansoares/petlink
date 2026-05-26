import mongoose, { Schema, Document } from 'mongoose'

export interface IPost extends Document {
  authorId: string
  petId: string
  imageUrl: string
  caption: string | null
  location: string | null
  isPinned: boolean
  likesCount: number
  commentsCount: number
  createdAt: Date
  updatedAt: Date
}

const postSchema = new Schema<IPost>(
  {
    authorId: { type: String, required: true },
    petId:    { type: String, required: true },
    imageUrl: { type: String, required: true },
    caption:  { type: String, default: null },
    location: { type: String, default: null },
    isPinned: { type: Boolean, default: false },
    likesCount:   { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true, transform: transformId } }
)

postSchema.index({ authorId: 1, isPinned: -1, createdAt: -1 })
postSchema.index({ createdAt: -1 })

function transformId(_doc: any, ret: any) {
  ret.id = ret._id.toString()
  delete ret._id
  delete ret.__v
  return ret
}

export const Post = mongoose.model<IPost>('Post', postSchema)
