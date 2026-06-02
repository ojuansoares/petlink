import { remindersService } from '../../../src/modules/reminders/reminders.service'
import { supabaseAdmin } from '../../../src/config/supabase'

jest.mock('../../../src/config/supabase')

const mockedSupabase = jest.mocked(supabaseAdmin)

function mockSupabaseChain(data: any) {
  const mockRange = jest.fn().mockReturnThis()
  const mockGte = jest.fn().mockReturnThis()
  const mockEq = jest.fn().mockReturnThis()
  const mockIn = jest.fn().mockReturnThis()
  const mockOrder = jest.fn().mockReturnThis()
  const mockSelect = jest.fn().mockReturnThis()
  const mockReturn = { data, error: null }

  const mockThenable = jest.fn((..._: any[]) => mockReturn)

  const chain: any = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    in: jest.fn(() => chain),
    gte: jest.fn(() => chain),
    order: jest.fn(() => chain),
    range: jest.fn(() => chain),
    then: mockThenable,
  }

  mockedSupabase.from.mockReturnValue(chain)

  Object.assign(chain, {
    then: jest.fn((resolve: any) => resolve(mockReturn)),
  })

  return chain
}

describe('remindersService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getReminders', () => {
    it('deve retornar lembretes vazios se não há pets', async () => {
      const chain: any = {
        select: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        in: jest.fn(() => chain),
        gte: jest.fn(() => chain),
        order: jest.fn(() => chain),
        then: jest.fn((resolve: any) => resolve({ data: [], error: null })),
      }
      mockedSupabase.from.mockReturnValue(chain)

      const result = await remindersService.getReminders('user-1')

      expect(result.reminders).toHaveLength(0)
    })

    it('deve retornar lembretes de vacinas e consultas ordenados por data', async () => {
      const petsData = { data: [{ id: 'pet-1', name: 'Rex' }], error: null }

      const vaccinesData = {
        data: [
          {
            id: 'v1',
            name: 'V10',
            pet_id: 'pet-1',
            next_dose_at: null,
            is_completed: false,
            doses: [{ date: '2026-06-10', applied: false }],
            type: 'vaccine',
          },
          {
            id: 'v2',
            name: 'Antirrábica',
            pet_id: 'pet-1',
            next_dose_at: null,
            is_completed: false,
            doses: [{ date: '2024-01-01', applied: false }],
            type: 'vaccine',
          },
        ],
        error: null,
      }

      const consultationsData = {
        data: [
          {
            id: 'c1',
            pet_id: 'pet-1',
            vet_name: 'Dr. João',
            clinic: 'Pet Care',
            consulted_at: '2099-07-01T10:00:00Z',
            reason: 'Check-up',
          },
        ],
        error: null,
      }

      let callCount = 0
      const chain: any = {
        select: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        in: jest.fn(() => chain),
        gte: jest.fn(() => chain),
        order: jest.fn(() => chain),
        range: jest.fn(() => chain),
        then: jest.fn((resolve: any) => {
          callCount++
          if (callCount === 1) return resolve(petsData)
          if (callCount === 2) return resolve(vaccinesData)
          if (callCount === 3) return resolve(consultationsData)
          return resolve({ data: [], error: null })
        }),
      }
      mockedSupabase.from.mockReturnValue(chain)

      const result = await remindersService.getReminders('user-1')

      expect(result.reminders).toHaveLength(3)
      expect(result.reminders[0]!.type).toBe('vaccine')
      expect(result.reminders[2]!.type).toBe('consultation')
    })

    it('deve marcar vacina como overdue se data já passou', async () => {
      const chain: any = {
        select: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        in: jest.fn(() => chain),
        gte: jest.fn(() => chain),
        order: jest.fn(() => chain),
        range: jest.fn(() => chain),
        then: jest.fn((resolve: any) => resolve({ data: [], error: null })),
      }

      let callCount = 0
      chain.then = jest.fn((resolve: any) => {
        callCount++
        if (callCount === 1) return resolve({ data: [{ id: 'pet-1', name: 'Rex' }], error: null })
        if (callCount === 2) return resolve({
          data: [{
            id: 'v1', name: 'V10', pet_id: 'pet-1',
            next_dose_at: null, is_completed: false,
            doses: [{ date: '2020-01-01', applied: false }],
            type: 'vaccine',
          }],
          error: null,
        })
        return resolve({ data: [], error: null })
      })
      mockedSupabase.from.mockReturnValue(chain)

      const result = await remindersService.getReminders('user-1')

      expect(result.reminders[0]!.overdue).toBe(true)
      expect(result.reminders[0]!.label).toContain('Vencida')
    })

    it('deve pular vacinas completas', async () => {
      const chain: any = { select: jest.fn(() => chain), eq: jest.fn(() => chain), in: jest.fn(() => chain), gte: jest.fn(() => chain), order: jest.fn(() => chain), range: jest.fn(() => chain), then: jest.fn((resolve: any) => resolve({ data: [], error: null })) }
      let callCount = 0
      chain.then = jest.fn((resolve: any) => {
        callCount++
        if (callCount === 1) return resolve({ data: [{ id: 'pet-1', name: 'Rex' }], error: null })
        if (callCount === 2) return resolve({
          data: [{
            id: 'v1', name: 'V10', pet_id: 'pet-1',
            next_dose_at: null, is_completed: true,
            doses: [], type: 'vaccine',
          }],
          error: null,
        })
        return resolve({ data: [], error: null })
      })
      mockedSupabase.from.mockReturnValue(chain)

      const result = await remindersService.getReminders('user-1')

      expect(result.reminders).toHaveLength(0)
    })
  })
})
