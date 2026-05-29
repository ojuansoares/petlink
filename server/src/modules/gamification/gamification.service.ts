import { Post } from '../../models/Post'
import { AppError } from '../../shared/AppError'
import {
  gamificationRepository,
  type AchievementWithStatus,
  type Achievement,
} from './gamification.repository'

// XP per activity
const XP = {
  post: 50,
  vaccine: 30,
  feedingDay: 10,
  groupJoined: 30,
  groupCreated: 50,
  petCreated: 40,
}

function calculateLevel(totalXp: number): { level: number; xpInLevel: number; xpToNext: number } {
  let level = 1
  let remainingXp = totalXp
  let xpForNext = 100

  while (remainingXp >= xpForNext) {
    remainingXp -= xpForNext
    level++
    xpForNext = 100 + (level - 1) * 50
  }

  return { level, xpInLevel: remainingXp, xpToNext: xpForNext }
}

function getThresholdValue(criteriaType: string, counts: Record<string, number>): number {
  switch (criteriaType) {
    case 'post_count': return counts.postCount
    case 'vaccine_count': return counts.vaccineCount
    case 'feeding_days': return counts.feedingDays
    case 'feeding_streak': return counts.feedingStreak
    case 'groups_joined': return counts.groupsJoined
    case 'groups_created': return counts.groupsCreated
    case 'checkin_count': return counts.checkinCount
    case 'total_xp': return counts.totalXp
    default: return 0
  }
}

export const gamificationService = {
  async getMyStats(userId: string) {
    // 1. Get all achievements + user's unlocked ones
    const [allAchievements, userAchievements, petIds] = await Promise.all([
      gamificationRepository.getAllAchievements(),
      gamificationRepository.getUserAchievements(userId),
      gamificationRepository.countUserPets(userId),
    ])

    const unlockedMap = new Map(userAchievements.map((ua) => [ua.achievement_id, ua.unlocked_at]))

    // 2. Count activity
    const [
      postCount,
      vaccineCount,
      feedingDays,
      groupsJoined,
      groupsCreated,
      checkinCount,
      feedingStreak,
    ] = await Promise.all([
      Post.countDocuments({ authorId: userId }),
      gamificationRepository.countCompletedVaccines(petIds),
      gamificationRepository.countFeedingDays(petIds),
      gamificationRepository.countGroupsJoined(userId),
      gamificationRepository.countGroupsCreated(userId),
      gamificationRepository.countCheckins(userId),
      gamificationRepository.countFeedingStreak(petIds),
    ])

    const petCount = petIds.length

    // 3. Calculate XP
    const activityXp =
      postCount * XP.post +
      vaccineCount * XP.vaccine +
      feedingDays * XP.feedingDay +
      groupsJoined * XP.groupJoined +
      groupsCreated * XP.groupCreated +
      petCount * XP.petCreated

    const counts = {
      postCount,
      vaccineCount,
      feedingDays,
      groupsJoined,
      groupsCreated,
      checkinCount,
      feedingStreak,
      totalXp: activityXp,
    }

    // 4. Process achievements — check & unlock new ones
    const processed: AchievementWithStatus[] = []

    for (const ach of allAchievements) {
      const alreadyUnlocked = unlockedMap.has(ach.id)
      const threshold = getThresholdValue(ach.criteria_type, counts)
      const progress = Math.min(threshold / ach.criteria_threshold, 1)

      if (progress >= 1 && !alreadyUnlocked) {
        await gamificationRepository.unlockAchievement(userId, ach.id)
        processed.push({
          ...ach,
          unlocked: true,
          unlocked_at: new Date().toISOString(),
          progress: 1,
        })
      } else {
        processed.push({
          ...ach,
          unlocked: alreadyUnlocked,
          unlocked_at: alreadyUnlocked ? (unlockedMap.get(ach.id) ?? null) : null,
          progress,
        })
      }
    }

    // 5. Calculate level (XP includes achievement rewards for unlocked ones)
    const achievementXp = processed
      .filter((a) => a.unlocked)
      .reduce((sum, a) => sum + a.xp_reward, 0)

    const totalXp = activityXp + achievementXp
    const { level, xpInLevel, xpToNext } = calculateLevel(totalXp)

    // 6. Persist level so enrichment queries can read it from profiles
    await gamificationRepository.updateUserLevel(userId, level)

    const unlocked = processed.filter((a) => a.unlocked)
    const locked = processed
      .filter((a) => !a.unlocked)
      .sort((a, b) => b.progress - a.progress)

    return {
      level,
      totalXp,
      activityXp,
      achievementXp,
      xpInLevel,
      xpToNext,
      unlockedAchievements: unlocked,
      nextAchievements: locked,
    }
  },
  async getPublicStats(userId: string) {
    const full = await this.getMyStats(userId)
    return {
      level: full.level,
      totalXp: full.totalXp,
      xpInLevel: full.xpInLevel,
      xpToNext: full.xpToNext,
      unlockedAchievements: full.unlockedAchievements.slice(0, 3),
    }
  },
}
