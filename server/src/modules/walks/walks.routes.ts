import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { walksController } from './walks.controller'

const router = Router()

router.get('/',   authMiddleware, walksController.list)
router.post('/',  authMiddleware, walksController.create)

export default router
