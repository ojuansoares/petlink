import { feedingService } from '../../../src/modules/feeding/feeding.service'
import { feedingRepository } from '../../../src/modules/feeding/feeding.repository'
import { petsRepository } from '../../../src/modules/pets/pets.repository'

jest.mock('../../../src/modules/feeding/feeding.repository', () => {
  const actual = jest.requireActual('../../../src/modules/feeding/feeding.repository')
  return {
    ...actual,
    feedingRepository: {
      listPlan: jest.fn(),
      upsertPlan: jest.fn(),
      deactivatePlan: jest.fn(),
      getOrCreateLogs: jest.fn(),
      checkLog: jest.fn(),
      getWeeklyMealSummary: jest.fn(),
      getWeightVariation: jest.fn(),
      getUpcomingVaccinesCount: jest.fn(),
      getUpcomingConsultationsCount: jest.fn(),
      getTimeline: jest.fn(),
      getScoreInRange: jest.fn(),
    },
  }
})
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
      mockedFeedingRepo.listPlan.mockResolvedValue([
        { id: 'm1', pet_id: 'pet-1', meal_name: 'Café', meal_time: '08:00', quantity: '100g', order_index: 0, is_active: true },
      ] as any)

      const result = await feedingService.getPlan('pet-1', 'user-1')

      expect(mockedFeedingRepo.listPlan).toHaveBeenCalledWith('pet-1')
      expect(result).toHaveLength(1)
      expect(result[0].meal_name).toBe('Café')
    })
  })

  describe('savePlan', () => {
    it('deve salvar plano com refeições e passar today', async () => {
      mockedPetsRepo.findById.mockResolvedValue(pet)
      const planResult = [
        { id: 'm1', pet_id: 'pet-1', meal_name: 'Café', meal_time: '08:00', quantity: '100g', order_index: 0, is_active: true },
      ]
      mockedFeedingRepo.upsertPlan.mockResolvedValue(planResult as any)

      const result = await feedingService.savePlan('pet-1', 'user-1', {
        meals: [{ meal_name: 'Café', meal_time: '08:00', quantity: '100g', order_index: 0 }],
        today: '2026-06-07',
      })

      expect(mockedFeedingRepo.upsertPlan).toHaveBeenCalledWith('pet-1', expect.any(Array), '2026-06-07')
      expect(result).toEqual(planResult)
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
      const logResult = [
        { id: 'l1', pet_id: 'pet-1', meal_plan_id: 'm1', meal_name: 'Café', scheduled_time: '08:00', quantity: '100g', order_index: 0, log_date: '2026-06-07', checked_at: null },
      ]
      mockedFeedingRepo.getOrCreateLogs.mockResolvedValue(logResult as any)

      const result = await feedingService.getLogs('pet-1', 'user-1', '2026-06-07')

      expect(mockedFeedingRepo.getOrCreateLogs).toHaveBeenCalledWith('pet-1', '2026-06-07')
      expect(result).toHaveLength(1)
      expect(result[0].meal_name).toBe('Café')
    })
  })

  describe('checkMeal', () => {
    it('deve marcar refeição como concluída', async () => {
      mockedPetsRepo.findById.mockResolvedValue(pet)
      mockedFeedingRepo.checkLog.mockResolvedValue({ id: 'log-1', checked_at: '2026-06-07T08:30:00' } as any)

      const result = await feedingService.checkMeal('log-1', 'pet-1', 'user-1', true)

      expect(mockedFeedingRepo.checkLog).toHaveBeenCalledWith('log-1', 'pet-1', true)
      expect(result.checked_at).toBeTruthy()
    })

    it('deve desmarcar refeição', async () => {
      mockedPetsRepo.findById.mockResolvedValue(pet)
      mockedFeedingRepo.checkLog.mockResolvedValue({ id: 'log-1', checked_at: null } as any)

      const result = await feedingService.checkMeal('log-1', 'pet-1', 'user-1', false)

      expect(mockedFeedingRepo.checkLog).toHaveBeenCalledWith('log-1', 'pet-1', false)
      expect(result.checked_at).toBeNull()
    })
  })

  describe('getWeeklySummary', () => {
    it('deve retornar resumo semanal completo', async () => {
      mockedPetsRepo.findById.mockResolvedValue(pet)
      mockedFeedingRepo.getWeeklyMealSummary.mockResolvedValue({ total: 14, completed: 10 } as any)
      mockedFeedingRepo.getWeightVariation.mockResolvedValue({ current: 10, previous: 9.5, variation: 0.5 } as any)
      mockedFeedingRepo.getUpcomingVaccinesCount.mockResolvedValue(1)
      mockedFeedingRepo.getUpcomingConsultationsCount.mockResolvedValue(0)

      const result = await feedingService.getWeeklySummary('pet-1', 'user-1')

      expect(result.meals).toEqual({ total: 14, completed: 10 })
      expect(result.weight).toEqual({ current: 10, previous: 9.5, variation: 0.5 })
      expect(result.upcoming).toEqual({ vaccines: 1, consultations: 0 })
      expect(mockedFeedingRepo.getWeeklyMealSummary).toHaveBeenCalledWith('pet-1', expect.any(String), expect.any(String))
    })
  })

  describe('getTimeline', () => {
    it('deve retornar timeline com eventos', async () => {
      mockedPetsRepo.findById.mockResolvedValue(pet)
      const timelineResult = {
        events: [{ id: 'e1', type: 'weight', title: 'Peso registrado', date: '2026-06-07', description: '10 kg', icon: 'scale-outline' }],
        hasMore: false,
      }
      mockedFeedingRepo.getTimeline.mockResolvedValue(timelineResult as any)

      const result = await feedingService.getTimeline('pet-1', 'user-1', 1, 20)

      expect(mockedFeedingRepo.getTimeline).toHaveBeenCalledWith('pet-1', 1, 20)
      expect(result.events).toHaveLength(1)
      expect(result.hasMore).toBe(false)
    })
  })

  describe('getScore', () => {
    it('deve retornar score no período', async () => {
      mockedPetsRepo.findById.mockResolvedValue(pet)
      const scoreResult = [
        { date: '2026-06-01', total: 4, completed: 3 },
        { date: '2026-06-02', total: 4, completed: 4 },
      ]
      mockedFeedingRepo.getScoreInRange.mockResolvedValue(scoreResult as any)

      const result = await feedingService.getScore('pet-1', 'user-1', '2026-06-01', '2026-06-30')

      expect(mockedFeedingRepo.getScoreInRange).toHaveBeenCalledWith('pet-1', '2026-06-01', '2026-06-30')
      expect(result).toHaveLength(2)
      expect(result[0].completed).toBe(3)
    })
  })
})
