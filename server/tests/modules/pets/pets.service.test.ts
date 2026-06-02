import { petsService } from '../../../src/modules/pets/pets.service'
import { petsRepository } from '../../../src/modules/pets/pets.repository'
import { uploadsService } from '../../../src/modules/uploads/uploads.service'

jest.mock('../../../src/modules/pets/pets.repository')
jest.mock('../../../src/modules/uploads/uploads.service')

const mockedRepo = jest.mocked(petsRepository)
const mockedUploads = jest.mocked(uploadsService)

describe('petsService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createForOwner', () => {
    it('deve criar pet com dados válidos', async () => {
      const created = { id: 'pet-1', name: 'Rex', species: 'dog', weight_kg: 10 }
      mockedRepo.findByOwnerAndName.mockResolvedValue(null)
      mockedRepo.create.mockResolvedValue(created)
      mockedRepo.hasWeightRecordForDate.mockResolvedValue(false)

      const result = await petsService.createForOwner('user-1', {
        name: 'Rex',
        species: 'dog',
        weight_kg: 10,
      })

      expect(result).toEqual(created)
      expect(mockedRepo.create).toHaveBeenCalled()
      expect(mockedRepo.createWeightRecord).toHaveBeenCalled()
    })

    it('deve rejeitar nome vazio', async () => {
      await expect(petsService.createForOwner('user-1', { name: '  ', species: 'dog' }))
        .rejects.toThrow('obrigatório')
      expect(mockedRepo.create).not.toHaveBeenCalled()
    })

    it('deve rejeitar espécie vazia', async () => {
      await expect(petsService.createForOwner('user-1', { name: 'Rex', species: '' }))
        .rejects.toThrow('Espécie do pet é obrigatória')
      expect(mockedRepo.create).not.toHaveBeenCalled()
    })

    it('deve rejeitar peso inválido (NaN)', async () => {
      await expect(petsService.createForOwner('user-1', { name: 'Rex', species: 'dog', weight_kg: NaN }))
        .rejects.toThrow('Peso inválido')
    })

    it('deve rejeitar mais de 7 tags', async () => {
      await expect(petsService.createForOwner('user-1', { name: 'Rex', species: 'dog', tags: ['a','b','c','d','e','f','g','h'] }))
        .rejects.toThrow('máximo 7 tags')
    })

    it('deve rejeitar nome duplicado', async () => {
      mockedRepo.findByOwnerAndName.mockResolvedValue({ id: 'pet-1' } as any)

      await expect(petsService.createForOwner('user-1', { name: 'Rex', species: 'dog' }))
        .rejects.toThrow('já tem um pet')
    })

    it('não deve criar weight record se weight_kg for null', async () => {
      mockedRepo.findByOwnerAndName.mockResolvedValue(null)
      mockedRepo.create.mockResolvedValue({ id: 'pet-1', name: 'Rex', species: 'dog' })

      await petsService.createForOwner('user-1', { name: 'Rex', species: 'dog', weight_kg: null })

      expect(mockedRepo.createWeightRecord).not.toHaveBeenCalled()
    })
  })

  describe('updateForOwner', () => {
    const currentPet = { id: 'pet-1', name: 'Rex', species: 'dog', weight_kg: 10, weight_history: [], photo_url: null }

    it('deve atualizar dados básicos', async () => {
      mockedRepo.findByIdAndOwner.mockResolvedValue(currentPet as any)
      mockedRepo.updateByIdAndOwner.mockResolvedValue({ ...currentPet, name: 'Rex 2' })
      mockedRepo.hasWeightRecordForDate.mockResolvedValue(true)

      const result = await petsService.updateForOwner('user-1', 'pet-1', { name: 'Rex 2' })

      expect(result).toMatchObject({ name: 'Rex 2' })
    })

    it('deve rejeitar nome vazio no update', async () => {
      mockedRepo.findByIdAndOwner.mockResolvedValue(currentPet as any)

      await expect(petsService.updateForOwner('user-1', 'pet-1', { name: '' }))
        .rejects.toThrow('obrigatório')
    })

    it('deve rejeitar nome duplicado no update', async () => {
      mockedRepo.findByIdAndOwner.mockResolvedValue(currentPet as any)
      mockedRepo.findByOwnerAndNameExcludingId.mockResolvedValue({ id: 'pet-2' } as any)

      await expect(petsService.updateForOwner('user-1', 'pet-1', { name: 'Rex 2' }))
        .rejects.toThrow('já tem um pet')
    })

    it('deve rastrear mudança de peso no weight_history', async () => {
      const petWithHistory = { ...currentPet, weight_history: [{ weight: 10, date: '2024-01-01' }] }
      mockedRepo.findByIdAndOwner.mockResolvedValue(petWithHistory as any)
      mockedRepo.updateByIdAndOwner.mockResolvedValue({ ...petWithHistory, weight_kg: 12 })
      mockedRepo.hasWeightRecordForDate.mockResolvedValue(false)

      await petsService.updateForOwner('user-1', 'pet-1', { weight_kg: 12 })

      expect(mockedRepo.updateByIdAndOwner).toHaveBeenCalledWith(
        'user-1', 'pet-1',
        expect.objectContaining({
          weight_kg: 12,
          weight_history: expect.arrayContaining([
            expect.objectContaining({ weight: 10 }),
            expect.objectContaining({ weight: 12 }),
          ]),
        }),
      )
      expect(mockedRepo.createWeightRecord).toHaveBeenCalled()
    })

    it('deve deletar foto antiga se photo_url mudar', async () => {
      const petWithPhoto = { ...currentPet, photo_url: 'http://old.photo.jpg' }
      mockedRepo.findByIdAndOwner.mockResolvedValue(petWithPhoto as any)
      mockedRepo.updateByIdAndOwner.mockResolvedValue({ ...petWithPhoto, photo_url: 'http://new.photo.jpg' })
      mockedRepo.hasWeightRecordForDate.mockResolvedValue(true)
      mockedUploads.isManagedCloudinaryUrl.mockReturnValue(true)

      await petsService.updateForOwner('user-1', 'pet-1', { photo_url: 'http://new.photo.jpg' })

      expect(mockedUploads.deleteImageByUrl).toHaveBeenCalledWith('http://old.photo.jpg')
    })

    it('deve rejeitar pet não encontrado', async () => {
      mockedRepo.findByIdAndOwner.mockResolvedValue(null)

      await expect(petsService.updateForOwner('user-1', 'pet-1', { name: 'Rex' }))
        .rejects.toThrow('não encontrado')
    })
  })

  describe('deleteForOwner', () => {
    it('deve deletar pet e foto', async () => {
      mockedRepo.findByIdAndOwner.mockResolvedValue({ id: 'pet-1', photo_url: 'http://photo.jpg' } as any)
      mockedRepo.deleteCascadeByIdAndOwner.mockResolvedValue(true)

      await petsService.deleteForOwner('user-1', 'pet-1')

      expect(mockedRepo.deleteCascadeByIdAndOwner).toHaveBeenCalledWith('user-1', 'pet-1')
      expect(mockedUploads.deleteImageByUrl).toHaveBeenCalledWith('http://photo.jpg')
    })

    it('deve rejeitar se não encontrado', async () => {
      mockedRepo.findByIdAndOwner.mockResolvedValue(null)

      await expect(petsService.deleteForOwner('user-1', 'pet-1')).rejects.toThrow('não encontrado')
    })
  })

  describe('getForOwner', () => {
    it('deve retornar pet do owner', async () => {
      mockedRepo.findByIdAndOwner.mockResolvedValue({ id: 'pet-1' } as any)

      const result = await petsService.getForOwner('user-1', 'pet-1')

      expect(result).toEqual({ id: 'pet-1' })
    })

    it('deve rejeitar se pet não pertence ao owner', async () => {
      mockedRepo.findByIdAndOwner.mockResolvedValue(null)

      await expect(petsService.getForOwner('user-1', 'pet-1')).rejects.toThrow('não encontrado')
    })
  })

  describe('listForOwner', () => {
    it('deve listar pets do owner', async () => {
      mockedRepo.listByOwner.mockResolvedValue([{ id: 'pet-1' } as any])

      const result = await petsService.listForOwner('user-1')

      expect(result).toHaveLength(1)
    })
  })
})
