import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { vaccinationCardController } from './vaccinationCard.controller'

const router = Router()

router.post('/:petId/vaccination-card', authMiddleware, vaccinationCardController.generate)

export default router
