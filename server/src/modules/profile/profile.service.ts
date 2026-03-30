import { profileRepository } from './profile.repository'
import { AppError } from '../../shared/AppError'
import { uploadsService } from '../uploads/uploads.service'

export const profileService = {
  async getMe(userId: string) {
    const profile = await profileRepository.findById(userId)
    if (!profile) throw new AppError('Perfil não encontrado', 404)
    return profile
  },

  async updateMe(userId: string, patch: { name?: string; location?: string | null; avatar_url?: string | null; bio?: string | null }) {
    // `profiles.name` é NOT NULL: se vier undefined, não atualiza.
    if (patch.name !== undefined && patch.name.trim().length === 0) {
      throw new AppError('Nome inválido', 400)
    }

    const current = await profileRepository.findById(userId)
    if (!current) throw new AppError('Perfil não encontrado', 404)

    const shouldDeleteOldAvatar =
      patch.avatar_url !== undefined &&
      current.avatar_url &&
      current.avatar_url !== patch.avatar_url &&
      uploadsService.isManagedCloudinaryUrl(patch.avatar_url)

    const updated = await profileRepository.updateById(userId, patch)

    if (shouldDeleteOldAvatar) {
      try {
        await uploadsService.deleteImageByUrl(current.avatar_url)
      } catch {
        // Não bloqueia atualização de perfil se limpeza do asset falhar.
      }
    }

    return updated
  },
}

