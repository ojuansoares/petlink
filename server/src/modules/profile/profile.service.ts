import { profileRepository } from './profile.repository'
import { AppError } from '../../shared/AppError'
import { uploadsService } from '../uploads/uploads.service'
import { petsRepository } from '../pets/pets.repository'
import { supabaseAdmin } from '../../config/supabase'

async function attachEmail<T extends Record<string, any>>(userId: string, profile: T): Promise<T & { email: string | null }> {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (error) throw new AppError(error.message, 500)

  return {
    ...profile,
    email: data.user?.email ?? null,
  }
}

export const profileService = {
  async getMe(userId: string) {
    const profile = await profileRepository.findById(userId)
    if (!profile) throw new AppError('Perfil não encontrado', 404)
    return attachEmail(userId, profile)
  },

  async getPublicProfile(userId: string) {
    const profile = await profileRepository.findPublicById(userId)
    if (!profile) throw new AppError('Perfil não encontrado', 404)
    return profile
  },

  async updateMe(userId: string, patch: { name?: string; location?: string | null; avatar_url?: string | null; bio?: string | null; birth_date?: string | null }) {
    if (patch.name !== undefined && patch.name.trim().length === 0) {
      throw new AppError('Nome inválido', 400)
    }

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
      }
    }

    return attachEmail(userId, updated)
  },

  async deleteMe(userId: string) {
    const profile = await profileRepository.findById(userId)
    const pets = await petsRepository.listByOwner(userId)

    for (const pet of pets) {
      const deleted = await petsRepository.deleteCascadeByIdAndOwner(userId, pet.id)
      if (!deleted) continue

      if (pet.photo_url) {
        try {
          await uploadsService.deleteImageByUrl(pet.photo_url)
        } catch {
        }
      }
    }

    if (profile?.avatar_url) {
      try {
        await uploadsService.deleteImageByUrl(profile.avatar_url)
      } catch {
      }
    }

    await profileRepository.deleteById(userId)

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) {
      throw new AppError(error.message, 500)
    }
  },
}

