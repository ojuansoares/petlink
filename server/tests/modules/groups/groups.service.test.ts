import { groupsService } from '../../../src/modules/groups/groups.service'
import { groupsRepository } from '../../../src/modules/groups/groups.repository'
import { postsRepository } from '../../../src/modules/posts/posts.repository'
import { supabaseAdmin } from '../../../src/config/supabase'

jest.mock('../../../src/modules/groups/groups.repository')
jest.mock('../../../src/modules/posts/posts.repository')
jest.mock('../../../src/config/supabase')
jest.mock('../../../src/modules/push/push.service')

const mockedRepo = jest.mocked(groupsRepository)
const mockedPostsRepo = jest.mocked(postsRepository)
const mockedSupabase = jest.mocked(supabaseAdmin)

const mockProfileSelect = () => {
  const mockSingle = jest.fn().mockResolvedValue({ data: { name: 'João' }, error: null })
  const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockSingle })
  const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
  mockedSupabase.from.mockReturnValue({ select: mockSelect } as any)
  return { mockSingle, mockEq, mockSelect }
}

describe('groupsService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('deve criar grupo e adicionar owner', async () => {
      const group = { id: 'g1', name: 'Meu Grupo', description: 'Desc', created_by: 'u1' }
      mockedRepo.create.mockResolvedValue(group as any)
      mockedRepo.addMember.mockResolvedValue()

      const result = await groupsService.create({ name: 'Meu Grupo' }, 'u1')

      expect(result).toEqual(group)
      expect(mockedRepo.create).toHaveBeenCalledWith({ name: 'Meu Grupo' }, 'u1')
      expect(mockedRepo.addMember).toHaveBeenCalledWith('g1', 'u1', 'owner')
    })

    it('deve rejeitar nome vazio', async () => {
      await expect(groupsService.create({ name: '  ' }, 'u1')).rejects.toThrow('obrigatório')
      await expect(groupsService.create({ name: '' }, 'u1')).rejects.toThrow('obrigatório')
      expect(mockedRepo.create).not.toHaveBeenCalled()
    })

    it('deve rejeitar nome com mais de 100 caracteres', async () => {
      await expect(groupsService.create({ name: 'a'.repeat(101) }, 'u1')).rejects.toThrow('muito longo')
      expect(mockedRepo.create).not.toHaveBeenCalled()
    })
  })

  describe('join', () => {
    it('deve adicionar membro em grupo público', async () => {
      mockedRepo.findById.mockResolvedValue({ id: 'g1', is_public: true } as any)
      mockedRepo.findMembership.mockResolvedValue(null)
      mockedRepo.addMember.mockResolvedValue()

      const result = await groupsService.join('g1', 'u2')

      expect(result).toEqual({ success: true })
      expect(mockedRepo.addMember).toHaveBeenCalledWith('g1', 'u2', 'member')
    })

    it('deve rejeitar se grupo não existe', async () => {
      mockedRepo.findById.mockResolvedValue(null)

      await expect(groupsService.join('g1', 'u2')).rejects.toThrow('não encontrado')
      expect(mockedRepo.addMember).not.toHaveBeenCalled()
    })

    it('deve rejeitar se grupo é privado', async () => {
      mockedRepo.findById.mockResolvedValue({ id: 'g1', is_public: false } as any)

      await expect(groupsService.join('g1', 'u2')).rejects.toThrow('privado')
      expect(mockedRepo.addMember).not.toHaveBeenCalled()
    })

    it('deve rejeitar se usuário já é membro', async () => {
      mockedRepo.findById.mockResolvedValue({ id: 'g1', is_public: true } as any)
      mockedRepo.findMembership.mockResolvedValue({ id: 'm1', role: 'member' } as any)

      await expect(groupsService.join('g1', 'u2')).rejects.toThrow('já é membro')
      expect(mockedRepo.addMember).not.toHaveBeenCalled()
    })
  })

  describe('leave', () => {
    it('deve remover membro', async () => {
      mockedRepo.findMembership.mockResolvedValue({ id: 'm1', role: 'member' } as any)
      mockedRepo.removeMember.mockResolvedValue()

      const result = await groupsService.leave('g1', 'u2')

      expect(result).toEqual({ success: true })
      expect(mockedRepo.removeMember).toHaveBeenCalledWith('g1', 'u2')
    })

    it('deve rejeitar se não é membro', async () => {
      mockedRepo.findMembership.mockResolvedValue(null)

      await expect(groupsService.leave('g1', 'u2')).rejects.toThrow('não é membro')
    })

    it('deve rejeitar se é owner', async () => {
      mockedRepo.findMembership.mockResolvedValue({ id: 'm1', role: 'owner' } as any)

      await expect(groupsService.leave('g1', 'u1')).rejects.toThrow('dono não pode sair')
    })
  })

  describe('togglePinPost', () => {
    const post = { id: 'p1', is_pinned: false, groupId: 'g1' }
    const pinnedPost = { id: 'p2', is_pinned: true, groupId: 'g1' }

    it('admin pode fixar post', async () => {
      mockedRepo.findMembership.mockResolvedValue({ role: 'admin' } as any)
      mockedPostsRepo.findByIdInGroup.mockResolvedValue(post as any)
      mockedPostsRepo.countPinnedByGroup.mockResolvedValue(0)
      mockedPostsRepo.togglePinInGroup.mockResolvedValue(post as any)

      await groupsService.togglePinPost('g1', 'p1', 'u1')

      expect(mockedPostsRepo.togglePinInGroup).toHaveBeenCalledWith('p1', 'g1')
    })

    it('owner pode fixar post', async () => {
      mockedRepo.findMembership.mockResolvedValue({ role: 'owner' } as any)
      mockedPostsRepo.findByIdInGroup.mockResolvedValue(post as any)
      mockedPostsRepo.countPinnedByGroup.mockResolvedValue(0)

      await groupsService.togglePinPost('g1', 'p1', 'u1')

      expect(mockedPostsRepo.togglePinInGroup).toHaveBeenCalledWith('p1', 'g1')
    })

    it('member não pode fixar', async () => {
      mockedRepo.findMembership.mockResolvedValue({ role: 'member' } as any)

      await expect(groupsService.togglePinPost('g1', 'p1', 'u1')).rejects.toThrow('Apenas administradores')
      expect(mockedPostsRepo.togglePinInGroup).not.toHaveBeenCalled()
    })

    it('deve rejeitar se post não existe no grupo', async () => {
      mockedRepo.findMembership.mockResolvedValue({ role: 'admin' } as any)
      mockedPostsRepo.findByIdInGroup.mockResolvedValue(null)

      await expect(groupsService.togglePinPost('g1', 'p1', 'u1')).rejects.toThrow('não encontrado')
    })

    it('deve rejeitar se já tem 2 pins e post não está fixado', async () => {
      mockedRepo.findMembership.mockResolvedValue({ role: 'admin' } as any)
      mockedPostsRepo.findByIdInGroup.mockResolvedValue(post as any)
      mockedPostsRepo.countPinnedByGroup.mockResolvedValue(2)

      await expect(groupsService.togglePinPost('g1', 'p1', 'u1')).rejects.toThrow('Máximo de 2')
      expect(mockedPostsRepo.togglePinInGroup).not.toHaveBeenCalled()
    })

    it('deve permitir desafixar mesmo com 2 pins (post já está fixado)', async () => {
      mockedRepo.findMembership.mockResolvedValue({ role: 'admin' } as any)
      mockedPostsRepo.findByIdInGroup.mockResolvedValue(pinnedPost as any)
      mockedPostsRepo.countPinnedByGroup.mockResolvedValue(2)

      await groupsService.togglePinPost('g1', 'p2', 'u1')

      expect(mockedPostsRepo.togglePinInGroup).toHaveBeenCalledWith('p2', 'g1')
    })
  })

  describe('inviteUser', () => {
    it('admin pode convidar usuário que não é membro', async () => {
      mockedRepo.findMembership.mockResolvedValueOnce({ role: 'admin' } as any)
      mockedRepo.findById.mockResolvedValue({ id: 'g1', name: 'Meu Grupo' } as any)
      mockedRepo.findMembership.mockResolvedValueOnce(null)
      mockedRepo.findPendingInvite.mockResolvedValue(null)
      mockedRepo.createInvite.mockResolvedValue({ id: 'inv1' } as any)

      mockProfileSelect()

      const result = await groupsService.inviteUser('g1', 'u3', 'u1')

      expect(result).toEqual({ id: 'inv1' })
      expect(mockedRepo.createInvite).toHaveBeenCalledWith('g1', 'u3', 'u1')
    })

    it('não pode convidar a si mesmo', async () => {
      await expect(groupsService.inviteUser('g1', 'u1', 'u1')).rejects.toThrow('convidar a si mesmo')
    })

    it('member não pode convidar', async () => {
      mockedRepo.findMembership.mockResolvedValue({ role: 'member' } as any)

      await expect(groupsService.inviteUser('g1', 'u3', 'u2')).rejects.toThrow('Apenas administradores')
    })

    it('não pode convidar quem já é membro', async () => {
      mockedRepo.findMembership
        .mockResolvedValueOnce({ role: 'admin' } as any)
        .mockResolvedValueOnce({ id: 'm1' } as any)

      await expect(groupsService.inviteUser('g1', 'u3', 'u1')).rejects.toThrow('já é membro')
    })
  })

  describe('changeMemberRole', () => {
    it('admin pode promover member a admin', async () => {
      mockedRepo.findMembership
        .mockResolvedValueOnce({ role: 'owner' } as any)
        .mockResolvedValueOnce({ role: 'member' } as any)

      await groupsService.changeMemberRole('g1', 'u2', 'admin', 'u1')

      expect(mockedRepo.updateMemberRole).toHaveBeenCalledWith('g1', 'u2', 'admin')
    })

    it('owner pode rebaixar admin a member', async () => {
      mockedRepo.findMembership
        .mockResolvedValueOnce({ role: 'owner' } as any)
        .mockResolvedValueOnce({ role: 'admin' } as any)

      await groupsService.changeMemberRole('g1', 'u2', 'member', 'u1')

      expect(mockedRepo.updateMemberRole).toHaveBeenCalledWith('g1', 'u2', 'member')
    })

    it('member não pode alterar cargo', async () => {
      mockedRepo.findMembership.mockResolvedValueOnce({ role: 'member' } as any)

      await expect(groupsService.changeMemberRole('g1', 'u2', 'admin', 'u1')).rejects.toThrow('Apenas administradores')
    })

    it('não pode alterar cargo do owner', async () => {
      mockedRepo.findMembership
        .mockResolvedValueOnce({ role: 'owner' } as any)
        .mockResolvedValueOnce({ role: 'owner' } as any)

      await expect(groupsService.changeMemberRole('g1', 'u2', 'member', 'u1')).rejects.toThrow('cargo do dono')
    })

    it('deve rejeitar cargo inválido', async () => {
      await expect(groupsService.changeMemberRole('g1', 'u2', 'owner', 'u1')).rejects.toThrow('Cargo inválido')
    })
  })

  describe('deleteGroup', () => {
    it('owner pode deletar', async () => {
      mockedRepo.findMembership.mockResolvedValue({ role: 'owner' } as any)
      mockedRepo.delete.mockResolvedValue()

      const result = await groupsService.deleteGroup('g1', 'u1')

      expect(result).toEqual({ success: true })
      expect(mockedRepo.delete).toHaveBeenCalledWith('g1')
    })

    it('admin não pode deletar', async () => {
      mockedRepo.findMembership.mockResolvedValue({ role: 'admin' } as any)

      await expect(groupsService.deleteGroup('g1', 'u1')).rejects.toThrow('Apenas o dono pode deletar')
    })
  })

  describe('removeMember', () => {
    it('admin pode remover member', async () => {
      mockedRepo.findMembership
        .mockResolvedValueOnce({ role: 'admin' } as any)
        .mockResolvedValueOnce({ role: 'member' } as any)
      mockedRepo.removeMember.mockResolvedValue()

      await groupsService.removeMember('g1', 'u2', 'u1')

      expect(mockedRepo.removeMember).toHaveBeenCalledWith('g1', 'u2')
    })

    it('usuário pode sair sozinho (requester = target)', async () => {
      mockedRepo.findMembership.mockResolvedValueOnce({ role: 'member' } as any)
      mockedRepo.removeMember.mockResolvedValue()

      await groupsService.removeMember('g1', 'u2', 'u2')

      expect(mockedRepo.removeMember).toHaveBeenCalledWith('g1', 'u2')
    })

    it('admin não pode remover owner', async () => {
      mockedRepo.findMembership
        .mockResolvedValueOnce({ role: 'admin' } as any)
        .mockResolvedValueOnce({ role: 'owner' } as any)

      await expect(groupsService.removeMember('g1', 'u1', 'u2')).rejects.toThrow('remover o dono')
    })

    it('member não pode remover outro', async () => {
      mockedRepo.findMembership.mockResolvedValueOnce({ role: 'member' } as any)

      await expect(groupsService.removeMember('g1', 'u3', 'u2')).rejects.toThrow('Apenas administradores')
    })
  })

  describe('getDetails', () => {
    it('deve retornar detalhes do grupo público mesmo sem membership', async () => {
      mockedRepo.findById.mockResolvedValue({ id: 'g1', is_public: true } as any)
      mockedRepo.findMembership.mockResolvedValue(null)
      mockedRepo.getMembers.mockResolvedValue([])
      mockedRepo.findPendingInvite.mockResolvedValue(null)

      const result = await groupsService.getDetails('g1', 'u2')

      expect(result).toMatchObject({ id: 'g1', is_public: true, my_role: null, pendingInviteId: null })
    })

    it('deve retornar 404 para grupo privado sem membership', async () => {
      mockedRepo.findById.mockResolvedValue({ id: 'g1', is_public: false } as any)
      mockedRepo.findMembership.mockResolvedValue(null)

      await expect(groupsService.getDetails('g1', 'u2')).rejects.toThrow('não encontrado')
    })
  })
})
