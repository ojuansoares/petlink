import { profileRepository } from './profile.repository'
import { AppError } from '../../shared/AppError'
import { uploadsService } from '../uploads/uploads.service'
import { petsRepository } from '../pets/pets.repository'
import { groupsRepository } from '../groups/groups.repository'
import { supabaseAdmin } from '../../config/supabase'
import { Post } from '../../models/Post'
import { Like } from '../../models/Like'
import { Comment } from '../../models/Comment'
import { CommentLike } from '../../models/CommentLike'
import { Checkin } from '../../models/Checkin'
import { Review } from '../../models/Review'

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

  async searchByName(query: string) {
    if (!query || query.trim().length < 2) return []
    return profileRepository.searchByName(query.trim())
  },

  async deleteMe(userId: string) {
    const profile = await profileRepository.findById(userId)
    const pets = await petsRepository.listByOwner(userId)

    // ─── Pets ─────────────────────────────────────────────
    for (const pet of pets) {
      const deleted = await petsRepository.deleteCascadeByIdAndOwner(userId, pet.id)
      if (!deleted) continue

      if (pet.photo_url) {
        try { await uploadsService.deleteImageByUrl(pet.photo_url) } catch {}
      }
    }

    // ─── Posts (MongoDB) ──────────────────────────────────
    const userPosts = await Post.find({ authorId: userId }).select('_id imageUrl')
    const postIds = userPosts.map(p => p._id)

    if (postIds.length > 0) {
      await Like.deleteMany({ postId: { $in: postIds } })
      const userPostComments = await Comment.find({ postId: { $in: postIds } }).select('_id')
      const commentIds = userPostComments.map(c => c._id)
      if (commentIds.length > 0) {
        await CommentLike.deleteMany({ commentId: { $in: commentIds } })
      }
      await Comment.deleteMany({ postId: { $in: postIds } })

      for (const post of userPosts) {
        if (post.imageUrl) {
          try { await uploadsService.deleteImageByUrl(post.imageUrl) } catch {}
        }
      }
      await Post.deleteMany({ _id: { $in: postIds } })
    }

    // ─── Likes / Comments do usuário em posts de outros ───
    await Like.deleteMany({ userId })
    const userCommentsOnOthers = await Comment.find({ authorId: userId }).select('_id')
    const userCommentIds = userCommentsOnOthers.map(c => c._id)
    if (userCommentIds.length > 0) {
      await CommentLike.deleteMany({ commentId: { $in: userCommentIds } })
    }
    await Comment.deleteMany({ authorId: userId })
    await CommentLike.deleteMany({ userId })

    // ─── Checkins / Reviews (MongoDB) ─────────────────────
    const userCheckins = await Checkin.find({ userId }).select('photoUrl')
    for (const c of userCheckins) {
      if (c.photoUrl) {
        try { await uploadsService.deleteImageByUrl(c.photoUrl) } catch {}
      }
    }
    await Checkin.deleteMany({ userId })
    await Review.deleteMany({ authorId: userId })

    // ─── Grupos (Supabase) ────────────────────────────────
    const ownedGroups = await supabaseAdmin
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId)
      .eq('role', 'owner')

    const ownedGroupIds = (ownedGroups.data ?? []).map((g: any) => g.group_id)

    for (const groupId of ownedGroupIds) {
      await groupsRepository.delete(groupId)
    }

    await supabaseAdmin.from('group_members').delete().eq('user_id', userId)
    await supabaseAdmin.from('group_invites').delete().or(`invited_user_id.eq.${userId},invited_by.eq.${userId}`)

    // ─── Redes sociais (Supabase) ─────────────────────────
    await supabaseAdmin.from('follows').delete().or(`follower_id.eq.${userId},following_id.eq.${userId}`)
    await supabaseAdmin.from('notifications').delete().eq('user_id', userId)
    await supabaseAdmin.from('push_tokens').delete().eq('user_id', userId)
    await supabaseAdmin.from('user_notification_preferences').delete().eq('user_id', userId)
    await supabaseAdmin.from('user_achievements').delete().eq('user_id', userId)

    // ─── Avatar do perfil ─────────────────────────────────
    if (profile?.avatar_url) {
      try { await uploadsService.deleteImageByUrl(profile.avatar_url) } catch {}
    }

    // ─── Perfil + Auth ────────────────────────────────────
    await profileRepository.deleteById(userId)

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) {
      throw new AppError(error.message, 500)
    }
  },
}

