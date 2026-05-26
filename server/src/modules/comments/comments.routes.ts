import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { commentsController } from './comments.controller'

const router = Router()

router.get('/:postId/comments',          authMiddleware, commentsController.listByPost)
router.post('/:postId/comments',         authMiddleware, commentsController.create)
router.patch('/:postId/comments/:commentId', authMiddleware, commentsController.update)
router.delete('/:postId/comments/:commentId', authMiddleware, commentsController.delete)
router.patch('/:postId/comments/:commentId/pin', authMiddleware, commentsController.togglePin)

export default router
