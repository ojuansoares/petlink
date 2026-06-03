import { Request, Response } from 'express'
import { profileService } from './profile.service'
import { AuthRequest } from '../../middlewares/auth.middleware'
import { AppError } from '../../shared/AppError'

export const profileController = {
  async me(req: AuthRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado' })
    const profile = await profileService.getMe(req.user.id)
    return res.status(200).json({ profile })
  },

  async getPublicProfile(req: Request, res: Response) {
    const userId = req.params.userId as string
    if (!userId) return res.status(400).json({ error: 'userId obrigatório' })
    const profile = await profileService.getPublicProfile(userId)
    return res.status(200).json({ profile })
  },

  async updateMe(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const { name, location, avatar_url, bio } = req.body ?? {}
    const patch = { name, location, avatar_url, bio }

    const updated = await profileService.updateMe(authReq.user.id, patch)
    return res.status(200).json({ profile: updated })
  },

  async deleteMe(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    await profileService.deleteMe(authReq.user.id)
    return res.status(204).send()
  },

  async search(req: Request, res: Response) {
    const q = req.query.q as string
    if (!q || q.length < 2) return res.status(200).json({ users: [] })
    const users = await profileService.searchByName(q)
    return res.status(200).json({ users })
  },
}

