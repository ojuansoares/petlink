import { offlineDatabase, isOfflineDbAvailable } from '../database'

const MAX_FEED_PHOTOS = 5
const MAX_PROFILE_PHOTOS = 6

function normalizePets(pets: any): { name: string }[] {
  if (!pets) return []
  if (Array.isArray(pets)) return pets.filter((p: any) => p && p.name)
  if (pets.name) return [{ name: pets.name }]
  return []
}

function serializePetIds(pets: any): string {
  const arr = normalizePets(pets)
  if (arr.length === 0) return ''
  return JSON.stringify(arr.map(p => p.name))
}

function deserializePets(value: string | null): { name: string }[] | undefined {
  if (!value) return undefined
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.map((name: string) => ({ name: name.trim() })).filter((p: any) => p.name)
    }
  } catch {}
  return value.split(',').map(s => ({ name: s.trim() })).filter(p => p.name)
}

export const offlinePostsRepository = {
  async saveFeedPhotos(posts: Array<{
    id: string
    image_url: string
    author_id: string
    pet_id: string | null
    pet_ids?: string[]
    caption: string | null
    location: string | null
    is_pinned: boolean
    created_at: string
    updated_at: string
    profiles?: { name: string; avatar_url: string | null; level: number }
    pets?: { name: string }[] | { name: string }
  }>) {
    if (!isOfflineDbAvailable || !offlineDatabase) return

    try {
      await offlineDatabase.write(async () => {
        const collection = offlineDatabase.get('feed_photos')
        
        const existing = await collection.query().fetch()
        await offlineDatabase.batch(...existing.map((p: any) => p.prepareDestroyPermanently()))

        const postsToSave = posts.slice(0, MAX_FEED_PHOTOS)
        
        for (const post of postsToSave) {
          await collection.create((record: any) => {
            record._raw.id = `feed_${post.id}`
            record.postId = post.id
            record.imageUrl = post.image_url
            record.authorId = post.author_id
            record.petId = post.pet_ids ? JSON.stringify(post.pet_ids) : (post.pet_id ?? null)
            record.caption = post.caption
            record.location = post.location
            record.isPinned = post.is_pinned
            record.createdAt = Date.parse(post.created_at)
            record.updatedAt = Date.parse(post.updated_at)
            record.authorName = post.profiles?.name ?? null
            record.authorAvatarUrl = post.profiles?.avatar_url ?? null
            record.petName = serializePetIds(normalizePets(post.pets))
          })
        }
      })
    } catch (error) {
      console.log('[OFFLINE][FeedPhotos][ERROR]', error)
    }
  },

  async getFeedPhotos() {
    if (!isOfflineDbAvailable || !offlineDatabase) return []

    try {
      const collection = offlineDatabase.get('feed_photos')
      const records = await collection.query().fetch()
      return records.map((r: any) => {
        let petIds: string[] = []
        if (r.petId) {
          try {
            const parsed = JSON.parse(r.petId)
            if (Array.isArray(parsed)) petIds = parsed
          } catch {
            petIds = [r.petId]
          }
        }

        return {
          id: r.postId,
          image_url: r.imageUrl,
          author_id: r.authorId,
          pet_id: petIds[0] ?? null,
          pet_ids: petIds,
          caption: r.caption,
          location: r.location,
          is_pinned: r.isPinned,
          created_at: new Date(r.createdAt).toISOString(),
          updated_at: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
          profiles: r.authorName ? { name: r.authorName, avatar_url: r.authorAvatarUrl, level: 1 } : undefined,
          pets: deserializePets(r.petName),
        }
      })
    } catch (error) {
      console.log('[OFFLINE][FeedPhotos][GET_ERROR]', error)
      return []
    }
  },

  async saveProfilePhotos(userId: string, posts: Array<{
    id: string
    image_url: string
    pet_id: string | null
    caption: string | null
    created_at: string
    is_pinned: boolean
    pets?: { name: string }[] | { name: string }
  }>) {
    if (!isOfflineDbAvailable || !offlineDatabase) return

    try {
      await offlineDatabase.write(async () => {
        const collection = offlineDatabase.get('profile_photos')
        
        const existingQuery = collection.query()
        const existing = await existingQuery.fetch()
        const userPhotos = existing.filter((p: any) => p.userId === userId)
        await offlineDatabase.batch(...userPhotos.map((p: any) => p.prepareDestroyPermanently()))

        const postsToSave = posts.slice(0, MAX_PROFILE_PHOTOS)
        
        for (const post of postsToSave) {
          await collection.create((record: any) => {
            record._raw.id = `profile_${userId}_${post.id}`
            record.userId = userId
            record.postId = post.id
            record.imageUrl = post.image_url
            record.petName = serializePetIds(normalizePets(post.pets))
            record.caption = post.caption
            record.createdAt = Date.parse(post.created_at)
            record.isPinned = post.is_pinned
          })
        }
      })
    } catch (error) {
      console.log('[OFFLINE][ProfilePhotos][ERROR]', error)
    }
  },

  async getProfilePhotos(userId: string) {
    if (!isOfflineDbAvailable || !offlineDatabase) return []

    try {
      const collection = offlineDatabase.get('profile_photos')
      const allRecords = await collection.query().fetch()
      const userRecords = allRecords.filter((r: any) => r.userId === userId)
      
      return userRecords.map((r: any) => ({
        id: r.postId,
        image_url: r.imageUrl,
        pet_id: null,
        caption: r.caption,
        created_at: new Date(r.createdAt).toISOString(),
        is_pinned: r.isPinned,
        pets: deserializePets(r.petName),
      }))
    } catch (error) {
      console.log('[OFFLINE][ProfilePhotos][GET_ERROR]', error)
      return []
    }
  },
}