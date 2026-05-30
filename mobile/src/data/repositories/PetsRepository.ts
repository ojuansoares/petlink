import { offlineDatabase } from '../database'

type PetModelLike = any
type WeightRecordLike = any

let cachedWatermelonQ: any = null

function getWatermelonQ() {
  if (cachedWatermelonQ) return cachedWatermelonQ

  try {
    cachedWatermelonQ = require('@nozbe/watermelondb').Q
    return cachedWatermelonQ
  } catch {
    return null
  }
}

function wherePetId(petId: string) {
  const Q = getWatermelonQ()
  return Q ? Q.where('pet_id', petId) : null
}

export type PetWeightHistoryItem = {
  weight: number
  date: string
}

export type OfflinePet = {
  id: string
  owner_id: string
  name: string
  species: string
  breed: string | null
  birth_date: string | null
  weight_kg: number | null
  weight_history?: PetWeightHistoryItem[] | null
  photo_url: string | null
  allergies: string | null
  temperament: string | null
  observations: string | null
  tags: string[] | null
  is_active?: boolean
  created_at?: string
}

let memoryPets = new Map<string, OfflinePet>()

function getCollections() {
  if (!offlineDatabase) return null

  return {
    petsCollection: offlineDatabase.get('pets'),
    weightsCollection: offlineDatabase.get('pet_weight_records'),
  }
}

function toTimestamp(iso?: string): number {
  if (!iso) return Date.now()
  const ms = Date.parse(iso)
  return isNaN(ms) ? Date.now() : ms
}

async function findPetModelById(id: string): Promise<PetModelLike | null> {
  const collections = getCollections()
  if (!collections) return null

  try {
    return await collections.petsCollection.find(id)
  } catch {
    return null
  }
}

function buildWeightMap(records: WeightRecordLike[]) {
  const grouped = new Map<string, PetWeightHistoryItem[]>()

  records.forEach((record: WeightRecordLike) => {
    const list = grouped.get(record.petId) ?? []
    list.push({ weight: record.weight, date: record.recordedAt })
    grouped.set(record.petId, list)
  })

  grouped.forEach((list, key) => {
    list.sort((a, b) => a.date.localeCompare(b.date))
    grouped.set(key, list)
  })

  return grouped
}

function toOfflinePet(record: PetModelLike, weightMap: Map<string, PetWeightHistoryItem[]>): OfflinePet {
  return {
    id: record.id,
    owner_id: record.ownerId ?? '',
    name: record.name,
    species: record.species,
    breed: record.breed ?? null,
    birth_date: record.birthDate ?? null,
    weight_kg: record.weightKg ?? null,
    weight_history: weightMap.get(record.id) ?? [],
    photo_url: record.photoUrl ?? null,
    allergies: record.allergies ?? null,
    temperament: record.temperament ?? null,
    observations: record.observations ?? null,
    tags: record.tags ? record.tags.split(',') : [],
    is_active: record.isActive ?? undefined,
    created_at: record.createdAt ? new Date(record.createdAt).toISOString() : new Date().toISOString(),
  }
}

async function replaceWeightHistory(petId: string, history: PetWeightHistoryItem[] | null | undefined) {
  const collections = getCollections()
  if (!collections || !offlineDatabase) return

  const { weightsCollection } = collections
  const petIdFilter = wherePetId(petId)
  const current = petIdFilter
    ? await weightsCollection.query(petIdFilter).fetch()
    : (await weightsCollection.query().fetch()).filter((item: any) => item.petId === petId)
  const toDelete = current.map((item: any) => item.prepareDestroyPermanently())

  const toCreate = (history ?? []).map((item, index) =>
    weightsCollection.prepareCreate((record: any) => {
      record._raw.id = `${petId}-${index}-${item.date}`
      record.petId = petId
      record.weight = item.weight
      record.recordedAt = item.date
      record.source = 'remote'
      record.updatedAtLocal = Date.now()
    })
  )

  await offlineDatabase.batch(...toDelete, ...toCreate)
}

async function upsertPet(pet: OfflinePet) {
  const collections = getCollections()
  if (!collections) {
    memoryPets.set(pet.id, {
      ...pet,
      created_at: pet.created_at ?? new Date().toISOString(),
      weight_history: pet.weight_history ?? [],
    })
    return
  }

  const { petsCollection } = collections
  const existing = await findPetModelById(pet.id)

  if (existing) {
    await existing.update((record: any) => {
      record.ownerId = pet.owner_id ?? null
      record.name = pet.name
      record.species = pet.species
      record.breed = pet.breed ?? null
      record.birthDate = pet.birth_date ?? null
      record.weightKg = pet.weight_kg ?? null
      record.photoUrl = pet.photo_url ?? null
      record.allergies = pet.allergies ?? null
      record.temperament = pet.temperament ?? null
      record.observations = pet.observations ?? null
      record.tags = pet.tags ? pet.tags.join(',') : null
      record.isActive = pet.is_active ?? null
      record.createdAt = toTimestamp(pet.created_at)
      record.updatedAtRemote = new Date().toISOString()
      record.isDeletedLocal = false
    })
  } else {
    await petsCollection.create((record: any) => {
      record._raw.id = pet.id
      record.ownerId = pet.owner_id ?? null
      record.name = pet.name
      record.species = pet.species
      record.breed = pet.breed ?? null
      record.birthDate = pet.birth_date ?? null
      record.weightKg = pet.weight_kg ?? null
      record.photoUrl = pet.photo_url ?? null
      record.allergies = pet.allergies ?? null
      record.temperament = pet.temperament ?? null
      record.observations = pet.observations ?? null
      record.tags = pet.tags ? pet.tags.join(',') : null
      record.isActive = pet.is_active ?? null
      record.createdAt = toTimestamp(pet.created_at)
      record.updatedAtRemote = new Date().toISOString()
      record.isDeletedLocal = false
    })
  }

  await replaceWeightHistory(pet.id, pet.weight_history)
}

export const PetsRepository = {
  async getAllWithWeightHistory(): Promise<OfflinePet[]> {
    if (!offlineDatabase) {
      return Array.from(memoryPets.values()).sort((a: OfflinePet, b: OfflinePet) =>
        (b.created_at ?? '').localeCompare(a.created_at ?? '')
      )
    }

    const collections = getCollections()
    if (!collections) return []

    const { petsCollection, weightsCollection } = collections
    const [pets, weights] = await Promise.all([
      petsCollection.query().fetch(),
      weightsCollection.query().fetch(),
    ])

    const weightMap = buildWeightMap(weights)

    return pets
      .map((item: any) => toOfflinePet(item, weightMap))
      .sort((a: OfflinePet, b: OfflinePet) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  },

  async replaceAllFromRemote(remotePets: OfflinePet[]): Promise<void> {
    if (!offlineDatabase) {
      memoryPets = new Map(
        remotePets.map((pet) => [
          pet.id,
          {
            ...pet,
            created_at: pet.created_at ?? new Date().toISOString(),
            weight_history: pet.weight_history ?? [],
          },
        ])
      )
      return
    }

    const collections = getCollections()
    if (!collections) return

    const { petsCollection } = collections
    const existingPets = await petsCollection.query().fetch()
    const remoteIds = new Set(remotePets.map((item: OfflinePet) => item.id))

    await offlineDatabase.write(async () => {
      for (const pet of remotePets) {
        await upsertPet(pet)
      }

      const toDelete = existingPets
        .filter((pet: any) => !remoteIds.has(pet.id))
        .map((pet: any) => pet.prepareDestroyPermanently())

      if (toDelete.length > 0) {
        await offlineDatabase.batch(...toDelete)
      }
    })
  },

  async upsertFromRemote(remotePet: OfflinePet): Promise<void> {
    if (!offlineDatabase) {
      memoryPets.set(remotePet.id, {
        ...remotePet,
        created_at: remotePet.created_at ?? new Date().toISOString(),
        weight_history: remotePet.weight_history ?? [],
      })
      return
    }

    await offlineDatabase.write(async () => {
      await upsertPet(remotePet)
    })
  },

  async removeById(petId: string): Promise<void> {
    if (!offlineDatabase) {
      memoryPets.delete(petId)
      return
    }

    const collections = getCollections()
    if (!collections) return

    const { weightsCollection } = collections
    const pet = await findPetModelById(petId)
    if (!pet) return

    const petIdFilter = wherePetId(petId)
    const weights = petIdFilter
      ? await weightsCollection.query(petIdFilter).fetch()
      : (await weightsCollection.query().fetch()).filter((item: any) => item.petId === petId)

    await offlineDatabase.write(async () => {
      const toDelete = weights.map((item: any) => item.prepareDestroyPermanently())
      await offlineDatabase.batch(...toDelete, pet.prepareDestroyPermanently())
    })
  },
}
