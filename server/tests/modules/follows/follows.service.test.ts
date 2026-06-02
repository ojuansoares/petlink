import { followsService } from '../../../src/modules/follows/follows.service'
import { followsRepository } from '../../../src/modules/follows/follows.repository'
import { supabaseAdmin } from '../../../src/config/supabase'
import { sendPush } from '../../../src/modules/push/push.service'

jest.mock('../../../src/modules/follows/follows.repository')
jest.mock('../../../src/config/supabase')
jest.mock('../../../src/modules/push/push.service')

const mockedRepo = jest.mocked(followsRepository)
const mockedSupabase = jest.mocked(supabaseAdmin)
const mockedSendPush = jest.mocked(sendPush)

describe('followsService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('follow', () => {
    it('deve seguir usuário e enviar push', async () => {
      mockedRepo.create.mockResolvedValue({ id: 'f1' } as any)

      const mockMaybeSingle = jest.fn().mockResolvedValue({ data: { name: 'João' }, error: null })
      const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
      mockedSupabase.from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: mockEq }) } as any)

      const result = await followsService.follow('u1', 'u2')

      expect(result).toEqual({ alreadyFollowing: false })
      expect(mockedRepo.create).toHaveBeenCalledWith('u1', 'u2')
      expect(mockedSendPush).toHaveBeenCalledWith(
        'u2',
        'social',
        'Novo seguidor',
        'João começou a seguir você',
        { screen: 'PublicProfile', userId: 'u1' },
      )
    })

    it('não deve permitir seguir a si mesmo', async () => {
      await expect(followsService.follow('u1', 'u1')).rejects.toThrow('seguir a si mesmo')
      expect(mockedRepo.create).not.toHaveBeenCalled()
    })

    it('deve retornar alreadyFollowing se duplicado', async () => {
      mockedRepo.create.mockResolvedValue(null)

      const result = await followsService.follow('u1', 'u2')

      expect(result).toEqual({ alreadyFollowing: true })
      expect(mockedSendPush).not.toHaveBeenCalled()
    })
  })

  describe('unfollow', () => {
    it('deve deixar de seguir', async () => {
      mockedRepo.delete.mockResolvedValue()

      const result = await followsService.unfollow('u1', 'u2')

      expect(result).toBe(true)
      expect(mockedRepo.delete).toHaveBeenCalledWith('u1', 'u2')
    })
  })

  describe('isFollowing', () => {
    it('deve retornar true quando segue', async () => {
      mockedRepo.exists.mockResolvedValue(true)

      const result = await followsService.isFollowing('u1', 'u2')

      expect(result).toEqual({ isFollowing: true })
    })

    it('deve retornar false quando não segue', async () => {
      mockedRepo.exists.mockResolvedValue(false)

      const result = await followsService.isFollowing('u1', 'u2')

      expect(result).toEqual({ isFollowing: false })
    })
  })

  describe('getFollowers / getFollowing', () => {
    it('deve listar seguidores', async () => {
      const mockData = [{ profiles: { id: 'u2', name: 'Maria' } }]
      mockedRepo.listFollowers.mockResolvedValue({ followers: mockData as any, hasMore: false })

      const result = await followsService.getFollowers('u1', 10, 0)

      expect(result.followers).toEqual(mockData)
      expect(result.hasMore).toBe(false)
    })

    it('deve listar seguindo', async () => {
      const mockData = [{ profiles: { id: 'u3', name: 'Pedro' } }]
      mockedRepo.listFollowing.mockResolvedValue({ following: mockData as any, hasMore: false })

      const result = await followsService.getFollowing('u1', 10, 0)

      expect(result.following).toEqual(mockData)
    })
  })
})
