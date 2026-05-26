import mongoose, { Schema, Document } from 'mongoose'

export interface ICommentLike extends Document {
  commentId: mongoose.Types.ObjectId
  userId: string
  createdAt: Date
}

const commentLikeSchema = new Schema<ICommentLike>(
  {
    commentId: { type: Schema.Types.ObjectId, ref: 'Comment', required: true },
    userId:    { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: { virtuals: true, transform: transformId } }
)

commentLikeSchema.index({ commentId: 1, userId: 1 }, { unique: true })

function transformId(_doc: any, ret: any) {
  ret.id = ret._id.toString()
  delete ret._id
  delete ret.__v
  return ret
}

export const CommentLike = mongoose.model<ICommentLike>('CommentLike', commentLikeSchema)
