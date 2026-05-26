import { likesRepository } from './likes.repository'

export const likesService = {
  async toggle(postId: string, userId: string) {
    return likesRepository.toggle(postId, userId)
  },

  async status(postId: string, userId: string) {
    return likesRepository.status(postId, userId)
  },
}
