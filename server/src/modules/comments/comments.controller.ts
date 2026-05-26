import { Request, Response } from 'express'
import { AuthRequest } from '../../middlewares/auth.middleware'
import { AppError } from '../../shared/AppError'
import { commentsService } from './comments.service'

export const commentsController = {
  async listByPost(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const postId = req.params.postId as string
      const comments = await commentsService.listByPost(postId)
      return res.status(200).json(comments)
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async create(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const postId = req.params.postId as string
      const { content } = req.body

      const comment = await commentsService.create(postId, authReq.user.id, content)
      return res.status(201).json(comment)
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const commentId = req.params.commentId as string
      await commentsService.delete(commentId, authReq.user.id)
      return res.status(204).send()
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },
}
