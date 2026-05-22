import { AppError } from '../../shared/AppError'
import { postsRepository, type PostCreateInput } from './posts.repository'
import { petsRepository } from '../pets/pets.repository'
import { uploadsService } from '../uploads/uploads.service'
import { optimizePostUrls } from '../../shared/cloudinaryUtils'

export const postsService = {
  async create(authorId: string, payload: PostCreateInput) {
    if (!payload.image_url?.trim()) {
      throw new AppError('Imagem do post é obrigatória', 400)
    }
    if (!payload.pet_id) {
      throw new AppError('O post deve ser associado a um pet', 400)
    }

    const pet = await petsRepository.findByIdAndOwner(authorId, payload.pet_id)
    if (!pet) {
      throw new AppError('Pet não encontrado ou não pertence a você', 404)
    }

    const post = await postsRepository.create(authorId, {
      pet_id: payload.pet_id,
      image_url: payload.image_url,
      caption: payload.caption?.trim() || null,
      location: payload.location?.trim() || null,
    })

    return post
  },

  async getFeed(page = 1, limit = 20, random = false) {
    const result = await postsRepository.listFeed(page, limit, random)
    // Otimiza URLs para o contexto de feed (800px, auto-format, auto-quality)
    return { ...result, posts: optimizePostUrls(result.posts, 'feed') }
  },

  async getByAuthor(authorId: string, page = 1, limit = 12) {
    const result = await postsRepository.listByAuthor(authorId, page, limit)
    // Grid de perfil usa thumbnails (400×400 crop fill) — menor payload
    return { ...result, posts: optimizePostUrls(result.posts, 'thumb') }
  },

  async update(authorId: string, postId: string, patch: Partial<{ image_url: string; caption: string | null; location: string | null }>) {
    const current = await postsRepository.findByIdAndAuthor(authorId, postId)
    if (!current) {
      throw new AppError('Post não encontrado ou não pertence a você', 404)
    }

    const shouldDeleteOldPhoto = 
      patch.image_url !== undefined && 
      current.image_url && 
      current.image_url !== patch.image_url && 
      uploadsService.isManagedCloudinaryUrl(patch.image_url)

    const updated = await postsRepository.updateByIdAndAuthor(authorId, postId, {
      ...patch,
      caption: patch.caption !== undefined ? patch.caption?.trim() || null : undefined,
      location: patch.location !== undefined ? patch.location?.trim() || null : undefined,
    })

    if (!updated) {
      throw new AppError('Falha ao atualizar post', 500)
    }

    if (shouldDeleteOldPhoto) {
      try {
        await uploadsService.deleteImageByUrl(current.image_url)
      } catch {}
    }

    return updated
  },

  async delete(authorId: string, postId: string) {
    const current = await postsRepository.findByIdAndAuthor(authorId, postId)
    if (!current) {
      throw new AppError('Post não encontrado ou não pertence a você', 404)
    }

    await postsRepository.deleteByIdAndAuthor(authorId, postId)

    if (current.image_url) {
      try {
        await uploadsService.deleteImageByUrl(current.image_url)
      } catch {}
    }

    return true
  },

  async togglePin(authorId: string, postId: string) {
    const post = await postsRepository.findByIdAndAuthor(authorId, postId)
    if (!post) {
      throw new AppError('Post não encontrado ou não pertence a você', 404)
    }

    const currentPinStatus = post.is_pinned

    if (!currentPinStatus) {
      const pinCount = await postsRepository.countPinnedByAuthor(authorId)
      if (pinCount >= 3) {
        throw new AppError('Você já fixou o número máximo de posts (3)', 400)
      }
    }

    const newPinStatus = !currentPinStatus
    const updated = await postsRepository.updateByIdAndAuthor(authorId, postId, { is_pinned: newPinStatus })
    return updated
  },

  async getFollowed(followerId: string, page = 1, limit = 20) {
    const result = await postsRepository.listFollowed(followerId, page, limit)
    return { ...result, posts: optimizePostUrls(result.posts, 'feed') }
  }
}
