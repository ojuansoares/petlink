import { Request, Response } from 'express'
import { AuthRequest } from '../../middlewares/auth.middleware'
import { AppError } from '../../shared/AppError'
import { likesService } from './likes.service'

export const likesController = {
  async toggle(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const postId = req.params.postId as string
      const result = await likesService.toggle(postId, authReq.user.id)
      return res.status(200).json(result)
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async status(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const postId = req.params.postId as string
      const result = await likesService.status(postId, authReq.user.id)
      return res.status(200).json(result)
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async listByPost(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const postId = req.params.postId as string
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10))
      const result = await likesService.listByPost(postId, page, limit)
      return res.status(200).json(result)
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },
}
