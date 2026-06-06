import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { petsController } from './pets.controller'

const router = Router()

router.post('/', authMiddleware, petsController.create)
router.get('/', authMiddleware, petsController.list)
router.get('/search', authMiddleware, petsController.search)
router.get('/user/:userId', authMiddleware, petsController.getPublicPets)
router.get('/:petId', authMiddleware, petsController.get)
router.put('/:petId', authMiddleware, petsController.update)
router.delete('/:petId', authMiddleware, petsController.remove)
router.get('/:petId/export', authMiddleware, petsController.exportData)

export default router

