import { Router } from 'express'
import multer from 'multer'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { uploadsController } from './uploads.controller'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
})

router.post('/image', authMiddleware, upload.single('file'), uploadsController.uploadImage)

export default router

