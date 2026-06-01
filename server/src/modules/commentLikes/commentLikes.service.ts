import { commentLikesRepository } from './commentLikes.repository'
import { Comment } from '../../models/Comment'
import { supabaseAdmin } from '../../config/supabase'
import { sendPush } from '../push/push.service'

export const commentLikesService = {
  async toggle(commentId: string, userId: string) {
    const result = await commentLikesRepository.toggle(commentId, userId)

    if (result.liked) {
      const comment = await Comment.findById(commentId).lean()
      if (comment && comment.authorId !== userId) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('name')
          .eq('id', userId)
          .maybeSingle()

        sendPush(
          comment.authorId,
          'social',
          'Nova curtida no comentário',
          `${profile?.name ?? 'Alguém'} curtiu seu comentário`,
          { screen: 'Post', postId: comment.postId, userId: comment.authorId },
        )
      }
    }

    return result
  },

  async status(commentId: string, userId: string) {
    return commentLikesRepository.status(commentId, userId)
  },
}
