import { Request, Response } from 'express'
import { AuthRequest } from '../../middlewares/auth.middleware'
import { AppError } from '../../shared/AppError'
import { postsService } from './posts.service'

export const postsController = {
  async create(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const payload = req.body ?? {}
      const post = await postsService.create(authReq.user.id, payload)
      return res.status(201).json({ post })
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : err.statusCode ?? 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async feed(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const page = parseInt(req.query.page as string, 10) || 1
      const limit = parseInt(req.query.limit as string, 10) || 20
      const random = req.query.random === 'true'

      const result = await postsService.getFeed(page, limit, random)
      return res.status(200).json(result)
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : err.statusCode ?? 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async getByAuthor(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const userId = req.params.userId as string
      if (!userId) return res.status(400).json({ error: 'userId obrigatório' })

      const page = parseInt(req.query.page as string, 10) || 1
      const limit = parseInt(req.query.limit as string, 10) || 20

      const result = await postsService.getByAuthor(userId, page, limit)
      return res.status(200).json(result)
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : err.statusCode ?? 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async update(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const postId = req.params.postId as string
      if (!postId) return res.status(400).json({ error: 'postId obrigatório' })

      const patch = req.body ?? {}
      const post = await postsService.update(authReq.user.id, postId, patch)
      return res.status(200).json({ post })
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : err.statusCode ?? 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const postId = req.params.postId as string
      if (!postId) return res.status(400).json({ error: 'postId obrigatório' })

      await postsService.delete(authReq.user.id, postId)
      return res.status(204).send()
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : err.statusCode ?? 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async togglePin(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const postId = req.params.postId as string
      if (!postId) return res.status(400).json({ error: 'postId obrigatório' })

      const post = await postsService.togglePin(authReq.user.id, postId)
      return res.status(200).json({ post })
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : err.statusCode ?? 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  }
}
