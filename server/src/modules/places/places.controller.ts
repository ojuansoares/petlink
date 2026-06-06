import { Request, Response } from 'express'
import { AuthRequest } from '../../middlewares/auth.middleware'
import { placesService } from './places.service'

export const placesController = {
  async search(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const q = req.query.q as string
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20
    const petFriendly = req.query.pet_friendly === 'true'
    const category = req.query.category as string | undefined

    if (!q?.trim() && !petFriendly) return res.status(400).json({ error: 'q é obrigatório' })

    const results = await placesService.search(q?.trim() || '', lat, lng, limit, petFriendly, category)
    return res.status(200).json(results)
  },

  async getDetails(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const { osmType, osmId } = req.params as { osmType: string; osmId: string }

    const place = await placesService.getDetails(osmType, osmId, authReq.user.id)
    if (!place) return res.status(404).json({ error: 'Lugar não encontrado' })

    return res.status(200).json(place)
  },

  async listReviews(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const { osmType, osmId } = req.params as { osmType: string; osmId: string }

    const reviews = await placesService.listReviews(osmType, parseInt(osmId, 10))
    return res.status(200).json(reviews)
  },

  async addReview(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const { osmType, osmId } = req.params as { osmType: string; osmId: string }
    const { rating, comment, placeName, placeAddress, placeLat, placeLng, placeCategory } = req.body

    const review = await placesService.addReview({
      osmType,
      osmId: parseInt(osmId, 10),
      placeName,
      placeAddress,
      placeLat,
      placeLng,
      placeCategory,
      authorId: authReq.user.id,
      authorName: authReq.user.name,
      rating,
      comment,
    })

    return res.status(201).json(review)
  },

  async deleteReview(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const { reviewId } = req.params as { reviewId: string }

    await placesService.deleteReview(reviewId, authReq.user.id)
    return res.status(204).end()
  },

  async togglePetFriendly(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const { osmType, osmId } = req.params as { osmType: string; osmId: string }

    const { voted, voteCount } = await placesService.togglePetFriendly({
      osmType,
      osmId: parseInt(osmId, 10),
      userId: authReq.user.id,
    })

    return res.status(200).json({ voted, voteCount, petFriendly: voteCount > 0 })
  },

  async listPetFriendlyIds(_req: Request, res: Response) {
    const ids = await placesService.listPetFriendlyIds()
    return res.status(200).json(ids)
  },
}
