import { AppError } from '../../shared/AppError'
import { groupsRepository, type CreateGroupInput } from './groups.repository'

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

  async discover(page: number, limit: number) {
    return groupsRepository.discover(page, limit)
  },

  async search(q: string, page: number, limit: number) {
    if (!q?.trim()) return { groups: [], hasMore: false }
    return groupsRepository.search(q.trim(), page, limit)
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
}
