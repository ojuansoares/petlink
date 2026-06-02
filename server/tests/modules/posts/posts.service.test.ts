import { postsService } from '../../../src/modules/posts/posts.service'
import { postsRepository } from '../../../src/modules/posts/posts.repository'
import { petsRepository } from '../../../src/modules/pets/pets.repository'
import { groupsRepository } from '../../../src/modules/groups/groups.repository'
import { uploadsService } from '../../../src/modules/uploads/uploads.service'
import { supabaseAdmin } from '../../../src/config/supabase'

jest.mock('../../../src/modules/posts/posts.repository')
jest.mock('../../../src/modules/pets/pets.repository')
jest.mock('../../../src/modules/groups/groups.repository')
jest.mock('../../../src/modules/uploads/uploads.service')
jest.mock('../../../src/config/supabase')
jest.mock('../../../src/modules/push/push.service')

const mockedPostsRepo = jest.mocked(postsRepository)
const mockedPetsRepo = jest.mocked(petsRepository)
const mockedGroupsRepo = jest.mocked(groupsRepository)
const mockedUploads = jest.mocked(uploadsService)
const mockedSupabase = jest.mocked(supabaseAdmin)

describe('postsService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('create — post normal', () => {
    it('deve criar post com foto e pet', async () => {
      mockedPetsRepo.findByIdAndOwner.mockResolvedValue({ id: 'pet-1' } as any)
      mockedPostsRepo.create.mockResolvedValue({ id: 'post-1', image_url: 'http://foto.jpg', pet_ids: ['pet-1'] } as any)

      const result = await postsService.create('user-1', {
        image_url: 'http://foto.jpg',
        pet_ids: ['pet-1'],
        caption: 'Meu pet!',
      })

      expect(result).toMatchObject({ id: 'post-1' })
      expect(mockedPostsRepo.create).toHaveBeenCalled()
    })

    it('deve rejeitar post normal sem imagem', async () => {
      await expect(postsService.create('user-1', { pet_ids: ['pet-1'], caption: 'teste' }))
        .rejects.toThrow('obrigatória')
    })

    it('deve rejeitar post normal sem pet', async () => {
      await expect(postsService.create('user-1', { image_url: 'http://foto.jpg', pet_ids: [] }))
        .rejects.toThrow('pelo menos um pet')
    })

    it('deve rejeitar se pet não pertence ao usuário', async () => {
      mockedPetsRepo.findByIdAndOwner.mockResolvedValue(null)

      await expect(postsService.create('user-1', { image_url: 'http://foto.jpg', pet_ids: ['pet-1'] }))
        .rejects.toThrow('Pet não encontrado')
    })
  })

  describe('create — post em grupo', () => {
    const groupPayload = { group_id: 'group-1', caption: 'Olá grupo!', pet_ids: [] }

    it('deve criar post em grupo e enviar push para membros', async () => {
      mockedGroupsRepo.findMembership.mockResolvedValue({ role: 'member' } as any)
      mockedGroupsRepo.getMembers.mockResolvedValue([
        { user_id: 'user-1', name: 'Eu' },
        { user_id: 'user-2', name: 'Maria' },
        { user_id: 'user-3', name: 'João' },
      ] as any)
      mockedPostsRepo.create.mockResolvedValue({ id: 'post-1' } as any)

      const mockMaybeSingle = jest.fn().mockResolvedValue({ data: { name: 'João' }, error: null })
      mockedSupabase.from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }) }) } as any)

      await postsService.create('user-1', groupPayload)

      expect(mockedPostsRepo.create).toHaveBeenCalled()
    })

    it('deve rejeitar post em grupo sem texto e sem foto', async () => {
      mockedGroupsRepo.findMembership.mockResolvedValue({ role: 'member' } as any)

      await expect(postsService.create('user-1', { group_id: 'group-1', pet_ids: [] }))
        .rejects.toThrow('Adicione um texto ou uma foto')
    })

    it('deve rejeitar se não é membro do grupo', async () => {
      mockedGroupsRepo.findMembership.mockResolvedValue(null)

      await expect(postsService.create('user-1', groupPayload))
        .rejects.toThrow('não é membro')
    })
  })

  describe('update', () => {
    it('deve atualizar caption', async () => {
      mockedPostsRepo.findByIdAndAuthor.mockResolvedValue({ id: 'post-1', image_url: 'http://foto.jpg' } as any)
      mockedPostsRepo.updateByIdAndAuthor.mockResolvedValue({ id: 'post-1', caption: 'Novo texto' } as any)

      const result = await postsService.update('user-1', 'post-1', { caption: 'Novo texto' })

      expect(result).toMatchObject({ caption: 'Novo texto' })
    })

    it('deve rejeitar se não encontrado', async () => {
      mockedPostsRepo.findByIdAndAuthor.mockResolvedValue(null)

      await expect(postsService.update('user-1', 'post-1', { caption: 'teste' }))
        .rejects.toThrow('não encontrado')
    })

    it('deve deletar foto antiga se trocar', async () => {
      mockedPostsRepo.findByIdAndAuthor.mockResolvedValue({ id: 'post-1', image_url: 'http://old.photo.jpg' } as any)
      mockedPostsRepo.updateByIdAndAuthor.mockResolvedValue({ id: 'post-1', image_url: 'http://new.photo.jpg' } as any)
      mockedUploads.isManagedCloudinaryUrl.mockReturnValue(true)

      await postsService.update('user-1', 'post-1', { image_url: 'http://new.photo.jpg' })

      expect(mockedUploads.deleteImageByUrl).toHaveBeenCalledWith('http://old.photo.jpg')
    })
  })

  describe('delete', () => {
    it('deve deletar post e foto', async () => {
      mockedPostsRepo.findByIdAndAuthor.mockResolvedValue({ id: 'post-1', image_url: 'http://foto.jpg' } as any)
      mockedPostsRepo.deleteByIdAndAuthor.mockResolvedValue()

      const result = await postsService.delete('user-1', 'post-1')

      expect(result).toBe(true)
      expect(mockedUploads.deleteImageByUrl).toHaveBeenCalledWith('http://foto.jpg')
    })

    it('deve rejeitar se não encontrado', async () => {
      mockedPostsRepo.findByIdAndAuthor.mockResolvedValue(null)

      await expect(postsService.delete('user-1', 'post-1')).rejects.toThrow('não encontrado')
    })
  })

  describe('togglePin', () => {
    it('deve fixar post (pin)', async () => {
      mockedPostsRepo.findByIdAndAuthor.mockResolvedValue({ id: 'post-1', is_pinned: false } as any)
      mockedPostsRepo.countPinnedByAuthor.mockResolvedValue(0)
      mockedPostsRepo.updateByIdAndAuthor.mockResolvedValue({ id: 'post-1', is_pinned: true } as any)

      const result = await postsService.togglePin('user-1', 'post-1')

      expect(result).toMatchObject({ is_pinned: true })
    })

    it('deve rejeitar se já tem 3 pins', async () => {
      mockedPostsRepo.findByIdAndAuthor.mockResolvedValue({ id: 'post-1', is_pinned: false } as any)
      mockedPostsRepo.countPinnedByAuthor.mockResolvedValue(3)

      await expect(postsService.togglePin('user-1', 'post-1')).rejects.toThrow('máximo')
    })

    it('deve desafixar post (unpin)', async () => {
      mockedPostsRepo.findByIdAndAuthor.mockResolvedValue({ id: 'post-1', is_pinned: true } as any)

      await postsService.togglePin('user-1', 'post-1')

      expect(mockedPostsRepo.updateByIdAndAuthor).toHaveBeenCalledWith('user-1', 'post-1', { is_pinned: false })
    })
  })

  describe('getFeed / getByAuthor / getFollowed', () => {
    it('deve retornar feed', async () => {
      mockedPostsRepo.listFeed.mockResolvedValue({ posts: [{ id: 'post-1' } as any], hasMore: false })

      const result = await postsService.getFeed('user-1', 1, 20)

      expect(result.posts).toHaveLength(1)
    })

    it('deve retornar posts por autor', async () => {
      mockedPostsRepo.listByAuthor.mockResolvedValue({ posts: [{ id: 'post-1' } as any], hasMore: false })

      const result = await postsService.getByAuthor('user-2', 1, 12)

      expect(result.posts).toHaveLength(1)
    })
  })
})
