import { Request, Response } from 'express'
import { AuthRequest } from '../../middlewares/auth.middleware'
import { AppError } from '../../shared/AppError'
import { followsService } from './follows.service'

export const followsController = {
  async follow(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const followingId = req.params.userId as string
    if (!followingId) return res.status(400).json({ error: 'userId obrigatório' })

    const result = await followsService.follow(authReq.user.id, followingId)
    return res.status(201).json(result)
  },

  async unfollow(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const followingId = req.params.userId as string
    if (!followingId) return res.status(400).json({ error: 'userId obrigatório' })

    await followsService.unfollow(authReq.user.id, followingId)
    return res.status(204).send()
  },

  async check(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const followingId = req.params.userId as string
    if (!followingId) return res.status(400).json({ error: 'userId obrigatório' })

    const result = await followsService.isFollowing(authReq.user.id, followingId)
    return res.status(200).json(result)
  },

  async followers(req: Request, res: Response) {
    const userId = req.params.userId as string
    const limit = parseInt(req.query.limit as any, 10) || 20
    const offset = parseInt(req.query.offset as any, 10) || 0

    const result = await followsService.getFollowers(userId, limit, offset)
    return res.status(200).json(result)
  },

  async following(req: Request, res: Response) {
    const userId = req.params.userId as string
    const limit = parseInt(req.query.limit as any, 10) || 20
    const offset = parseInt(req.query.offset as any, 10) || 0

    const result = await followsService.getFollowing(userId, limit, offset)
    return res.status(200).json(result)
  },
}
