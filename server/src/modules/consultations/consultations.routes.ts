import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { consultationsController } from './consultations.controller'

const router = Router()

router.get('/media/:consultationId', consultationsController.getMedia)
router.get('/media/batch', consultationsController.getBatchMedia)
router.post('/media/:consultationId', authMiddleware, consultationsController.saveMedia)
router.delete('/media/:consultationId', authMiddleware, consultationsController.deleteMedia)

export default router
