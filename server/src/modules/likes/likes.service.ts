import { supabaseAdmin } from '../../config/supabase'
import { optimizeCloudinaryUrl } from '../../shared/cloudinaryUtils'
import { likesRepository } from './likes.repository'
import { Post } from '../../models/Post'
import { sendPush } from '../push/push.service'

export const likesService = {
  async toggle(postId: string, userId: string) {
    const result = await likesRepository.toggle(postId, userId)

    if (result.liked) {
      const post = await Post.findById(postId).lean()
      if (post && post.authorId !== userId) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('name')
          .eq('id', userId)
          .maybeSingle()

        sendPush(
          post.authorId,
          'social',
          'Nova curtida',
          `${profile?.name ?? 'Alguém'} curtiu seu post`,
          { screen: 'Post', postId, userId: post.authorId },
        )
      }
    }

    return result
  },

  async status(postId: string, userId: string) {
    return likesRepository.status(postId, userId)
  },

  async listByPost(postId: string, page = 1, limit = 10) {
    const { data, total } = await likesRepository.listByPost(postId, page, limit)
    if (!data.length) return { data, total, page, limit, hasMore: false }

    const userIds = [...new Set(data.map((l: any) => l.userId))]
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, name, avatar_url, level')
      .in('id', userIds)

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]))

    const enriched = data.map((like: any) => ({
      ...like,
      username: profileMap.get(like.userId)?.name ?? null,
      avatar_url: optimizeCloudinaryUrl(profileMap.get(like.userId)?.avatar_url, 'avatar'),
      level: profileMap.get(like.userId)?.level ?? 1,
    }))
    return { data: enriched, total, page, limit, hasMore: page * limit < total }
  },
}
