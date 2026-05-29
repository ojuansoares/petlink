import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { notificationsController } from './notifications.controller'

const router = Router()

router.get('/',           authMiddleware, notificationsController.list)
router.patch('/read-all', authMiddleware, notificationsController.markAllRead)
router.post('/register-token', authMiddleware, notificationsController.registerPushToken)
router.get('/preferences', authMiddleware, notificationsController.getPreferences)
router.put('/preferences', authMiddleware, notificationsController.updatePreferences)

export default router
