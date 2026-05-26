import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { likesController } from './likes.controller'

const router = Router()

router.post('/:postId/like',   authMiddleware, likesController.toggle)
router.get('/:postId/like',     authMiddleware, likesController.status)

export default router
