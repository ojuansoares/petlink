import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { groupsController } from './groups.controller'

const router = Router()

router.get('/', authMiddleware, groupsController.listMyGroups)
router.get('/discover', authMiddleware, groupsController.discover)
router.get('/search', authMiddleware, groupsController.search)
router.post('/', authMiddleware, groupsController.create)
router.post('/:id/join', authMiddleware, groupsController.join)
router.post('/:id/leave', authMiddleware, groupsController.leave)
router.get('/:id', authMiddleware, groupsController.getDetails)

export default router
