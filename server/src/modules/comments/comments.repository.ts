import { Comment } from '../../models/Comment'
import { Post } from '../../models/Post'
import { mapId } from '../../shared/mapId'

export const commentsRepository = {
  async listByPost(postId: string) {
    const data = await Comment.find({ postId })
      .sort({ createdAt: -1 })
      .lean()
    return data.map(mapId)
  },

  async create(postId: string, authorId: string, content: string) {
    const comment = await Comment.create({ postId, authorId, content })

    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } })

    return comment.toJSON()
  },

  async delete(commentId: string, authorId: string) {
    const comment = await Comment.findOneAndDelete({ _id: commentId, authorId })

    if (comment) {
      await Post.findByIdAndUpdate(comment.postId, { $inc: { commentsCount: -1 } })
    }

    return comment
  },
}
