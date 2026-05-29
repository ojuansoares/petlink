import { Request, Response } from 'express'
import { gamificationService } from './gamification.service'

type AuthRequest = Request & { user?: { id: string } }

export const gamificationController = {
  async getMyStats(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
      const stats = await gamificationService.getMyStats(authReq.user.id)
      return res.json(stats)
    } catch (err: any) {
      return res.status(err.statusCode ?? 500).json({ error: err.message ?? 'Erro' })
    }
  },

  async getUserStats(req: Request, res: Response) {
    try {
      const { userId } = req.params
      if (!userId) return res.status(400).json({ error: 'userId é obrigatório' })
      const stats = await gamificationService.getPublicStats(userId)
      return res.json(stats)
    } catch (err: any) {
      return res.status(err.statusCode ?? 500).json({ error: err.message ?? 'Erro' })
    }
  },
}
