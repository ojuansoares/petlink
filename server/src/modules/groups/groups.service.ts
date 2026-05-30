import { AppError } from '../../shared/AppError'
import { groupsRepository, type CreateGroupInput } from './groups.repository'
import { postsRepository } from '../posts/posts.repository'

export const groupsService = {
  async create(input: CreateGroupInput, userId: string) {
    if (!input.name?.trim()) throw new AppError('Nome do grupo é obrigatório', 400)
    if (input.name.length > 100) throw new AppError('Nome muito longo (máx. 100 caracteres)', 400)

    const group = await groupsRepository.create(input, userId)
    await groupsRepository.addMember(group.id, userId, 'owner')
    return group
  },

  async join(groupId: string, userId: string) {
    const group = await groupsRepository.findById(groupId)
    if (!group) throw new AppError('Grupo não encontrado', 404)
    if (!group.is_public) throw new AppError('Grupo privado', 403)

    const existing = await groupsRepository.findMembership(groupId, userId)
    if (existing) throw new AppError('Você já é membro deste grupo', 409)

    await groupsRepository.addMember(groupId, userId, 'member')
    return { success: true }
  },

  async leave(groupId: string, userId: string) {
    const membership = await groupsRepository.findMembership(groupId, userId)
    if (!membership) throw new AppError('Você não é membro deste grupo', 404)
    if (membership.role === 'owner') throw new AppError('O dono não pode sair do grupo', 400)

    await groupsRepository.removeMember(groupId, userId)
    return { success: true }
  },

  async listByUser(userId: string) {
    return groupsRepository.listByUser(userId)
  },

  async discover(userId: string, page: number, limit: number) {
    return groupsRepository.discover(userId, page, limit)
  },

  async search(q: string, userId: string, page: number, limit: number) {
    if (!q?.trim()) return { groups: [], hasMore: false }
    return groupsRepository.search(q.trim(), userId, page, limit)
  },

  async getDetails(groupId: string, userId: string) {
    const group = await groupsRepository.findById(groupId)
    if (!group) throw new AppError('Grupo não encontrado', 404)

    const membership = await groupsRepository.findMembership(groupId, userId)

    if (!group.is_public && !membership) {
      throw new AppError('Grupo não encontrado', 404)
    }

    const members = await groupsRepository.getMembers(groupId)
    return { ...group, members, my_role: membership?.role ?? null }
  },

  async getPosts(groupId: string, userId: string, page: number, limit: number) {
    const membership = await groupsRepository.findMembership(groupId, userId)
    if (!membership) throw new AppError('Você não é membro deste grupo', 403)

    return postsRepository.listByGroup(groupId, page, limit, userId)
  },

  async togglePinPost(groupId: string, postId: string, userId: string) {
    const membership = await groupsRepository.findMembership(groupId, userId)
    if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
      throw new AppError('Apenas administradores podem fixar posts', 403)
    }

    const post = await postsRepository.findByIdInGroup(postId, groupId)
    if (!post) throw new AppError('Post não encontrado no grupo', 404)

    const pinCount = await postsRepository.countPinnedByGroup(groupId)

    const isCurrentlyPinned = post.is_pinned
    if (!isCurrentlyPinned && pinCount >= 2) {
      throw new AppError('Máximo de 2 posts fixados por grupo', 400)
    }

    return postsRepository.togglePinInGroup(postId, groupId)
  },

  async deletePost(groupId: string, postId: string, userId: string) {
    const membership = await groupsRepository.findMembership(groupId, userId)
    if (!membership) throw new AppError('Você não é membro deste grupo', 403)

    const post = await postsRepository.findByIdInGroup(postId, groupId)
    if (!post) throw new AppError('Post não encontrado no grupo', 404)

    const isAuthor = post.author_id === userId
    const isAdmin = membership.role === 'admin' || membership.role === 'owner'
    if (!isAuthor && !isAdmin) {
      throw new AppError('Você não pode deletar este post', 403)
    }

    await postsRepository.deleteByIdAndAuthor(post.author_id, postId)
    return true
  },

  async changeMemberRole(groupId: string, targetUserId: string, newRole: string, requesterId: string) {
    if (!['admin', 'member'].includes(newRole)) {
      throw new AppError('Cargo inválido. Use admin ou member', 400)
    }

    const requester = await groupsRepository.findMembership(groupId, requesterId)
    if (!requester || (requester.role !== 'owner' && requester.role !== 'admin')) {
      throw new AppError('Apenas administradores podem alterar cargos', 403)
    }

    const target = await groupsRepository.findMembership(groupId, targetUserId)
    if (!target) throw new AppError('Usuário não é membro do grupo', 404)
    if (target.role === 'owner') throw new AppError('Não é possível alterar o cargo do dono', 400)

    await groupsRepository.updateMemberRole(groupId, targetUserId, newRole)
    return { success: true }
  },

  // --- Invites ---

  async inviteUser(groupId: string, invitedUserId: string, requesterId: string) {
    if (invitedUserId === requesterId) throw new AppError('Você não pode convidar a si mesmo', 400)

    const requester = await groupsRepository.findMembership(groupId, requesterId)
    if (!requester || (requester.role !== 'owner' && requester.role !== 'admin')) {
      throw new AppError('Apenas administradores podem convidar', 403)
    }

    const group = await groupsRepository.findById(groupId)
    if (!group) throw new AppError('Grupo não encontrado', 404)

    const existing = await groupsRepository.findMembership(groupId, invitedUserId)
    if (existing) throw new AppError('Usuário já é membro do grupo', 409)

    const pending = await groupsRepository.findPendingInvite(groupId, invitedUserId)
    if (pending) return pending

    return groupsRepository.createInvite(groupId, invitedUserId, requesterId)
  },

  async listPendingInvites(userId: string) {
    return groupsRepository.listPendingInvites(userId)
  },

  async acceptInvite(inviteId: string, userId: string) {
    const invites = await groupsRepository.listPendingInvites(userId)
    const invite = invites.find((i) => i.id === inviteId)
    if (!invite) throw new AppError('Convite não encontrado', 404)

    await groupsRepository.acceptInvite(inviteId)
    await groupsRepository.addMember(invite.group_id, userId, 'member')
    return { success: true }
  },

  async rejectInvite(inviteId: string, userId: string) {
    const invites = await groupsRepository.listPendingInvites(userId)
    const invite = invites.find((i) => i.id === inviteId)
    if (!invite) throw new AppError('Convite não encontrado', 404)

    await groupsRepository.rejectInvite(inviteId)
    return { success: true }
  },

  async searchUsersForGroup(query: string, groupId: string) {
    if (!query?.trim()) return []
    return groupsRepository.searchUsersForGroup(query.trim(), groupId)
  },

  async deleteGroup(groupId: string, userId: string) {
    const membership = await groupsRepository.findMembership(groupId, userId)
    if (!membership || membership.role !== 'owner') {
      throw new AppError('Apenas o dono pode deletar o grupo', 403)
    }

    await groupsRepository.delete(groupId)
    return { success: true }
  },

  async removeMember(groupId: string, targetUserId: string, requesterId: string) {
    const requester = await groupsRepository.findMembership(groupId, requesterId)
    if (!requester) throw new AppError('Você não é membro deste grupo', 403)

    if (requesterId !== targetUserId) {
      if (requester.role !== 'owner' && requester.role !== 'admin') {
        throw new AppError('Apenas administradores podem remover membros', 403)
      }

      const target = await groupsRepository.findMembership(groupId, targetUserId)
      if (!target) throw new AppError('Usuário não é membro do grupo', 404)
      if (target.role === 'owner') throw new AppError('Não é possível remover o dono do grupo', 400)
    }

    await groupsRepository.removeMember(groupId, targetUserId)
    return { success: true }
  },
}
