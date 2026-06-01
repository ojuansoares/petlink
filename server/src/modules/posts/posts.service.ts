import { AppError } from '../../shared/AppError'
import { postsRepository, type PostCreateInput } from './posts.repository'
import { petsRepository } from '../pets/pets.repository'
import { groupsRepository } from '../groups/groups.repository'
import { uploadsService } from '../uploads/uploads.service'
import { optimizePostUrls } from '../../shared/cloudinaryUtils'

function groupAndShuffleByDay(posts: any[]): any[] {
  const groups: Record<string, any[]> = {}
  for (const post of posts) {
    const day = post.created_at?.split('T')[0] || 'unknown'
    if (!groups[day]) groups[day] = []
    groups[day].push(post)
  }
  for (const day of Object.keys(groups)) {
    for (let i = groups[day].length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[groups[day][i], groups[day][j]] = [groups[day][j], groups[day][i]]
    }
  }
  const sortedDays = Object.keys(groups).sort((a, b) => b.localeCompare(a))
  return sortedDays.flatMap((day) => groups[day])
}

export const postsService = {
  async create(authorId: string, payload: PostCreateInput) {
    const isGroupPost = !!payload.group_id
    const petIds = payload.pet_ids?.filter(Boolean) ?? []

    if (isGroupPost) {
      if (!payload.caption?.trim() && !payload.image_url?.trim()) {
        throw new AppError('Adicione um texto ou uma foto para publicar', 400)
      }

      const membership = await groupsRepository.findMembership(payload.group_id!, authorId)
      if (!membership) {
        throw new AppError('Você não é membro deste grupo', 403)
      }

      for (const petId of petIds) {
        const pet = await petsRepository.findByIdAndOwner(authorId, petId)
        if (!pet) {
          throw new AppError('Pet não encontrado ou não pertence a você', 404)
        }
      }
    } else {
      if (!payload.image_url?.trim()) {
        throw new AppError('Imagem do post é obrigatória', 400)
      }
      if (petIds.length === 0) {
        throw new AppError('O post deve ser associado a pelo menos um pet', 400)
      }

      for (const petId of petIds) {
        const pet = await petsRepository.findByIdAndOwner(authorId, petId)
        if (!pet) {
          throw new AppError('Pet não encontrado ou não pertence a você', 404)
        }
      }
    }

    const post = await postsRepository.create(authorId, {
      pet_ids: petIds,
      image_url: payload.image_url,
      caption: payload.caption?.trim() || null,
      location: payload.location?.trim() || null,
      group_id: payload.group_id,
    })

    return post
  },

  async getFeed(currentUserId: string, page = 1, limit = 20) {
    const result = await postsRepository.listFeed(page, limit, currentUserId)
    return { ...result, posts: optimizePostUrls(groupAndShuffleByDay(result.posts), 'feed') }
  },

  async getByAuthor(targetUserId: string, page = 1, limit = 12, currentUserId?: string) {
    const result = await postsRepository.listByAuthor(targetUserId, page, limit, currentUserId)
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
    const result = await postsRepository.listFollowed(followerId, page, limit, followerId)
    return { ...result, posts: optimizePostUrls(groupAndShuffleByDay(result.posts), 'feed') }
  }
}
