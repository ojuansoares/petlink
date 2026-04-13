import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { postsController } from './posts.controller'

const router = Router()

router.post('/', authMiddleware, postsController.create)
router.get('/feed', authMiddleware, postsController.feed)
router.get('/user/:userId', authMiddleware, postsController.getByAuthor)
router.put('/:postId', authMiddleware, postsController.update)
router.delete('/:postId', authMiddleware, postsController.remove)
router.patch('/:postId/pin', authMiddleware, postsController.togglePin)

export default router
