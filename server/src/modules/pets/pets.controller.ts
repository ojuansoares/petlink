import { Request, Response } from 'express'
import { AuthRequest } from '../../middlewares/auth.middleware'
import { AppError } from '../../shared/AppError'
import { petsService } from './pets.service'

export const petsController = {
  async create(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const payload = req.body ?? {}
    const pet = await petsService.createForOwner(authReq.user.id, payload)
    return res.status(201).json({ pet })
  },

  async list(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const pets = await petsService.listForOwner(authReq.user.id)
    return res.status(200).json({ pets })
  },

  async getPublicPets(req: Request, res: Response) {
    const { userId } = req.params
    if (!userId || Array.isArray(userId)) return res.status(400).json({ error: 'userId obrigatório' })
    const pets = await petsService.getPublicPetsByOwner(userId)
    return res.status(200).json({ pets })
  },

  async search(req: Request, res: Response) {
    const q = req.query.q as string
    if (!q || q.length < 2) return res.status(200).json({ pets: [] })
    const pets = await petsService.searchByName(q)
    return res.status(200).json({ pets })
  },

  async get(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const petIdParam = req.params.petId
    if (!petIdParam) return res.status(400).json({ error: 'petId obrigatório' })
    if (Array.isArray(petIdParam)) return res.status(400).json({ error: 'petId inválido' })

    const pet = await petsService.getForOwner(authReq.user.id, petIdParam)
    return res.status(200).json({ pet })
  },

  async update(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const petIdParam = req.params.petId
    if (!petIdParam) return res.status(400).json({ error: 'petId obrigatório' })
    if (Array.isArray(petIdParam)) return res.status(400).json({ error: 'petId inválido' })

    const patch = req.body ?? {}
    const pet = await petsService.updateForOwner(authReq.user.id, petIdParam, patch)
    return res.status(200).json({ pet })
  },

  async remove(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const petIdParam = req.params.petId
    if (!petIdParam) return res.status(400).json({ error: 'petId obrigatório' })
    if (Array.isArray(petIdParam)) return res.status(400).json({ error: 'petId inválido' })

    await petsService.deleteForOwner(authReq.user.id, petIdParam)
    return res.status(204).send()
  },

  async exportData(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const petId = req.params.petId
    if (!petId || Array.isArray(petId)) return res.status(400).json({ error: 'petId obrigatório' })

    const format = (req.query.format as string) === 'csv' ? 'csv' : (req.query.format as string) === 'pdf' ? 'pdf' : 'json'

    try {
      const result = await petsService.exportData(authReq.user.id, petId, format)
      res.setHeader('Content-Type', result.contentType)
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)

      if (typeof result.content === 'string') {
        return res.status(200).send(result.content)
      }
      return res.status(200).send(result.content)
    } catch (err) {
      if (err instanceof AppError) throw err
      console.error('[PetsController] exportData error:', err)
      return res.status(500).json({ error: 'Erro ao exportar dados' })
    }
  },
}

