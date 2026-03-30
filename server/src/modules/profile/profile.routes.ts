import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { profileController } from './profile.controller'

const router = Router()

router.get('/me', authMiddleware, profileController.me)
router.put('/me', authMiddleware, profileController.updateMe)

export default router

