import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { weatherController } from './weather.controller'

const router = Router()

router.get('/current', authMiddleware, weatherController.current)

export default router
