import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { followsController } from './follows.controller'

const router = Router()

// Follow a user
router.post('/:userId', authMiddleware, followsController.follow)
// Unfollow a user
router.delete('/:userId', authMiddleware, followsController.unfollow)
// Check if following
router.get('/check/:userId', authMiddleware, followsController.check)
// List followers of a user
router.get('/followers/:userId', followsController.followers) // public
// List who a user follows
router.get('/following/:userId', followsController.following) // public

export default router
