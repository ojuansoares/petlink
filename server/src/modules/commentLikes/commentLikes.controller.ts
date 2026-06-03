import { Request, Response } from 'express'
import { AuthRequest } from '../../middlewares/auth.middleware'
import { AppError } from '../../shared/AppError'
import { commentLikesService } from './commentLikes.service'

export const commentLikesController = {
  async toggle(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const commentId = req.params.commentId as string
    const result = await commentLikesService.toggle(commentId, authReq.user.id)
    return res.status(200).json(result)
  },

  async status(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const commentId = req.params.commentId as string
    const result = await commentLikesService.status(commentId, authReq.user.id)
    return res.status(200).json(result)
  },
}
