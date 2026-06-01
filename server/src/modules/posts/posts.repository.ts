import { Post, IPost } from '../../models/Post'
import { Like } from '../../models/Like'
import { supabaseAdmin } from '../../config/supabase'
import { mapId } from '../../shared/mapId'

export type PostCreateInput = {
  pet_ids?: string[]
  image_url?: string
  caption?: string | null
  location?: string | null
  group_id?: string
}

type ProfileInfo = { name: string; avatar_url: string | null; level: number }
type PetInfo = { name: string }

export type EnrichedPost = {
  id: string
  author_id: string
  pet_id: string | null
  pet_ids: string[]
  image_url: string
  caption: string | null
  location: string | null
  is_pinned: boolean
  likes_count: number
  comments_count: number
  created_at: string
  updated_at: string
  group_id?: string
  profiles: ProfileInfo | null
  pets: PetInfo[]
  liked_by_user: boolean
}

async function enrichWithProfilesAndPets(
  docs: any[],
  currentUserId?: string,
  authorField: string = 'authorId',
  petField: string = 'petId'
): Promise<EnrichedPost[]> {
  if (docs.length === 0) return []

  const authorIds = [...new Set(docs.map((d) => d[authorField]))]

  const allPetIds = [...new Set(docs.flatMap((d) => {
    const ids = d.petIds || (d.petId ? [d.petId] : [])
    return ids.filter(Boolean)
  }))]

  const postIds = docs.map((d) => d._id)

  const [profilesRes, petsRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, name, avatar_url, level').in('id', authorIds),
    supabaseAdmin.from('pets').select('id, name').in('id', allPetIds),
  ])

  const profileMap = new Map<string, ProfileInfo>()
  for (const p of profilesRes.data ?? []) {
    profileMap.set(p.id, { name: p.name, avatar_url: p.avatar_url, level: p.level ?? 1 })
  }

  const petMap = new Map<string, PetInfo>()
  for (const p of petsRes.data ?? []) {
    petMap.set(p.id, { name: p.name })
  }

  let likedSet = new Set<string>()
  if (currentUserId) {
    const likes = await Like.find({ postId: { $in: postIds }, userId: currentUserId }).lean()
    for (const l of likes) {
      likedSet.add(l.postId.toString())
    }
  }

  return docs.map((doc) => {
    const m = mapId(doc)
    const petIds = m.petIds || (m.petId ? [m.petId] : [])
    const pets = petIds.map((id: string) => petMap.get(id)).filter(Boolean) as PetInfo[]
    return {
      id: m.id,
      author_id: m.authorId,
      pet_id: m.petId ?? null,
      pet_ids: petIds,
      image_url: m.imageUrl,
      caption: m.caption,
      location: m.location,
      is_pinned: m.isPinned,
      likes_count: m.likesCount ?? 0,
      comments_count: m.commentsCount ?? 0,
      created_at: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
      updated_at: m.updatedAt instanceof Date ? m.updatedAt.toISOString() : m.updatedAt,
      group_id: m.groupId ?? undefined,
      profiles: profileMap.get(m.authorId) ?? null,
      pets,
      liked_by_user: likedSet.has(m.id),
    }
  })
}

export const postsRepository = {
  async create(authorId: string, input: PostCreateInput) {
    const petIds = input.pet_ids?.filter(Boolean) ?? []
    const doc = await Post.create({
      authorId,
      petIds: petIds.length > 0 ? petIds : undefined,
      imageUrl: input.image_url ?? undefined,
      caption: input.caption ?? null,
      location: input.location ?? null,
      groupId: input.group_id ?? undefined,
    })

    const enriched = await enrichWithProfilesAndPets([doc.toObject()])
    return enriched[0]
  },

  async findById(postId: string): Promise<EnrichedPost | null> {
    const doc = await Post.findById(postId).lean()
    if (!doc) return null
    const enriched = await enrichWithProfilesAndPets([doc])
    return enriched[0]
  },

  async listFeed(page: number, limit: number, currentUserId?: string) {
    const skip = (page - 1) * limit
    const query = { groupId: { $exists: false } }
    const total = await Post.countDocuments(query)
    if (total === 0) return { posts: [], hasMore: false }

    const docs = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const hasMore = skip + limit < total
    const posts = await enrichWithProfilesAndPets(docs, currentUserId)
    return { posts, hasMore }
  },

  async listByAuthor(authorId: string, page: number, limit: number, currentUserId?: string) {
    const skip = (page - 1) * limit
    const authorQuery = { authorId, groupId: { $exists: false } }

    const [docs, total] = await Promise.all([
      Post.find(authorQuery).sort({ isPinned: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Post.countDocuments(authorQuery),
    ])

    const hasMore = skip + limit < total
    const posts = await enrichWithProfilesAndPets(docs, currentUserId)
    return { posts, hasMore }
  },

  async listByGroup(groupId: string, page: number, limit: number, currentUserId?: string) {
    const skip = (page - 1) * limit

    const [docs, total] = await Promise.all([
      Post.find({ groupId }).sort({ isPinned: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Post.countDocuments({ groupId }),
    ])

    const hasMore = skip + limit < total
    const posts = await enrichWithProfilesAndPets(docs, currentUserId)
    return { posts, hasMore }
  },

  async findByIdAndAuthor(authorId: string, postId: string) {
    const doc = await Post.findOne({ _id: postId, authorId }).lean()
    if (!doc) return null
    const enriched = await enrichWithProfilesAndPets([doc])
    return enriched[0]
  },

  async updateByIdAndAuthor(
    authorId: string,
    postId: string,
    patch: Partial<{
      image_url: string
      caption: string | null
      location: string | null
      is_pinned: boolean
    }>
  ) {
    const mongoPatch: Record<string, any> = {}
    if (patch.image_url !== undefined) mongoPatch.imageUrl = patch.image_url
    if (patch.caption !== undefined) mongoPatch.caption = patch.caption
    if (patch.location !== undefined) mongoPatch.location = patch.location
    if (patch.is_pinned !== undefined) mongoPatch.isPinned = patch.is_pinned

    const doc = await Post.findOneAndUpdate(
      { _id: postId, authorId },
      { $set: mongoPatch },
      { returnDocument: 'after' }
    ).lean()

    if (!doc) return null
    const enriched = await enrichWithProfilesAndPets([doc])
    return enriched[0]
  },

  async deleteByIdAndAuthor(authorId: string, postId: string) {
    await Post.findOneAndDelete({ _id: postId, authorId })
  },

  async findByIdInGroup(postId: string, groupId: string) {
    const doc = await Post.findOne({ _id: postId, groupId }).lean()
    if (!doc) return null
    const enriched = await enrichWithProfilesAndPets([doc])
    return enriched[0]
  },

  async countPinnedByAuthor(authorId: string): Promise<number> {
    return Post.countDocuments({ authorId, isPinned: true })
  },

  async countPinnedByGroup(groupId: string): Promise<number> {
    return Post.countDocuments({ groupId, isPinned: true })
  },

  async togglePinInGroup(postId: string, groupId: string): Promise<EnrichedPost | null> {
    const doc = await Post.findOne({ _id: postId, groupId }).lean()
    if (!doc) return null

    const newPinStatus = !doc.isPinned
    const updated = await Post.findOneAndUpdate(
      { _id: postId, groupId },
      { $set: { isPinned: newPinStatus } },
      { returnDocument: 'after' }
    ).lean()

    if (!updated) return null
    const enriched = await enrichWithProfilesAndPets([updated])
    return enriched[0]
  },

  async listFollowed(followerId: string, page: number, limit: number, currentUserId?: string) {
    const skip = (page - 1) * limit

    const { data: followData } = await supabaseAdmin
      .from('follows')
      .select('following_id')
      .eq('follower_id', followerId)

    const followedIds = followData?.map((f) => f.following_id) || []

    if (followedIds.length === 0) {
      return { posts: [], hasMore: false }
    }

    const followQuery = { authorId: { $in: followedIds }, groupId: { $exists: false } }
    const [docs, total] = await Promise.all([
      Post.find(followQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments(followQuery),
    ])

    const hasMore = skip + limit < total
    const posts = await enrichWithProfilesAndPets(docs, currentUserId)
    return { posts, hasMore }
  },
}
