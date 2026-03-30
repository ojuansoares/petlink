import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { petsController } from './pets.controller'

const router = Router()

router.post('/', authMiddleware, petsController.create)
router.get('/', authMiddleware, petsController.list)
router.get('/:petId', authMiddleware, petsController.get)
router.put('/:petId', authMiddleware, petsController.update)
router.delete('/:petId', authMiddleware, petsController.remove)

export default router

