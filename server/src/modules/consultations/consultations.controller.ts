import { Request, Response } from 'express'
import { consultationsService } from './consultations.service'

type AuthRequest = Request & { user?: { id: string } }

export const consultationsController = {
  async getMedia(req: Request, res: Response) {
    const { consultationId } = req.params as { consultationId: string }
    const media = await consultationsService.getMedia(consultationId)
    return res.json(media)
  },

  async getBatchMedia(req: Request, res: Response) {
    const ids = ((req.query.ids as string) || '').split(',').filter(Boolean)
    if (ids.length === 0) return res.json([])
    const media = await consultationsService.getBatchMedia(ids)
    return res.json(media)
  },

  async saveMedia(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const { consultationId } = req.params as { consultationId: string }
    const media = await consultationsService.saveMedia(authReq.user.id, consultationId, req.body)
    return res.json(media)
  },

  async deleteMedia(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const { consultationId } = req.params as { consultationId: string }
    await consultationsService.deleteMedia(authReq.user.id, consultationId)
    return res.status(204).end()
  },
}
