import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { commentsController } from './comments.controller'

const router = Router()

router.get('/:postId/comments',          authMiddleware, commentsController.listByPost)
router.post('/:postId/comments',         authMiddleware, commentsController.create)
router.delete('/:postId/comments/:commentId', authMiddleware, commentsController.delete)

export default router
