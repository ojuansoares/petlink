import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { feedingController } from './feeding.controller'

const router = Router()

router.get('/:petId/feeding/plan', authMiddleware, feedingController.getPlan)
router.post('/:petId/feeding/plan', authMiddleware, feedingController.savePlan)
router.get('/:petId/feeding/logs', authMiddleware, feedingController.getLogs)
router.post('/:petId/feeding/logs/:logId/check', authMiddleware, feedingController.checkMeal)
router.get('/:petId/feeding/score', authMiddleware, feedingController.getScore)

export default router
