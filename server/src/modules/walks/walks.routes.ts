import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { walksController } from './walks.controller'

const router = Router()

router.get('/stats', authMiddleware, walksController.stats)
router.get('/:id',   authMiddleware, walksController.getById)
router.put('/:id',   authMiddleware, walksController.update)
router.delete('/:id', authMiddleware, walksController.remove)
router.get('/',      authMiddleware, walksController.list)
router.post('/',     authMiddleware, walksController.create)

export default router
