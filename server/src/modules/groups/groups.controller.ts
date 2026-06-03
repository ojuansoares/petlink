import { Request, Response } from 'express'
import { groupsService } from './groups.service'

type AuthRequest = Request & { user?: { id: string } }

export const groupsController = {
  async create(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const group = await groupsService.create(req.body, authReq.user.id)
    return res.status(201).json(group)
  },

  async join(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const { id } = req.params as { id: string }
    const result = await groupsService.join(id, authReq.user.id)
    return res.json(result)
  },

  async leave(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const { id } = req.params as { id: string }
    const result = await groupsService.leave(id, authReq.user.id)
    return res.json(result)
  },

  async listMyGroups(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const groups = await groupsService.listByUser(authReq.user.id)
    return res.json(groups)
  },

  async discover(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const result = await groupsService.discover(authReq.user.id, page, limit)
    return res.json(result)
  },

  async search(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const q = (req.query.q as string) || ''
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const result = await groupsService.search(q, authReq.user.id, page, limit)
    return res.json(result)
  },

  async getDetails(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const { id } = req.params as { id: string }
    const details = await groupsService.getDetails(id, authReq.user.id)
    return res.json(details)
  },

  async getPosts(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const { id } = req.params as { id: string }
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const result = await groupsService.getPosts(id, authReq.user.id, page, limit)
    return res.json(result)
  },

  async deletePost(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const { id, postId } = req.params as { id: string; postId: string }
    await groupsService.deletePost(id, postId, authReq.user.id)
    return res.status(204).send()
  },

  async togglePinPost(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const { id, postId } = req.params as { id: string; postId: string }
    const post = await groupsService.togglePinPost(id, postId, authReq.user.id)
    return res.json({ post })
  },

  async changeMemberRole(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const { id, userId } = req.params as { id: string; userId: string }
    const { role } = req.body as { role: string }
    await groupsService.changeMemberRole(id, userId, role, authReq.user.id)
    return res.json({ success: true })
  },

  // --- Invites ---

  async inviteUser(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const { id } = req.params as { id: string }
    const { userId } = req.body as { userId: string }
    const invite = await groupsService.inviteUser(id, userId, authReq.user.id)
    return res.status(201).json(invite)
  },

  async listPendingInvites(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const invites = await groupsService.listPendingInvites(authReq.user.id)
    return res.json(invites)
  },

  async acceptInvite(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const { inviteId } = req.params as { inviteId: string }
    const result = await groupsService.acceptInvite(inviteId, authReq.user.id)
    return res.json(result)
  },

  async rejectInvite(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const { inviteId } = req.params as { inviteId: string }
    const result = await groupsService.rejectInvite(inviteId, authReq.user.id)
    return res.json(result)
  },

  async searchUsersForGroup(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const { id } = req.params as { id: string }
    const q = (req.query.q as string) || ''
    const users = await groupsService.searchUsersForGroup(q, id)
    return res.json(users)
  },

  async update(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const { id } = req.params as { id: string }
    const group = await groupsService.update(id, authReq.user.id, req.body)
    return res.json(group)
  },

  async deleteGroup(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const { id } = req.params as { id: string }
    const result = await groupsService.deleteGroup(id, authReq.user.id)
    return res.json(result)
  },

  async removeMember(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const { id, userId } = req.params as { id: string; userId: string }
    await groupsService.removeMember(id, userId, authReq.user.id)
    return res.json({ success: true })
  },
}
