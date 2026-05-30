import { offlineDatabase } from '../database'

type ProfileModelLike = any

export type OfflineUserProfile = {
  id: string
  name: string
  email: string | null
  location: string | null
  created_at: string
  avatar_url: string | null
  bio: string | null
  updated_at: string | null
  pets_count?: number
  birth_date: string | null
}

let memoryProfile: OfflineUserProfile | null = null

function getProfilesCollection() {
  if (!offlineDatabase) return null
  return offlineDatabase.get('user_profiles')
}

async function findProfileModelById(id: string): Promise<ProfileModelLike | null> {
  const collection = getProfilesCollection()
  if (!collection) return null

  try {
    return await collection.find(id)
  } catch {
    return null
  }
}

function toTimestamp(iso?: string | null): number {
  if (!iso) return Date.now()
  const ms = Date.parse(iso)
  return isNaN(ms) ? Date.now() : ms
}

function toIso(ts: number): string {
  return new Date(ts).toISOString()
}

function toOfflineProfile(record: ProfileModelLike): OfflineUserProfile {
  return {
    id: record.id,
    name: record.name,
    email: record.email ?? null,
    location: record.location ?? null,
    created_at: toIso(record.createdAt),
    avatar_url: record.avatarUrl ?? null,
    bio: record.bio ?? null,
    updated_at: record.updatedAt ? toIso(record.updatedAt) : null,
    pets_count: record.petsCount ?? 0,
    birth_date: record.birthDate ?? null,
  }
}

export const ProfileOfflineRepository = {
  async getCachedProfile(): Promise<OfflineUserProfile | null> {
    if (!offlineDatabase) return memoryProfile

    const collection = getProfilesCollection()
    if (!collection) return null

    const rows = await collection.query().fetch()
    if (!rows.length) return null

    return toOfflineProfile(rows[0])
  },

  async replaceFromRemote(profile: OfflineUserProfile): Promise<void> {
    if (!offlineDatabase) {
      memoryProfile = profile
      return
    }

    const collection = getProfilesCollection()
    if (!collection) return

    await offlineDatabase.write(async () => {
      const existing = await findProfileModelById(profile.id)

      if (existing) {
        await existing.update((record: any) => {
          record.name = profile.name
          record.email = profile.email ?? null
          record.location = profile.location ?? null
          record.createdAt = toTimestamp(profile.created_at)
          record.avatarUrl = profile.avatar_url ?? null
          record.bio = profile.bio ?? null
          record.updatedAt = toTimestamp(profile.updated_at)
          record.petsCount = profile.pets_count ?? 0
          record.birthDate = profile.birth_date ?? null
        })
      } else {
        await collection.create((record: any) => {
          record._raw.id = profile.id
          record.name = profile.name
          record.email = profile.email ?? null
          record.location = profile.location ?? null
          record.createdAt = toTimestamp(profile.created_at)
          record.avatarUrl = profile.avatar_url ?? null
          record.bio = profile.bio ?? null
          record.updatedAt = toTimestamp(profile.updated_at)
          record.petsCount = profile.pets_count ?? 0
          record.birthDate = profile.birth_date ?? null
        })
      }

      const all = await collection.query().fetch()
      const stale = all.filter((row: any) => row.id !== profile.id).map((row: any) => row.prepareDestroyPermanently())
      if (stale.length > 0) {
        await offlineDatabase.batch(...stale)
      }
    })
  },

  async clearCache(): Promise<void> {
    memoryProfile = null

    if (!offlineDatabase) return

    const collection = getProfilesCollection()
    if (!collection) return

    const all = await collection.query().fetch()
    if (!all.length) return

    await offlineDatabase.write(async () => {
      await offlineDatabase.batch(...all.map((row: any) => row.prepareDestroyPermanently()))
    })
  },
}
