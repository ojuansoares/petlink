import { feedingService } from '../../../src/modules/feeding/feeding.service'
import { feedingRepository } from '../../../src/modules/feeding/feeding.repository'
import { petsRepository } from '../../../src/modules/pets/pets.repository'

jest.mock('../../../src/modules/feeding/feeding.repository')
jest.mock('../../../src/modules/pets/pets.repository')

const mockedFeedingRepo = jest.mocked(feedingRepository)
const mockedPetsRepo = jest.mocked(petsRepository)

describe('feedingService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const pet = { id: 'pet-1', owner_id: 'user-1', name: 'Rex' } as any

  describe('verifyOwnership', () => {
    it('deve passar se pet pertence ao usuário', async () => {
      mockedPetsRepo.findById.mockResolvedValue(pet)

      await expect(feedingService.verifyOwnership('pet-1', 'user-1')).resolves.not.toThrow()
    })

    it('deve rejeitar se pet não existe', async () => {
      mockedPetsRepo.findById.mockResolvedValue(null)

      await expect(feedingService.verifyOwnership('pet-1', 'user-1')).rejects.toThrow('não encontrado')
    })

    it('deve rejeitar se pet não pertence ao usuário', async () => {
      mockedPetsRepo.findById.mockResolvedValue({ ...pet, owner_id: 'user-2' })

      await expect(feedingService.verifyOwnership('pet-1', 'user-1')).rejects.toThrow('não encontrado')
    })
  })

  describe('getPlan', () => {
    it('deve retornar plano alimentar', async () => {
      mockedPetsRepo.findById.mockResolvedValue(pet)
      mockedFeedingRepo.listPlan.mockResolvedValue({ meals: [{ time: '08:00', food: 'Ração' }] } as any)

      const result = await feedingService.getPlan('pet-1', 'user-1')

      expect(result).toEqual({ meals: [{ time: '08:00', food: 'Ração' }] })
    })
  })

  describe('savePlan', () => {
    it('deve salvar plano com refeições', async () => {
      mockedPetsRepo.findById.mockResolvedValue(pet)
      mockedFeedingRepo.upsertPlan.mockResolvedValue({ meals: [{ time: '08:00', food: 'Ração' }] } as any)

      const result = await feedingService.savePlan('pet-1', 'user-1', {
        meals: [{ time: '08:00', food: 'Ração' }] as any,
      })

      expect(result).toBeDefined()
    })

    it('deve rejeitar plano sem refeições', async () => {
      mockedPetsRepo.findById.mockResolvedValue(pet)

      await expect(feedingService.savePlan('pet-1', 'user-1', { meals: [] }))
        .rejects.toThrow('pelo menos uma refeição')
    })
  })

  describe('deactivatePlan', () => {
    it('deve desativar plano', async () => {
      mockedPetsRepo.findById.mockResolvedValue(pet)
      mockedFeedingRepo.deactivatePlan.mockResolvedValue(undefined)

      await feedingService.deactivatePlan('pet-1', 'user-1')

      expect(mockedFeedingRepo.deactivatePlan).toHaveBeenCalledWith('pet-1')
    })
  })

  describe('getLogs', () => {
    it('deve retornar logs do dia', async () => {
      mockedPetsRepo.findById.mockResolvedValue(pet)
      mockedFeedingRepo.getOrCreateLogs.mockResolvedValue([{ id: 'log-1' }] as any)

      const result = await feedingService.getLogs('pet-1', 'user-1', '2024-06-01')

      expect(result).toHaveLength(1)
    })
  })

  describe('checkMeal', () => {
    it('deve marcar refeição', async () => {
      mockedPetsRepo.findById.mockResolvedValue(pet)
      mockedFeedingRepo.checkLog.mockResolvedValue({ id: 'log-1' } as any)

      const result = await feedingService.checkMeal('log-1', 'pet-1', 'user-1', true)

      expect(result).toBeDefined()
    })
  })

  describe('getWeeklySummary', () => {
    it('deve retornar resumo semanal', async () => {
      mockedPetsRepo.findById.mockResolvedValue(pet)
      mockedFeedingRepo.getWeeklyMealSummary.mockResolvedValue({ total: 14, completed: 10 } as any)
      mockedFeedingRepo.getWeightVariation.mockResolvedValue({ current: 10, previous: 9.5, variation: 0.5 } as any)
      mockedFeedingRepo.getUpcomingVaccinesCount.mockResolvedValue(1)
      mockedFeedingRepo.getUpcomingConsultationsCount.mockResolvedValue(0)

      const result = await feedingService.getWeeklySummary('pet-1', 'user-1')

      expect(result.meals).toEqual({ total: 14, completed: 10 })
      expect(result.upcoming.vaccines).toBe(1)
    })
  })

  describe('getTimeline', () => {
    it('deve retornar timeline', async () => {
      mockedPetsRepo.findById.mockResolvedValue(pet)
      mockedFeedingRepo.getTimeline.mockResolvedValue({ events: [], hasMore: false } as any)

      const result = await feedingService.getTimeline('pet-1', 'user-1', 1, 20)

      expect(result.events).toHaveLength(0)
    })
  })

  describe('getScore', () => {
    it('deve retornar score de alimentação', async () => {
      mockedPetsRepo.findById.mockResolvedValue(pet)
      mockedFeedingRepo.getScoreInRange.mockResolvedValue([{ date: '2024-01-01', total: 4, completed: 3 }] as any)

      const result = await feedingService.getScore('pet-1', 'user-1', '2024-01-01', '2024-01-31')

      expect(result).toHaveLength(1)
    })
  })

  describe('checkMeal', () => {
    it('deve marcar refeição', async () => {
      mockedPetsRepo.findById.mockResolvedValue(pet)
      mockedFeedingRepo.checkLog.mockResolvedValue({ id: 'log-1' } as any)

      const result = await feedingService.checkMeal('log-1', 'pet-1', 'user-1', true)

      expect(result).toBeDefined()
    })
  })

  describe('getWeeklySummary', () => {
    it('deve retornar resumo semanal', async () => {
      mockedPetsRepo.findById.mockResolvedValue(pet)
      mockedFeedingRepo.getWeeklyMealSummary.mockResolvedValue({ total: 14, completed: 10 } as any)
      mockedFeedingRepo.getWeightVariation.mockResolvedValue({ current: 10, previous: 9.5, variation: 0.5 } as any)
      mockedFeedingRepo.getUpcomingVaccinesCount.mockResolvedValue(1)
      mockedFeedingRepo.getUpcomingConsultationsCount.mockResolvedValue(0)

      const result = await feedingService.getWeeklySummary('pet-1', 'user-1')

      expect(result.meals).toEqual({ total: 14, completed: 10 })
      expect(result.upcoming.vaccines).toBe(1)
    })
  })

  describe('getTimeline', () => {
    it('deve retornar timeline', async () => {
      mockedPetsRepo.findById.mockResolvedValue(pet)
      mockedFeedingRepo.getTimeline.mockResolvedValue({ events: [], hasMore: false } as any)

      const result = await feedingService.getTimeline('pet-1', 'user-1', 1, 20)

      expect(result.events).toHaveLength(0)
    })
  })

  describe('getScore', () => {
    it('deve retornar score de alimentação', async () => {
      mockedPetsRepo.findById.mockResolvedValue(pet)
      mockedFeedingRepo.getScoreInRange.mockResolvedValue([{ date: '2024-01-01', total: 4, completed: 3 }] as any)

      const result = await feedingService.getScore('pet-1', 'user-1', '2024-01-01', '2024-01-31')

      expect(result).toHaveLength(1)
    })
  })
})
