import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { locationsController } from './locations.controller'

const router = Router()

router.get('/nearby',               authMiddleware, locationsController.nearby)
router.get('/search',               authMiddleware, locationsController.search)
router.post('/',                    authMiddleware, locationsController.create)
router.post('/:locationId/checkin', authMiddleware, locationsController.checkIn)
router.get('/:locationId/reviews',  authMiddleware, locationsController.listReviews)
router.post('/:locationId/reviews', authMiddleware, locationsController.addReview)

export default router
