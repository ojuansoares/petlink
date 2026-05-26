import { Like } from '../../models/Like'
import { Post } from '../../models/Post'
import { mapId } from '../../shared/mapId'

export const likesRepository = {
  async toggle(postId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
    const existing = await Like.findOne({ postId, userId })

    if (existing) {
      await Like.deleteOne({ _id: existing._id })
      await Post.findByIdAndUpdate(postId, { $inc: { likesCount: -1 } })
      const post = await Post.findById(postId).lean()
      return { liked: false, likesCount: post?.likesCount ?? 0 }
    }

    await Like.create({ postId, userId })
    await Post.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } })
    const post = await Post.findById(postId).lean()
    return { liked: true, likesCount: post?.likesCount ?? 0 }
  },

  async status(postId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
    const [like, post] = await Promise.all([
      Like.findOne({ postId, userId }).lean(),
      Post.findById(postId).lean(),
    ])
    return { liked: !!like, likesCount: post?.likesCount ?? 0 }
  },

  async countByPost(postId: string): Promise<number> {
    const post = await Post.findById(postId).lean()
    return post?.likesCount ?? 0
  },
}
