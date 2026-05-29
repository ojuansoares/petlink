import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { gamificationController } from './gamification.controller'

const router = Router()

router.get('/my', authMiddleware, gamificationController.getMyStats)
router.get('/:userId', gamificationController.getUserStats)

export default router
