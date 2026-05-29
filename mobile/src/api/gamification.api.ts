import { api } from './axios'

export interface AchievementData {
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
  unlocked: boolean
  unlocked_at: string | null
  progress: number
}

export interface GamificationStats {
  level: number
  totalXp: number
  activityXp: number
  achievementXp: number
  xpInLevel: number
  xpToNext: number
  unlockedAchievements: AchievementData[]
  nextAchievements: AchievementData[]
}

export interface PublicGamificationStats {
  level: number
  totalXp: number
  xpInLevel: number
  xpToNext: number
  unlockedAchievements: AchievementData[]
}

export const gamificationApi = {
  async getMyStats(): Promise<GamificationStats> {
    const { data } = await api.get('/gamification/my')
    return data as GamificationStats
  },
  async getUserStats(userId: string): Promise<PublicGamificationStats> {
    const { data } = await api.get(`/gamification/${userId}`)
    return data as PublicGamificationStats
  },
}
