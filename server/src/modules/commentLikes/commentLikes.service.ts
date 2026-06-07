import { commentLikesRepository } from './commentLikes.repository'
import { Comment } from '../../models/Comment'
import { Post } from '../../models/Post'
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

        const data: Record<string, unknown> = {
          screen: 'Post',
          postId: comment.postId,
          userId: comment.authorId,
        }
        try {
          const post = await Post.findById(comment.postId).lean()
          if (post?.groupId) data.groupId = post.groupId
        } catch {} // groupId é opcional no payload

        sendPush(
          comment.authorId,
          'social',
          'Nova curtida no comentário',
          `${profile?.name ?? 'Alguém'} curtiu seu comentário`,
          data,
        )
      }
    }

    return result
  },

  async status(commentId: string, userId: string) {
    return commentLikesRepository.status(commentId, userId)
  },
}
