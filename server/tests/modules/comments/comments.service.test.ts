import { commentsService } from '../../../src/modules/comments/comments.service'
import { commentsRepository } from '../../../src/modules/comments/comments.repository'
import { Post } from '../../../src/models/Post'
import { supabaseAdmin } from '../../../src/config/supabase'
import { sendPush } from '../../../src/modules/push/push.service'

jest.mock('../../../src/modules/comments/comments.repository')
jest.mock('../../../src/models/Post')
jest.mock('../../../src/config/supabase')
jest.mock('../../../src/modules/push/push.service')

const mockedRepo = jest.mocked(commentsRepository)
const mockedPost = jest.mocked(Post)
const mockedSupabase = jest.mocked(supabaseAdmin)
const mockedSendPush = jest.mocked(sendPush)

function setupSupabaseChain(profiles: any[] = [], profileResult = { data: { name: 'João' }, error: null }) {
  const mockMaybeSingle = jest.fn().mockResolvedValue(profileResult)
  const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
  const mockIn = jest.fn().mockResolvedValue({ data: profiles, error: null })
  const selectChain = { in: mockIn, eq: mockEq, maybeSingle: mockMaybeSingle }
  mockedSupabase.from.mockReturnValue({ select: jest.fn().mockReturnValue(selectChain) } as any)
  return { mockIn, mockEq, mockMaybeSingle }
}

describe('commentsService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('deve criar comentário e enviar push pro autor do post', async () => {
      const comment = { id: 'c1', authorId: 'u2', content: 'Belo post!' }
      mockedRepo.create.mockResolvedValue(comment as any)
      setupSupabaseChain([{ id: 'u2', name: 'João', avatar_url: null, level: 1 }])

      const mockLean = jest.fn().mockReturnValue({ authorId: 'u1', likesCount: 10 })
      mockedPost.findById.mockReturnValue({ lean: mockLean } as any)

      const result = await commentsService.create('post-1', 'u2', 'Belo post!')

      expect(result).toMatchObject({ id: 'c1', content: 'Belo post!' })
      expect(mockedRepo.create).toHaveBeenCalledWith('post-1', 'u2', 'Belo post!')
      expect(mockedSendPush).toHaveBeenCalledWith(
        'u1',
        'social',
        'Novo comentário',
        'João comentou no seu post',
        { screen: 'Post', postId: 'post-1', userId: 'u1' },
      )
    })

    it('não deve enviar push se comenta próprio post', async () => {
      mockedRepo.create.mockResolvedValue({ id: 'c1', authorId: 'u1', content: 'Teste' } as any)
      setupSupabaseChain([{ id: 'u1', name: 'Eu', avatar_url: null, level: 1 }])

      const mockLean = jest.fn().mockReturnValue({ authorId: 'u1' })
      mockedPost.findById.mockReturnValue({ lean: mockLean } as any)

      await commentsService.create('post-1', 'u1', 'Teste')

      expect(mockedSendPush).not.toHaveBeenCalled()
    })

    it('deve rejeitar conteúdo vazio', async () => {
      await expect(commentsService.create('post-1', 'u1', '  ')).rejects.toThrow('obrigatório')
      expect(mockedRepo.create).not.toHaveBeenCalled()
    })

    it('deve rejeitar conteúdo vazio (string vazia)', async () => {
      await expect(commentsService.create('post-1', 'u1', '')).rejects.toThrow('obrigatório')
    })

    it('não deve enviar push se post não existe', async () => {
      mockedRepo.create.mockResolvedValue({ id: 'c1' } as any)
      setupSupabaseChain([{ id: 'u1', name: 'João', avatar_url: null, level: 1 }])

      const mockLean = jest.fn().mockReturnValue(null)
      mockedPost.findById.mockReturnValue({ lean: mockLean } as any)

      await commentsService.create('post-1', 'u2', 'Comentário')

      expect(mockedSendPush).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('deve atualizar comentário', async () => {
      const updated = { id: 'c1', authorId: 'u1', content: 'Editado' }
      mockedRepo.update.mockResolvedValue(updated as any)
      setupSupabaseChain([{ id: 'u1', name: 'João', avatar_url: null, level: 1 }])

      const result = await commentsService.update('c1', 'u1', 'Editado')

      expect(result).toMatchObject({ id: 'c1', content: 'Editado' })
    })

    it('deve rejeitar conteúdo vazio no update', async () => {
      await expect(commentsService.update('c1', 'u1', '')).rejects.toThrow('obrigatório')
    })

    it('deve rejeitar se comentário não encontrado', async () => {
      mockedRepo.update.mockResolvedValue(null)

      await expect(commentsService.update('c1', 'u1', 'Novo')).rejects.toThrow('não encontrado')
    })
  })

  describe('delete', () => {
    it('deve deletar comentário', async () => {
      mockedRepo.delete.mockResolvedValue(true as any)

      await commentsService.delete('c1', 'u1')

      expect(mockedRepo.delete).toHaveBeenCalledWith('c1', 'u1')
    })

    it('deve rejeitar se não encontrado', async () => {
      mockedRepo.delete.mockResolvedValue(null)

      await expect(commentsService.delete('c1', 'u1')).rejects.toThrow('não encontrado')
    })
  })

  describe('listByPost', () => {
    it('deve listar comentários paginados com perfis', async () => {
      const comments = [
        { id: 'c1', authorId: 'u1', content: 'Primeiro' },
        { id: 'c2', authorId: 'u2', content: 'Segundo' },
      ]
      mockedRepo.listByPost.mockResolvedValue({ data: comments as any, total: 2 })
      setupSupabaseChain([
        { id: 'u1', name: 'João', avatar_url: null, level: 1 },
        { id: 'u2', name: 'Maria', avatar_url: 'http://avatar.url', level: 2 },
      ])

      const result = await commentsService.listByPost('post-1', 1, 10)

      expect(result.data).toHaveLength(2)
      expect(result.data[0].username).toBe('João')
      expect(result.data[1].username).toBe('Maria')
      expect(result.hasMore).toBe(false)
    })

    it('deve retornar lista vazia sem perfis', async () => {
      mockedRepo.listByPost.mockResolvedValue({ data: [], total: 0 })

      const result = await commentsService.listByPost('post-1')

      expect(result.data).toHaveLength(0)
      expect(result.total).toBe(0)
      expect(result.hasMore).toBe(false)
    })
  })

  describe('togglePin', () => {
    it('deve alternar pin', async () => {
      const pinned = { id: 'c1', isPinned: true }
      mockedRepo.togglePin.mockResolvedValue(pinned as any)
      setupSupabaseChain([{ id: 'u1', name: 'João', avatar_url: null, level: 1 }])

      const result = await commentsService.togglePin('c1', 'post-1', 'u1')

      expect(result).toMatchObject({ id: 'c1', isPinned: true })
    })

    it('deve rejeitar se repo retorna null', async () => {
      mockedRepo.togglePin.mockResolvedValue(null)

      await expect(commentsService.togglePin('c1', 'post-1', 'u1')).rejects.toThrow('não encontrado')
    })
  })
})
