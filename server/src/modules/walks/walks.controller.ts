import { Request, Response } from 'express'
import { AuthRequest } from '../../middlewares/auth.middleware'
import { AppError } from '../../shared/AppError'
import { walksService } from './walks.service'

export const walksController = {
  async list(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const petId = req.query.petId as string
    const walks = await walksService.listByPet(petId, authReq.user.id)
    return res.status(200).json(walks)
  },

  async create(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const walk = await walksService.create({
      ...req.body,
      ownerId: authReq.user.id,
    })
    return res.status(201).json(walk)
  },
}
