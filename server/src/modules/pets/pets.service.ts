import { AppError } from '../../shared/AppError'
import { petsRepository, type PetCreateInput } from './pets.repository'
import { uploadsService } from '../uploads/uploads.service'

export const petsService = {
  async createForOwner(ownerId: string, payload: Omit<PetCreateInput, 'pet_id' | 'owner_id'>) {
    const name = payload.name?.trim()
    const species = payload.species?.trim()
    if (!name) throw new AppError('Nome do pet é obrigatório', 400)
    if (!species) throw new AppError('Espécie do pet é obrigatória', 400)

    if (payload.weight_kg !== undefined && payload.weight_kg !== null && Number.isNaN(payload.weight_kg)) {
      throw new AppError('Peso inválido', 400)
    }

    const existing = await petsRepository.findByOwnerAndName(ownerId, name)
    if (existing) {
      throw new AppError('Você já tem um pet com esse nome', 409)
    }

    return petsRepository.create(ownerId, {
      ...payload,
      name,
      species,
    })
  },

  async listForOwner(ownerId: string) {
    return petsRepository.listByOwner(ownerId)
  },

  async getForOwner(ownerId: string, petId: string) {
    const pet = await petsRepository.findByIdAndOwner(ownerId, petId)
    if (!pet) throw new AppError('Pet não encontrado', 404)
    return pet
  },

  async updateForOwner(
    ownerId: string,
    petId: string,
    patch: Partial<{
      name: string
      species: string
      breed: string | null
      birth_date: string | null
      weight_kg: number | null
      photo_url: string | null
      allergies: string | null
      temperament: string | null
      observations: string | null
      is_active: boolean
    }>
  ) {
    const current = await petsRepository.findByIdAndOwner(ownerId, petId)
    if (!current) throw new AppError('Pet não encontrado', 404)

    if (patch.name !== undefined) {
      const name = patch.name.trim()
      if (!name) throw new AppError('Nome do pet é obrigatório', 400)
      const existing = await petsRepository.findByOwnerAndNameExcludingId(ownerId, name, petId)
      if (existing) throw new AppError('Você já tem um pet com esse nome', 409)
      patch.name = name
    }

    if (patch.species !== undefined) {
      const species = patch.species.trim()
      if (!species) throw new AppError('Espécie do pet é obrigatória', 400)
      patch.species = species
    }

    if (patch.weight_kg !== undefined && patch.weight_kg !== null && Number.isNaN(patch.weight_kg)) {
      throw new AppError('Peso inválido', 400)
    }

    const shouldDeleteOldPhoto =
      patch.photo_url !== undefined &&
      current.photo_url &&
      current.photo_url !== patch.photo_url &&
      uploadsService.isManagedCloudinaryUrl(patch.photo_url)

    const updated = await petsRepository.updateByIdAndOwner(ownerId, petId, patch)
    if (!updated) throw new AppError('Pet não encontrado', 404)

    if (shouldDeleteOldPhoto) {
      try {
        await uploadsService.deleteImageByUrl(current.photo_url)
      } catch {
        // Não bloqueia update do pet se limpeza do asset falhar.
      }
    }

    return updated
  },

  async deleteForOwner(ownerId: string, petId: string) {
    const current = await petsRepository.findByIdAndOwner(ownerId, petId)
    if (!current) throw new AppError('Pet não encontrado', 404)

    const deleted = await petsRepository.deleteCascadeByIdAndOwner(ownerId, petId)
    if (!deleted) {
      throw new AppError('Pet não encontrado', 404)
    }

    if (current.photo_url) {
      try {
        await uploadsService.deleteImageByUrl(current.photo_url)
      } catch {
        // Não bloqueia deleção do pet se limpeza do asset falhar.
      }
    }
  },
}

