import { Post } from '../../../src/models/Post'
import { gamificationService } from '../../../src/modules/gamification/gamification.service'
import { gamificationRepository } from '../../../src/modules/gamification/gamification.repository'

jest.mock('../../../src/modules/gamification/gamification.repository')
jest.mock('../../../src/models/Post')

const mockedRepo = jest.mocked(gamificationRepository)
const mockedPost = jest.mocked(Post)

function makeAchievement(overrides: Partial<any> = {}) {
  return {
    id: 'ach-1',
    key: 'first_post',
    name: 'Primeiro Post',
    description: 'Crie seu primeiro post',
    icon: '🐾',
    category: 'social',
    xp_reward: 50,
    criteria_type: 'post_count',
    criteria_threshold: 1,
    sort_order: 1,
    ...overrides,
  }
}

describe('gamificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getMyStats', () => {
    const defaultCounts = {
      countCompletedVaccines: 0,
      countFeedingDays: 0,
      countConsultations: 0,
      countGroupsJoined: 0,
      countGroupsCreated: 0,
      countCheckins: 0,
      countFeedingStreak: 0,
    }

    async function setupCounts(overrides: Partial<typeof defaultCounts> = {}) {
      const counts = { ...defaultCounts, ...overrides }
      mockedRepo.countCompletedVaccines.mockResolvedValue(counts.countCompletedVaccines)
      mockedRepo.countFeedingDays.mockResolvedValue(counts.countFeedingDays)
      mockedRepo.countConsultations.mockResolvedValue(counts.countConsultations)
      mockedRepo.countGroupsJoined.mockResolvedValue(counts.countGroupsJoined)
      mockedRepo.countGroupsCreated.mockResolvedValue(counts.countGroupsCreated)
      mockedRepo.countCheckins.mockResolvedValue(counts.countCheckins)
      mockedRepo.countFeedingStreak.mockResolvedValue(counts.countFeedingStreak)
    }

    it('deve retornar level 1 com 0 XP para usuário sem atividades', async () => {
      mockedRepo.getAllAchievements.mockResolvedValue([makeAchievement()])
      mockedRepo.getUserAchievements.mockResolvedValue([])
      mockedRepo.countUserPets.mockResolvedValue([])
      mockedPost.countDocuments.mockResolvedValue(0)
      await setupCounts()

      const result = await gamificationService.getMyStats('user-1')

      expect(result.level).toBe(1)
      expect(result.totalXp).toBe(0)
      expect(result.xpInLevel).toBe(0)
      expect(result.xpToNext).toBe(100)
      expect(result.unlockedAchievements).toHaveLength(0)
    })

    it('deve calcular XP corretamente para postagens', async () => {
      mockedRepo.getAllAchievements.mockResolvedValue([makeAchievement()])
      mockedRepo.getUserAchievements.mockResolvedValue([])
      mockedRepo.countUserPets.mockResolvedValue([])
      mockedPost.countDocuments.mockResolvedValue(5)
      await setupCounts()

      const result = await gamificationService.getMyStats('user-1')

      expect(result.activityXp).toBe(250)
      expect(result.achievementXp).toBe(50)
      expect(result.totalXp).toBe(300)
      expect(result.level).toBe(3)
      expect(result.xpInLevel).toBe(50)
    })

    it('deve desbloquear achievement automaticamente quando critério é atingido', async () => {
      mockedRepo.getAllAchievements.mockResolvedValue([makeAchievement()])
      mockedRepo.getUserAchievements.mockResolvedValue([])
      mockedRepo.countUserPets.mockResolvedValue([])
      mockedPost.countDocuments.mockResolvedValue(1)
      await setupCounts()

      const result = await gamificationService.getMyStats('user-1')

      expect(result.unlockedAchievements).toHaveLength(1)
      expect(result.unlockedAchievements[0]!.key).toBe('first_post')
      expect(result.unlockedAchievements[0]!.unlocked).toBe(true)
      expect(mockedRepo.unlockAchievement).toHaveBeenCalledWith('user-1', 'ach-1')
    })

    it('não deve tentar desbloquear achievement já desbloqueado', async () => {
      mockedRepo.getAllAchievements.mockResolvedValue([makeAchievement()])
      mockedRepo.getUserAchievements.mockResolvedValue([{ user_id: 'user-1', achievement_id: 'ach-1', unlocked_at: '2024-01-01' }])
      mockedRepo.countUserPets.mockResolvedValue([])
      mockedPost.countDocuments.mockResolvedValue(5)
      await setupCounts()

      const result = await gamificationService.getMyStats('user-1')

      expect(result.unlockedAchievements).toHaveLength(1)
      expect(mockedRepo.unlockAchievement).not.toHaveBeenCalled()
    })

    it('deve incluir XP de achievements desbloqueados no total', async () => {
      mockedRepo.getAllAchievements.mockResolvedValue([makeAchievement({ xp_reward: 50 })])
      mockedRepo.getUserAchievements.mockResolvedValue([])
      mockedRepo.countUserPets.mockResolvedValue([])
      mockedPost.countDocuments.mockResolvedValue(1)
      await setupCounts()

      const result = await gamificationService.getMyStats('user-1')

      expect(result.activityXp).toBe(50)
      expect(result.achievementXp).toBe(50)
      expect(result.totalXp).toBe(100)
    })

    it('deve calcular level corretamente com múltiplos níveis', async () => {
      mockedRepo.getAllAchievements.mockResolvedValue([])
      mockedRepo.getUserAchievements.mockResolvedValue([])
      mockedRepo.countUserPets.mockResolvedValue([])
      mockedPost.countDocuments.mockResolvedValue(50)
      await setupCounts()

      const result = await gamificationService.getMyStats('user-1')

      expect(result.activityXp).toBe(2500)
      expect(result.level).toBeGreaterThanOrEqual(6)
      expect(result.xpToNext).toBeGreaterThan(0)
    })

    it('deve processar achievements de diferentes categorias', async () => {
      const achievements = [
        makeAchievement({ id: 'ach-1', key: 'first_post', criteria_type: 'post_count', criteria_threshold: 1 }),
        makeAchievement({ id: 'ach-2', key: 'paparazzi', criteria_type: 'post_count', criteria_threshold: 10 }),
        makeAchievement({ id: 'ach-3', key: 'social', criteria_type: 'groups_joined', criteria_threshold: 3 }),
      ]
      mockedRepo.getAllAchievements.mockResolvedValue(achievements)
      mockedRepo.getUserAchievements.mockResolvedValue([])
      mockedRepo.countUserPets.mockResolvedValue([])
      mockedPost.countDocuments.mockResolvedValue(5)
      await setupCounts({ countGroupsJoined: 2 })

      const result = await gamificationService.getMyStats('user-1')

      const firstPost = result.unlockedAchievements.find((a) => a.key === 'first_post')
      const paparazzi = result.nextAchievements.find((a) => a.key === 'paparazzi')
      const social = result.nextAchievements.find((a) => a.key === 'social')

      expect(firstPost?.unlocked).toBe(true)
      expect(paparazzi?.progress).toBe(0.5)
      expect(social?.progress).toBeCloseTo(0.667, 2)
    })

    it('deve atualizar level no perfil do usuário', async () => {
      mockedRepo.getAllAchievements.mockResolvedValue([makeAchievement()])
      mockedRepo.getUserAchievements.mockResolvedValue([])
      mockedRepo.countUserPets.mockResolvedValue([])
      mockedPost.countDocuments.mockResolvedValue(1)
      await setupCounts()

      await gamificationService.getMyStats('user-1')

      expect(mockedRepo.updateUserLevel).toHaveBeenCalledWith('user-1', expect.any(Number))
    })
  })

  describe('getPublicStats', () => {
    it('deve retornar apenas stats públicos (sem nextAchievements)', async () => {
      mockedRepo.getAllAchievements.mockResolvedValue([makeAchievement()])
      mockedRepo.getUserAchievements.mockResolvedValue([{ user_id: 'user-1', achievement_id: 'ach-1', unlocked_at: '2024-01-01' }])
      mockedRepo.countUserPets.mockResolvedValue(['pet-1'])
      mockedPost.countDocuments.mockResolvedValue(1)
      mockedRepo.countCompletedVaccines.mockResolvedValue(2)
      mockedRepo.countFeedingDays.mockResolvedValue(5)
      mockedRepo.countConsultations.mockResolvedValue(0)
      mockedRepo.countGroupsJoined.mockResolvedValue(0)
      mockedRepo.countGroupsCreated.mockResolvedValue(0)
      mockedRepo.countCheckins.mockResolvedValue(0)
      mockedRepo.countFeedingStreak.mockResolvedValue(0)

      const result = await gamificationService.getPublicStats('user-2')

      expect(result).toHaveProperty('level')
      expect(result).toHaveProperty('totalXp')
      expect(result).toHaveProperty('xpInLevel')
      expect(result).toHaveProperty('xpToNext')
      expect(result).toHaveProperty('unlockedAchievements')
      expect((result as any).nextAchievements).toBeUndefined()
    })
  })
})
