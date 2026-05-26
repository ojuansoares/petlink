import { Request, Response } from 'express'
import { AuthRequest } from '../../middlewares/auth.middleware'
import { AppError } from '../../shared/AppError'
import { locationsService } from './locations.service'

export const locationsController = {
  async nearby(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const lat = parseFloat(req.query.lat as string)
      const lng = parseFloat(req.query.lng as string)
      const radiusKm = req.query.radiusKm ? parseFloat(req.query.radiusKm as string) : undefined
      const category = req.query.category as string | undefined

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: 'lat e lng são obrigatórios' })
      }

      const locations = await locationsService.findNearby(lat, lng, radiusKm, category)
      return res.status(200).json(locations)
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async search(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const query = req.query.query as string
      const category = req.query.category as string | undefined
      const minRating = req.query.minRating ? parseInt(req.query.minRating as string, 10) : undefined
      const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined
      const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined

      const results = await locationsService.search(query, category, minRating, lat, lng)
      return res.status(200).json(results)
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async create(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const location = await locationsService.create({
        ...req.body,
        addedBy: authReq.user.id,
      })
      return res.status(201).json(location)
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async checkIn(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const locationId = req.params.locationId as string
      const { petId, photoUrl, content } = req.body

      const result = await locationsService.checkIn(locationId, authReq.user.id, petId, photoUrl, content)
      return res.status(201).json(result)
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async listReviews(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const locationId = req.params.locationId as string
      const reviews = await locationsService.listReviews(locationId)
      return res.status(200).json(reviews)
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },

  async addReview(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const locationId = req.params.locationId as string
      const { rating, comment } = req.body

      const review = await locationsService.addReview(
        locationId,
        authReq.user.id,
        authReq.user.email ?? 'Usuário',
        rating,
        comment
      )
      return res.status(201).json(review)
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },
}
