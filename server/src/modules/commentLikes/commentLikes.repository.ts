import { CommentLike } from '../../models/CommentLike'
import { Comment } from '../../models/Comment'

export const commentLikesRepository = {
  async toggle(commentId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
    const existing = await CommentLike.findOne({ commentId, userId })

    if (existing) {
      await CommentLike.deleteOne({ _id: existing._id })
      await Comment.findByIdAndUpdate(commentId, { $inc: { likesCount: -1 } })
      const comment = await Comment.findById(commentId).lean()
      return { liked: false, likesCount: comment?.likesCount ?? 0 }
    }

    await CommentLike.create({ commentId, userId })
    await Comment.findByIdAndUpdate(commentId, { $inc: { likesCount: 1 } })
    const comment = await Comment.findById(commentId).lean()
    return { liked: true, likesCount: comment?.likesCount ?? 0 }
  },

  async status(commentId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
    const [like, comment] = await Promise.all([
      CommentLike.findOne({ commentId, userId }).lean(),
      Comment.findById(commentId).lean(),
    ])
    return { liked: !!like, likesCount: comment?.likesCount ?? 0 }
  },
}
