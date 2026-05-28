import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { profileController } from './profile.controller'

const router = Router()

router.get('/search', authMiddleware, profileController.search)
router.get('/me', authMiddleware, profileController.me)
router.get('/:userId', authMiddleware, profileController.getPublicProfile)
router.put('/me', authMiddleware, profileController.updateMe)
router.delete('/me', authMiddleware, profileController.deleteMe)

export default router

