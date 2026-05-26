import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { commentLikesController } from './commentLikes.controller'

const router = Router()

router.post('/comments/:commentId/like',    authMiddleware, commentLikesController.toggle)
router.get('/comments/:commentId/like',     authMiddleware, commentLikesController.status)

export default router
