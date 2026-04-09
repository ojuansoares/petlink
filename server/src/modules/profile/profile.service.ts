import { profileRepository } from './profile.repository'
import { AppError } from '../../shared/AppError'
import { uploadsService } from '../uploads/uploads.service'

export const profileService = {
  async getMe(userId: string) {
    const profile = await profileRepository.findById(userId)
    if (!profile) throw new AppError('Perfil não encontrado', 404)
    return profile
  },

  async updateMe(userId: string, patch: { name?: string; location?: string | null; avatar_url?: string | null; bio?: string | null; birth_date?: string | null }) {
    // `profiles.name` é NOT NULL: se vier undefined, não atualiza.
    if (patch.name !== undefined && patch.name.trim().length === 0) {
      throw new AppError('Nome inválido', 400)
    }

    // Validar idade mínima de 13 anos (se birth_date vier no patch)
    if (patch.birth_date) {
      const birth = new Date(patch.birth_date)
      const today = new Date()
      const age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      const dayDiff = today.getDate() - birth.getDate()
      const realAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age
      if (realAge < 13) {
        throw new AppError('Você precisa ter pelo menos 13 anos', 400)
      }
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

