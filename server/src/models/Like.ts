import mongoose, { Schema, Document } from 'mongoose'

export interface ILike extends Document {
  postId: mongoose.Types.ObjectId
  userId: string
  createdAt: Date
}

const likeSchema = new Schema<ILike>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    userId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: { virtuals: true, transform: transformId } }
)

likeSchema.index({ postId: 1, userId: 1 }, { unique: true })

function transformId(_doc: any, ret: any) {
  ret.id = ret._id.toString()
  delete ret._id
  delete ret.__v
  return ret
}

export const Like = mongoose.model<ILike>('Like', likeSchema)
