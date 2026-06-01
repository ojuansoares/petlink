import { Request, Response } from 'express'
import { AuthRequest } from '../../middlewares/auth.middleware'
import { AppError } from '../../shared/AppError'
import { notificationsService } from './notifications.service'

export const notificationsController = {
  async list(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const notifications = await notificationsService.list(authReq.user.id)
      return res.status(200).json(notifications)
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async markAllRead(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      await notificationsService.markAllRead(authReq.user.id)
      return res.status(204).send()
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async registerPushToken(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const { token, platform, fcmToken } = req.body
      if (!token || !platform) {
        return res.status(400).json({ error: 'token e platform são obrigatórios' })
      }

      await notificationsService.registerPushToken(authReq.user.id, token, platform, fcmToken)
      return res.status(201).json({ registered: true })
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async getPreferences(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const prefs = await notificationsService.getPreferences(authReq.user.id)
      return res.status(200).json(prefs)
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async updatePreferences(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const allowed = ['enabled', 'alimentacao', 'vacinas', 'social_likes', 'social_follows', 'aniversario']
      const updates: Record<string, boolean> = {}
      for (const key of allowed) {
        if (typeof req.body[key] === 'boolean') {
          updates[key] = req.body[key]
        }
      }

      const prefs = await notificationsService.updatePreferences(authReq.user.id, updates)
      return res.status(200).json(prefs)
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },
}
