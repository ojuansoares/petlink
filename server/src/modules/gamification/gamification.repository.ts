import { supabaseAdmin } from '../../config/supabase'
import { Checkin } from '../../models/Checkin'

export type Achievement = {
  id: string
  key: string
  name: string
  description: string | null
  icon: string
  category: string
  xp_reward: number
  criteria_type: string
  criteria_threshold: number
  sort_order: number
}

export type UserAchievement = {
  user_id: string
  achievement_id: string
  unlocked_at: string
}

export interface AchievementWithStatus extends Achievement {
  unlocked: boolean
  unlocked_at: string | null
  progress: number
}

export const gamificationRepository = {
  async getAllAchievements(): Promise<Achievement[]> {
    const { data, error } = await supabaseAdmin
      .from('achievements')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw error
    return (data ?? []) as Achievement[]
  },

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    const { data, error } = await supabaseAdmin
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error
    return (data ?? []) as UserAchievement[]
  },

  async unlockAchievement(userId: string, achievementId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('user_achievements')
      .insert({ user_id: userId, achievement_id: achievementId })

    if (error && !error.message.includes('violates unique constraint')) throw error
  },

  async countUserPets(userId: string): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from('pets')
      .select('id')
      .eq('owner_id', userId)

    if (error) throw error
    return (data ?? []).map((p: any) => p.id as string)
  },

  async countCompletedVaccines(petIds: string[]): Promise<number> {
    if (petIds.length === 0) return 0
    const { data, error } = await supabaseAdmin
      .from('vaccines')
      .select('id')
      .eq('is_completed', true)
      .in('pet_id', petIds)

    if (error) throw error
    return data?.length ?? 0
  },

  async countFeedingDays(petIds: string[]): Promise<number> {
    if (petIds.length === 0) return 0
    const { data, error } = await supabaseAdmin
      .from('feeding_logs')
      .select('log_date')
      .in('pet_id', petIds)
      .not('checked_at', 'is', null)

    if (error) throw error

    const uniqueDays = new Set((data ?? []).map((r: any) => r.log_date as string))
    return uniqueDays.size
  },

  async countGroupsJoined(userId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (error) throw error
    return count ?? 0
  },

  async countGroupsCreated(userId: string): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from('groups')
      .select('id', { count: 'exact' })
      .eq('created_by', userId)

    if (error) throw error
    return data?.length ?? 0
  },

  async countCheckins(userId: string): Promise<number> {
    return Checkin.countDocuments({ userId })
  },

  async countFeedingStreak(petIds: string[]): Promise<number> {
    if (petIds.length === 0) return 0
    const { data, error } = await supabaseAdmin
      .from('feeding_logs')
      .select('log_date')
      .in('pet_id', petIds)
      .not('checked_at', 'is', null)

    if (error) throw error

    const uniqueDays = new Set((data ?? []).map((r: any) => r.log_date as string))
    let streak = 0
    const today = new Date()

    for (let i = 0; ; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      if (uniqueDays.has(key)) {
        streak++
      } else {
        break
      }
    }
    return streak
  },

  async updateUserLevel(userId: string, level: number): Promise<void> {
    await supabaseAdmin
      .from('profiles')
      .update({ level })
      .eq('id', userId)
  },
}
