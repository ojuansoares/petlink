import { offlineDatabase, isOfflineDbAvailable } from '../database'

const MAX_FEED_PHOTOS = 5
const MAX_PROFILE_PHOTOS = 6

export const offlinePostsRepository = {
  async saveFeedPhotos(posts: Array<{
    id: string
    image_url: string
    author_id: string
    pet_id: string | null
    caption: string | null
    location: string | null
    is_pinned: boolean
    created_at: string
    updated_at: string
    profiles?: { name: string; avatar_url: string | null; level: number }
    pets?: { name: string }
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
            record.petId = post.pet_id
            record.caption = post.caption
            record.location = post.location
            record.isPinned = post.is_pinned
            record.createdAt = post.created_at
            record.updatedAt = post.updated_at
            record.authorName = post.profiles?.name ?? null
            record.authorAvatarUrl = post.profiles?.avatar_url ?? null
            record.petName = post.pets?.name ?? null
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
      return records.map((r: any) => ({
        id: r.postId,
        image_url: r.imageUrl,
        author_id: r.authorId,
        pet_id: r.petId,
        caption: r.caption,
        location: r.location,
        is_pinned: r.isPinned,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
        profiles: r.authorName ? { name: r.authorName, avatar_url: r.authorAvatarUrl, level: 1 } : undefined,
        pets: r.petName ? { name: r.petName } : undefined,
      }))
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
    pets?: { name: string }
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
            record.petName = post.pets?.name ?? null
            record.caption = post.caption
            record.createdAt = post.created_at
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
        created_at: r.createdAt,
        is_pinned: r.isPinned,
        pets: r.petName ? { name: r.petName } : undefined,
      }))
    } catch (error) {
      console.log('[OFFLINE][ProfilePhotos][GET_ERROR]', error)
      return []
    }
  },
}