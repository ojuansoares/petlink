import { Router } from 'express'
import { authController } from './auth.controller'
import { authMiddleware } from '../../middlewares/auth.middleware'

const router = Router()

router.post('/register', authController.register)
router.post('/login', authController.login)
router.post('/google', authController.google)
router.post('/facebook', authController.facebook)
router.post('/refresh', authController.refresh)
router.get('/me', authMiddleware, authController.me)
router.post('/logout', authMiddleware, authController.logout)

export default router