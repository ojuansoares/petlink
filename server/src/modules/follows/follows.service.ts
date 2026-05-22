import { AppError } from '../../shared/AppError'
import { followsRepository } from './follows.repository'

export const followsService = {
  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new AppError('Não é possível seguir a si mesmo', 400)
    }
    const result = await followsRepository.create(followerId, followingId)
    // create returns null on duplicate (PK violation) – treat as already following
    if (!result) return { alreadyFollowing: true }
    return { alreadyFollowing: false }
  },

  async unfollow(followerId: string, followingId: string) {
    await followsRepository.delete(followerId, followingId)
    return true
  },

  async isFollowing(followerId: string, followingId: string) {
    const exists = await followsRepository.exists(followerId, followingId)
    return { isFollowing: exists }
  },

  async getFollowers(userId: string, limit = 20, offset = 0) {
    return await followsRepository.listFollowers(userId, limit, offset)
  },

  async getFollowing(userId: string, limit = 20, offset = 0) {
    return await followsRepository.listFollowing(userId, limit, offset)
  },
}
