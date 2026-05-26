import mongoose, { Schema, Document } from 'mongoose'

export interface IComment extends Document {
  postId: mongoose.Types.ObjectId
  authorId: string
  content: string
  createdAt: Date
}

const commentSchema = new Schema<IComment>(
  {
    postId:   { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    authorId: { type: String, required: true },
    content:  { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: { virtuals: true, transform: transformId } }
)

commentSchema.index({ postId: 1, createdAt: -1 })

function transformId(_doc: any, ret: any) {
  ret.id = ret._id.toString()
  delete ret._id
  delete ret.__v
  return ret
}

export const Comment = mongoose.model<IComment>('Comment', commentSchema)
