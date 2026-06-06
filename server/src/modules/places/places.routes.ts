import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { placesController } from './places.controller'

const router = Router()

router.get('/search',            authMiddleware, placesController.search)
router.get('/pet-friendly/ids',  authMiddleware, placesController.listPetFriendlyIds)
router.get('/:osmType/:osmId',               authMiddleware, placesController.getDetails)
router.post('/:osmType/:osmId/pet-friendly', authMiddleware, placesController.togglePetFriendly)
router.get('/:osmType/:osmId/reviews',       authMiddleware, placesController.listReviews)
router.post('/:osmType/:osmId/reviews',      authMiddleware, placesController.addReview)
router.delete('/reviews/:reviewId',           authMiddleware, placesController.deleteReview)

export default router
