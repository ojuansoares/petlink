import { Request, Response } from 'express'
import { profileService } from './profile.service'
import { AuthRequest } from '../../middlewares/auth.middleware'
import { AppError } from '../../shared/AppError'

export const profileController = {
  async me(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Não autenticado' })
      const profile = await profileService.getMe(req.user.id)
      return res.status(200).json({ profile })
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : err.statusCode ?? 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async getPublicProfile(req: Request, res: Response) {
    try {
      const userId = req.params.userId as string
      if (!userId) return res.status(400).json({ error: 'userId obrigatório' })
      const profile = await profileService.getPublicProfile(userId)
      return res.status(200).json({ profile })
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : err.statusCode ?? 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async updateMe(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const { name, location, avatar_url, bio } = req.body ?? {}
      const patch = { name, location, avatar_url, bio }

      const updated = await profileService.updateMe(authReq.user.id, patch)
      return res.status(200).json({ profile: updated })
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : err.statusCode ?? 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async deleteMe(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      await profileService.deleteMe(authReq.user.id)
      return res.status(204).send()
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : err.statusCode ?? 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },
}

