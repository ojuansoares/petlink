import { Request, Response } from 'express'
import { AuthRequest } from '../../middlewares/auth.middleware'
import { walksService } from './walks.service'

export const walksController = {
  async list(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const petId = req.query.petId
    if (typeof petId !== 'string') return res.status(400).json({ error: 'petId é obrigatório' })
    const walks = await walksService.listByPet(petId, authReq.user.id)
    return res.status(200).json(walks)
  },

  async getById(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const id = String(req.params.id)
    const walk = await walksService.findById(id)
    return res.status(200).json(walk)
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

  async update(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const id = String(req.params.id)
    const walk = await walksService.update(id, req.body)
    return res.status(200).json(walk)
  },

  async remove(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const id = String(req.params.id)
    await walksService.remove(id)
    return res.status(204).send()
  },

  async stats(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const petId = req.query.petId
    const start = req.query.start
    const end = req.query.end
    if (typeof petId !== 'string' || typeof start !== 'string' || typeof end !== 'string') {
      return res.status(400).json({ error: 'petId, start e end são obrigatórios' })
    }
    const data = await walksService.getStats(petId, start, end)
    return res.status(200).json(data)
  },
}
