import { Request, Response } from 'express'
import { AuthRequest } from '../../middlewares/auth.middleware'
import { AppError } from '../../shared/AppError'
import { notificationsService } from './notifications.service'
import { sendPush } from '../push/push.service'

export const notificationsController = {
  async list(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const notifications = await notificationsService.list(authReq.user.id)
    return res.status(200).json(notifications)
  },

  async markAllRead(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    await notificationsService.markAllRead(authReq.user.id)
    return res.status(204).send()
  },

  async registerPushToken(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const { token, platform, fcmToken } = req.body
    if (!token || !platform) {
      return res.status(400).json({ error: 'token e platform são obrigatórios' })
    }

    await notificationsService.registerPushToken(authReq.user.id, token, platform, fcmToken)
    return res.status(201).json({ registered: true })
  },

  async getPreferences(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const prefs = await notificationsService.getPreferences(authReq.user.id)
    return res.status(200).json(prefs)
  },

  async updatePreferences(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const allowed = ['enabled', 'alimentacao', 'vacinas', 'social_likes', 'social_follows', 'aniversario', 'temperatura', 'passeio']
    const updates: Record<string, boolean> = {}
    for (const key of allowed) {
      if (typeof req.body[key] === 'boolean') {
        updates[key] = req.body[key]
      }
    }

    const prefs = await notificationsService.updatePreferences(authReq.user.id, updates)
    return res.status(200).json(prefs)
  },

  async sendTest(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const { title, body, type, data } = req.body
    if (!title) {
      return res.status(400).json({ error: 'title é obrigatório' })
    }

    const pushType = type === 'temperature_alert' ? 'temperature_alert' : 'social'

    try {
      await sendPush(authReq.user.id, pushType, title, body || null, data || null)
      return res.status(200).json({ sent: true, userId: authReq.user.id, title })
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Erro ao enviar push' })
    }
  },
}
