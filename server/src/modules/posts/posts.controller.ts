import { Request, Response } from 'express'
import { AuthRequest } from '../../middlewares/auth.middleware'
import { AppError } from '../../shared/AppError'
import { postsService } from './posts.service'

export const postsController = {
  async create(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const payload = req.body ?? {}
    const post = await postsService.create(authReq.user.id, payload)
    return res.status(201).json({ post })
  },

  async feed(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const page = parseInt(req.query.page as string, 10) || 1
    const limit = parseInt(req.query.limit as string, 10) || 20

    const result = await postsService.getFeed(authReq.user.id, page, limit)
    return res.status(200).json(result)
  },

  async getByAuthor(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const userId = req.params.userId as string
    if (!userId) return res.status(400).json({ error: 'userId obrigatório' })

    const page = parseInt(req.query.page as string, 10) || 1
    const limit = parseInt(req.query.limit as string, 10) || 20

    const result = await postsService.getByAuthor(userId, page, limit, authReq.user.id)
    return res.status(200).json(result)
  },

  async update(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const postId = req.params.postId as string
    if (!postId) return res.status(400).json({ error: 'postId obrigatório' })

    const patch = req.body ?? {}
    const post = await postsService.update(authReq.user.id, postId, patch)
    return res.status(200).json({ post })
  },

  async remove(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const postId = req.params.postId as string
    if (!postId) return res.status(400).json({ error: 'postId obrigatório' })

    await postsService.delete(authReq.user.id, postId)
    return res.status(204).send()
  },

  async togglePin(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const postId = req.params.postId as string
    if (!postId) return res.status(400).json({ error: 'postId obrigatório' })

    const post = await postsService.togglePin(authReq.user.id, postId)
    return res.status(200).json({ post })
  },

  async followed(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const page = parseInt(req.query.page as string, 10) || 1
    const limit = parseInt(req.query.limit as string, 10) || 20

    const result = await postsService.getFollowed(authReq.user.id, page, limit)
    return res.status(200).json(result)
  }
}
