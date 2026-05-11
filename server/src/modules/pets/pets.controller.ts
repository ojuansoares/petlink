import { Request, Response } from 'express'
import { AuthRequest } from '../../middlewares/auth.middleware'
import { AppError } from '../../shared/AppError'
import { petsService } from './pets.service'

export const petsController = {
  async create(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const payload = req.body ?? {}
      const pet = await petsService.createForOwner(authReq.user.id, payload)
      return res.status(201).json({ pet })
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : err.statusCode ?? 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async list(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const pets = await petsService.listForOwner(authReq.user.id)
      return res.status(200).json({ pets })
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : err.statusCode ?? 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async getPublicPets(req: Request, res: Response) {
    try {
      const { userId } = req.params
      if (!userId) return res.status(400).json({ error: 'userId obrigatório' })
      const pets = await petsService.getPublicPetsByOwner(userId)
      return res.status(200).json({ pets })
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : err.statusCode ?? 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async get(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const petIdParam = req.params.petId
      if (!petIdParam) return res.status(400).json({ error: 'petId obrigatório' })
      if (Array.isArray(petIdParam)) return res.status(400).json({ error: 'petId inválido' })

      const pet = await petsService.getForOwner(authReq.user.id, petIdParam)
      return res.status(200).json({ pet })
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : err.statusCode ?? 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async update(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const petIdParam = req.params.petId
      if (!petIdParam) return res.status(400).json({ error: 'petId obrigatório' })
      if (Array.isArray(petIdParam)) return res.status(400).json({ error: 'petId inválido' })

      const patch = req.body ?? {}
      const pet = await petsService.updateForOwner(authReq.user.id, petIdParam, patch)
      return res.status(200).json({ pet })
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : err.statusCode ?? 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const petIdParam = req.params.petId
      if (!petIdParam) return res.status(400).json({ error: 'petId obrigatório' })
      if (Array.isArray(petIdParam)) return res.status(400).json({ error: 'petId inválido' })

      await petsService.deleteForOwner(authReq.user.id, petIdParam)
      return res.status(204).send()
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : err.statusCode ?? 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },
}

