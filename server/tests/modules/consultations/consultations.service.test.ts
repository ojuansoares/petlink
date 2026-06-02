import { consultationsService } from '../../../src/modules/consultations/consultations.service'
import { consultationMediaRepository } from '../../../src/modules/consultations/consultations.repository'
import { supabaseAdmin } from '../../../src/config/supabase'

jest.mock('../../../src/modules/consultations/consultations.repository')
jest.mock('../../../src/config/supabase')

const mockedRepo = jest.mocked(consultationMediaRepository)
const mockedSupabase = jest.mocked(supabaseAdmin)

describe('consultationsService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getMedia', () => {
    it('deve retornar media da consulta', async () => {
      mockedRepo.findByConsultationId.mockResolvedValue({ consultationId: 'c1', type: 'color', value: '#FF0000' } as any)

      const result = await consultationsService.getMedia('c1')

      expect(result).toMatchObject({ consultationId: 'c1' })
    })

    it('deve retornar null se não houver media', async () => {
      mockedRepo.findByConsultationId.mockResolvedValue(null)

      const result = await consultationsService.getMedia('c1')

      expect(result).toBeNull()
    })
  })

  describe('saveMedia', () => {
    function mockConsultationFind(overrides: any = {}) {
      const mockSingle = jest.fn().mockResolvedValue({ data: { id: 'c1', pet_id: 'pet-1', owner_id: 'user-1', ...overrides }, error: null })
      const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockSingle })
      mockedSupabase.from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: mockEq }) } as any)
    }

    it('deve salvar foto', async () => {
      mockConsultationFind()
      mockedRepo.upsert.mockResolvedValue({ consultationId: 'c1', type: 'photo', value: 'http://photo.jpg' } as any)

      const result = await consultationsService.saveMedia('user-1', 'c1', { type: 'photo', value: 'http://photo.jpg' })

      expect(result).toBeDefined()
    })

    it('deve salvar cor', async () => {
      mockConsultationFind()
      mockedRepo.upsert.mockResolvedValue({ consultationId: 'c1', type: 'color', value: '#FF0000' } as any)

      const result = await consultationsService.saveMedia('user-1', 'c1', { type: 'color', value: '#FF0000' })

      expect(result).toBeDefined()
    })

    it('deve rejeitar se consulta não existe', async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null })
      mockedSupabase.from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle: mockSingle }) }) } as any)

      await expect(consultationsService.saveMedia('user-1', 'c1', { type: 'photo', value: 'http://photo.jpg' }))
        .rejects.toThrow('não encontrada')
    })

    it('deve rejeitar se não é owner', async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: { id: 'c1', owner_id: 'user-2' }, error: null })
      mockedSupabase.from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle: mockSingle }) }) } as any)

      await expect(consultationsService.saveMedia('user-1', 'c1', { type: 'photo', value: 'http://photo.jpg' }))
        .rejects.toThrow('Sem permissão')
    })

    it('deve rejeitar URL de foto inválida', async () => {
      mockConsultationFind()

      await expect(consultationsService.saveMedia('user-1', 'c1', { type: 'photo', value: 'not-a-url' }))
        .rejects.toThrow('URL de foto inválida')
    })

    it('deve rejeitar cor inválida', async () => {
      mockConsultationFind()

      await expect(consultationsService.saveMedia('user-1', 'c1', { type: 'color', value: 'red' }))
        .rejects.toThrow('Cor inválida')
    })
  })

  describe('deleteMedia', () => {
    it('deve deletar media', async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: { id: 'c1', owner_id: 'user-1' }, error: null })
      mockedSupabase.from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle: mockSingle }) }) } as any)

      await consultationsService.deleteMedia('user-1', 'c1')

      expect(mockedRepo.deleteByConsultationId).toHaveBeenCalledWith('c1')
    })

    it('deve rejeitar se não é owner', async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: { id: 'c1', owner_id: 'user-2' }, error: null })
      mockedSupabase.from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle: mockSingle }) }) } as any)

      await expect(consultationsService.deleteMedia('user-1', 'c1')).rejects.toThrow('Sem permissão')
    })
  })
})
