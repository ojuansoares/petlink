import { Comment } from '../../models/Comment'
import { CommentLike } from '../../models/CommentLike'
import { Post } from '../../models/Post'
import { mapId } from '../../shared/mapId'

export const commentsRepository = {
  async listByPost(postId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      Comment.find({ postId })
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Comment.countDocuments({ postId }),
    ])
    return { data: data.map(mapId), total }
  },

  async create(postId: string, authorId: string, content: string) {
    const comment = await Comment.create({ postId, authorId, content })

    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } })

    return comment.toJSON()
  },

  async delete(commentId: string, userId: string) {
    const comment = await Comment.findById(commentId).lean()
    if (!comment) return null

    const post = await Post.findById(comment.postId).lean()
    const isPostOwner = post?.authorId === userId
    const isCommentAuthor = comment.authorId === userId

    if (!isCommentAuthor && !isPostOwner) return null

    await Promise.all([
      Comment.deleteOne({ _id: commentId }),
      CommentLike.deleteMany({ commentId }),
      Post.findByIdAndUpdate(comment.postId, { $inc: { commentsCount: -1 } }),
    ])

    return comment
  },

  async update(commentId: string, authorId: string, content: string) {
    const comment = await Comment.findOneAndUpdate(
      { _id: commentId, authorId },
      { $set: { content: content.trim() } },
      { new: true }
    ).lean()
    if (!comment) return null
    return mapId(comment)
  },

  async togglePin(commentId: string, postId: string, userId: string) {
    const post = await Post.findById(postId).lean()
    if (!post || post.authorId !== userId) return null

    const comment = await Comment.findById(commentId).lean()
    if (!comment) return null

    const newPin = !comment.isPinned
    await Comment.findByIdAndUpdate(commentId, { $set: { isPinned: newPin } })
    return { ...comment, isPinned: newPin }
  },
}
