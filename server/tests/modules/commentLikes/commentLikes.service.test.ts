import { commentLikesService } from '../../../src/modules/commentLikes/commentLikes.service'
import { commentLikesRepository } from '../../../src/modules/commentLikes/commentLikes.repository'
import { Comment } from '../../../src/models/Comment'
import { supabaseAdmin } from '../../../src/config/supabase'
import { sendPush } from '../../../src/modules/push/push.service'

jest.mock('../../../src/modules/commentLikes/commentLikes.repository')
jest.mock('../../../src/models/Comment')
jest.mock('../../../src/config/supabase')
jest.mock('../../../src/modules/push/push.service')

const mockedRepo = jest.mocked(commentLikesRepository)
const mockedComment = jest.mocked(Comment)
const mockedSupabase = jest.mocked(supabaseAdmin)
const mockedSendPush = jest.mocked(sendPush)

describe('commentLikesService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('toggle', () => {
    it('deve adicionar like e enviar push quando autor é diferente', async () => {
      mockedRepo.toggle.mockResolvedValue({ liked: true, likesCount: 1 })

      const mockLean = jest.fn().mockReturnValue({ authorId: 'author-456', postId: 'post-1' })
      mockedComment.findById.mockReturnValue({ lean: mockLean } as any)

      const mockMaybeSingle = jest.fn().mockResolvedValue({ data: { name: 'João' }, error: null })
      const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
      mockedSupabase.from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: mockEq }) } as any)

      const result = await commentLikesService.toggle('comment-1', 'user-123')

      expect(result).toEqual({ liked: true, likesCount: 1 })
      expect(mockedRepo.toggle).toHaveBeenCalledWith('comment-1', 'user-123')
      expect(mockedSendPush).toHaveBeenCalledWith(
        'author-456',
        'social',
        'Nova curtida no comentário',
        'João curtiu seu comentário',
        { screen: 'Post', postId: 'post-1', userId: 'author-456' },
      )
    })

    it('não deve enviar push quando o like é removido', async () => {
      mockedRepo.toggle.mockResolvedValue({ liked: false, likesCount: 0 })

      const result = await commentLikesService.toggle('comment-1', 'user-123')

      expect(result).toEqual({ liked: false, likesCount: 0 })
      expect(mockedSendPush).not.toHaveBeenCalled()
    })

    it('não deve enviar push quando usuário curte próprio comentário', async () => {
      mockedRepo.toggle.mockResolvedValue({ liked: true, likesCount: 1 })

      const mockLean = jest.fn().mockReturnValue({ authorId: 'user-123' })
      mockedComment.findById.mockReturnValue({ lean: mockLean } as any)

      const result = await commentLikesService.toggle('comment-1', 'user-123')

      expect(result).toEqual({ liked: true, likesCount: 1 })
      expect(mockedSendPush).not.toHaveBeenCalled()
    })
  })

  describe('status', () => {
    it('deve retornar status do like', async () => {
      mockedRepo.status.mockResolvedValue({ liked: true, likesCount: 3 })

      const result = await commentLikesService.status('comment-1', 'user-123')

      expect(result).toEqual({ liked: true, likesCount: 3 })
    })
  })
})
