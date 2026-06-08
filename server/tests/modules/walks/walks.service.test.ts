import { walksService } from '../../../src/modules/walks/walks.service'
import { walksRepository } from '../../../src/modules/walks/walks.repository'
import { gamificationService } from '../../../src/modules/gamification/gamification.service'

jest.mock('../../../src/modules/walks/walks.repository')
jest.mock('../../../src/modules/gamification/gamification.service')
jest.mock('../../../src/config/supabase')

const mockedRepo = jest.mocked(walksRepository)
const mockedGamification = jest.mocked(gamificationService)

const mockWalk = {
  id: 'walk-1',
  pet_id: 'pet-1',
  owner_id: 'user-1',
  started_at: '2026-06-07T10:00:00Z',
  ended_at: '2026-06-07T10:30:00Z',
  distance_m: 2500,
  duration_s: 1800,
  steps_count: null,
  avg_speed_kmh: 5,
  avg_pace_min_km: 12,
  max_speed_kmh: 8.5,
  calories: null,
  photo_url: null,
  route: [{ lat: -23.5, lng: -46.6, timestamp: '2026-06-07T10:00:00Z' }],
  notes: null,
  title: 'Passeio matinal',
  color: '#22C55E',
  location: 'São Paulo, SP',
  created_at: '2026-06-07T10:30:00Z',
}

describe('walksService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('listByPet', () => {
    it('deve listar passeios do pet', async () => {
      mockedRepo.listByPet.mockResolvedValue([mockWalk] as any)

      const result = await walksService.listByPet('pet-1', 'user-1')

      expect(mockedRepo.listByPet).toHaveBeenCalledWith('pet-1')
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Passeio matinal')
    })

    it('deve rejeitar se petId for vazio', async () => {
      await expect(walksService.listByPet('', 'user-1')).rejects.toThrow('obrigatório')
    })
  })

  describe('findById', () => {
    it('deve retornar passeio por id', async () => {
      mockedRepo.findById.mockResolvedValue(mockWalk as any)

      const result = await walksService.findById('walk-1')

      expect(mockedRepo.findById).toHaveBeenCalledWith('walk-1')
      expect(result.id).toBe('walk-1')
    })

    it('deve rejeitar se id for vazio', async () => {
      await expect(walksService.findById('')).rejects.toThrow('obrigatório')
    })

    it('deve rejeitar se passeio não existir', async () => {
      mockedRepo.findById.mockResolvedValue(null)

      await expect(walksService.findById('walk-x')).rejects.toThrow('não encontrado')
    })
  })

  describe('create', () => {
    const createPayload = {
      petId: 'pet-1',
      ownerId: 'user-1',
      startedAt: '2026-06-07T10:00:00Z',
      endedAt: '2026-06-07T10:30:00Z',
      distanceM: 2500,
      durationS: 1800,
      avgSpeedKmh: 5,
      maxSpeedKmh: 8.5,
      route: [{ lat: -23.5, lng: -46.6, timestamp: '2026-06-07T10:00:00Z' }],
      title: 'Passeio matinal',
      color: '#22C55E',
      location: 'São Paulo, SP',
    }

    it('deve criar passeio com calorias calculadas', async () => {
      mockedRepo.create.mockResolvedValue({ ...mockWalk, calories: 123 } as any)
      mockedGamification.getMyStats.mockResolvedValue({} as any)

      const result = await walksService.create(createPayload)

      expect(mockedRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        pet_id: 'pet-1',
        distance_m: 2500,
        duration_s: 1800,
        calories: 123,
      }))
      expect(mockedGamification.getMyStats).toHaveBeenCalledWith('user-1')
      expect(result.calories).toBe(123)
    })

    it('deve usar calorias fornecidas se passadas', async () => {
      mockedRepo.create.mockResolvedValue({ ...mockWalk, calories: 200 } as any)
      mockedGamification.getMyStats.mockResolvedValue({} as any)

      const result = await walksService.create({ ...createPayload, calories: 200 })

      expect(mockedRepo.create).toHaveBeenCalledWith(expect.objectContaining({ calories: 200 }))
      expect(result.calories).toBe(200)
    })

    it('deve estimar MET 2.5 para velocidade baixa', async () => {
      mockedRepo.create.mockResolvedValue({ ...mockWalk, avg_speed_kmh: 3, calories: 102 } as any)
      mockedGamification.getMyStats.mockResolvedValue({} as any)

      await walksService.create({ ...createPayload, avgSpeedKmh: 3 })

      expect(mockedRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        avg_speed_kmh: 3,
      }))
    })

    it('deve calcular avgPace se não fornecido', async () => {
      mockedRepo.create.mockResolvedValue(mockWalk as any)
      mockedGamification.getMyStats.mockResolvedValue({} as any)

      await walksService.create({ ...createPayload, avgPaceMinKm: undefined })

      expect(mockedRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        avg_pace_min_km: 12,
      }))
    })
  })

  describe('update', () => {
    const updatePayload = { title: 'Novo título', notes: 'Observação', color: '#3B82F6', location: 'Novo Local' }

    it('deve atualizar metadados do passeio', async () => {
      mockedRepo.findById.mockResolvedValue(mockWalk as any)
      mockedRepo.update.mockResolvedValue({ ...mockWalk, ...updatePayload } as any)

      const result = await walksService.update('walk-1', updatePayload)

      expect(mockedRepo.findById).toHaveBeenCalledWith('walk-1')
      expect(mockedRepo.update).toHaveBeenCalledWith('walk-1', {
        photo_url: undefined,
        notes: 'Observação',
        title: 'Novo título',
        color: '#3B82F6',
        location: 'Novo Local',
      })
      expect(result.title).toBe('Novo título')
    })

    it('deve rejeitar se id for vazio', async () => {
      await expect(walksService.update('', { title: 'x' })).rejects.toThrow('obrigatório')
    })

    it('deve rejeitar se passeio não existir', async () => {
      mockedRepo.findById.mockResolvedValue(null)

      await expect(walksService.update('walk-x', { title: 'x' })).rejects.toThrow('não encontrado')
    })
  })

  describe('remove', () => {
    it('deve remover passeio', async () => {
      mockedRepo.findById.mockResolvedValue(mockWalk as any)
      mockedRepo.remove.mockResolvedValue()

      await walksService.remove('walk-1')

      expect(mockedRepo.remove).toHaveBeenCalledWith('walk-1')
    })

    it('deve rejeitar se id for vazio', async () => {
      await expect(walksService.remove('')).rejects.toThrow('obrigatório')
    })

    it('deve rejeitar se passeio não existir', async () => {
      mockedRepo.findById.mockResolvedValue(null)

      await expect(walksService.remove('walk-x')).rejects.toThrow('não encontrado')
    })
  })

  describe('getStats', () => {
    it('deve retornar estatísticas do período', async () => {
      const statsData = [
        { started_at: '2026-06-07T10:00:00Z', distance_m: 2500, duration_s: 1800, calories: 122 },
      ]
      mockedRepo.getStats.mockResolvedValue(statsData as any)

      const result = await walksService.getStats('pet-1', '2026-06-01', '2026-06-30')

      expect(mockedRepo.getStats).toHaveBeenCalledWith('pet-1', '2026-06-01', '2026-06-30')
      expect(result).toHaveLength(1)
    })

    it('deve rejeitar se petId for vazio', async () => {
      await expect(walksService.getStats('', '2026-06-01', '2026-06-30')).rejects.toThrow('obrigatório')
    })
  })
})
