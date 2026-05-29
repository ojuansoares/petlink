import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { remindersController } from './reminders.controller'

const router = Router()

router.get('/', authMiddleware, remindersController.list)

export default router
