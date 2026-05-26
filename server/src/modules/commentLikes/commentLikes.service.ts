import { commentLikesRepository } from './commentLikes.repository'

export const commentLikesService = {
  async toggle(commentId: string, userId: string) {
    return commentLikesRepository.toggle(commentId, userId)
  },

  async status(commentId: string, userId: string) {
    return commentLikesRepository.status(commentId, userId)
  },
}
