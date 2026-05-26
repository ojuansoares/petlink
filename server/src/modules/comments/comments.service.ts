import { supabaseAdmin } from '../../config/supabase'
import { AppError } from '../../shared/AppError'
import { optimizeCloudinaryUrl } from '../../shared/cloudinaryUtils'
import { commentsRepository } from './comments.repository'
import { Post } from '../../models/Post'
import { sendPush } from '../push/push.service'

async function enrichWithProfiles(comments: any[]) {
  if (!comments.length) return comments
  const authorIds = [...new Set(comments.map((c: any) => c.authorId))]
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, name, avatar_url')
    .in('id', authorIds)
  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]))
  return comments.map((c: any) => ({
    ...c,
    username: profileMap.get(c.authorId)?.name ?? null,
    avatar_url: optimizeCloudinaryUrl(profileMap.get(c.authorId)?.avatar_url, 'avatar'),
  }))
}

export const commentsService = {
  async listByPost(postId: string, page = 1, limit = 10) {
    const { data, total } = await commentsRepository.listByPost(postId, page, limit)
    const enriched = await enrichWithProfiles(data)
    return { data: enriched, total, page, limit, hasMore: page * limit < total }
  },

  async create(postId: string, authorId: string, content: string) {
    if (!content?.trim()) throw new AppError('Conteúdo é obrigatório', 400)
    const comment = await commentsRepository.create(postId, authorId, content.trim())
    const enriched = await enrichWithProfiles([comment])
    const created = enriched[0] ?? comment

    const post = await Post.findById(postId).lean()
    if (post && post.authorId !== authorId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('name')
        .eq('id', authorId)
        .maybeSingle()

      sendPush(
        post.authorId,
        'social',
        'Novo comentário',
        `${profile?.name ?? 'Alguém'} comentou no seu post`,
        { screen: 'Post', postId },
      )
    }

    return created
  },

  async update(commentId: string, authorId: string, content: string) {
    if (!content?.trim()) throw new AppError('Conteúdo é obrigatório', 400)
    const comment = await commentsRepository.update(commentId, authorId, content)
    if (!comment) throw new AppError('Comentário não encontrado ou sem permissão', 404)
    const enriched = await enrichWithProfiles([comment])
    return enriched[0] ?? comment
  },

  async delete(commentId: string, userId: string) {
    const deleted = await commentsRepository.delete(commentId, userId)
    if (!deleted) throw new AppError('Comentário não encontrado ou sem permissão', 404)
  },

  async togglePin(commentId: string, postId: string, userId: string) {
    const result = await commentsRepository.togglePin(commentId, postId, userId)
    if (!result) throw new AppError('Comentário não encontrado ou sem permissão', 404)
    const enriched = await enrichWithProfiles([result])
    return enriched[0] ?? result
  },
}
