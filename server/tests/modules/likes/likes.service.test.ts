import { likesService } from '../../../src/modules/likes/likes.service'
import { likesRepository } from '../../../src/modules/likes/likes.repository'
import { Post } from '../../../src/models/Post'
import { supabaseAdmin } from '../../../src/config/supabase'
import { sendPush } from '../../../src/modules/push/push.service'

jest.mock('../../../src/modules/likes/likes.repository')
jest.mock('../../../src/models/Post')
jest.mock('../../../src/config/supabase')
jest.mock('../../../src/modules/push/push.service')

const mockedLikesRepo = jest.mocked(likesRepository)
const mockedPost = jest.mocked(Post)
const mockedSupabase = jest.mocked(supabaseAdmin)
const mockedSendPush = jest.mocked(sendPush)

describe('likesService.toggle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('deve adicionar like e enviar push quando autor é diferente', async () => {
    const postId = '507f1f77bcf86cd799439011'
    const userId = 'user-123'
    const authorId = 'author-456'

    mockedLikesRepo.toggle.mockResolvedValue({ liked: true, likesCount: 1 })

    const mockLean = jest.fn().mockReturnValue({ authorId, likesCount: 1 })
    mockedPost.findById.mockReturnValue({ lean: mockLean } as any)

    const mockMaybeSingle = jest.fn().mockResolvedValue({ data: { name: 'João' }, error: null })
    const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
    mockedSupabase.from.mockReturnValue({ select: mockSelect } as any)

    const result = await likesService.toggle(postId, userId)

    expect(result).toEqual({ liked: true, likesCount: 1 })
    expect(mockedLikesRepo.toggle).toHaveBeenCalledWith(postId, userId)
    expect(mockedPost.findById).toHaveBeenCalledWith(postId)
    expect(mockMaybeSingle).toHaveBeenCalled()
    expect(mockedSendPush).toHaveBeenCalledWith(
      authorId,
      'social',
      'Nova curtida',
      'João curtiu seu post',
      { screen: 'Post', postId, userId: authorId },
    )
  })

  it('não deve enviar push quando o like é removido (unlike)', async () => {
    const postId = '507f1f77bcf86cd799439011'
    const userId = 'user-123'

    mockedLikesRepo.toggle.mockResolvedValue({ liked: false, likesCount: 0 })

    const result = await likesService.toggle(postId, userId)

    expect(result).toEqual({ liked: false, likesCount: 0 })
    expect(mockedSendPush).not.toHaveBeenCalled()
  })

  it('não deve enviar push quando usuário curte próprio post', async () => {
    const postId = '507f1f77bcf86cd799439011'
    const userId = 'user-123'

    mockedLikesRepo.toggle.mockResolvedValue({ liked: true, likesCount: 1 })

    const mockLean = jest.fn().mockReturnValue({ authorId: userId, likesCount: 1 })
    mockedPost.findById.mockReturnValue({ lean: mockLean } as any)

    const result = await likesService.toggle(postId, userId)

    expect(result).toEqual({ liked: true, likesCount: 1 })
    expect(mockedSendPush).not.toHaveBeenCalled()
  })

  it('não deve enviar push quando post não é encontrado', async () => {
    const postId = '507f1f77bcf86cd799439011'
    const userId = 'user-123'

    mockedLikesRepo.toggle.mockResolvedValue({ liked: true, likesCount: 1 })

    const mockLean = jest.fn().mockReturnValue(null)
    mockedPost.findById.mockReturnValue({ lean: mockLean } as any)

    const result = await likesService.toggle(postId, userId)

    expect(result).toEqual({ liked: true, likesCount: 1 })
    expect(mockedSendPush).not.toHaveBeenCalled()
  })
})
