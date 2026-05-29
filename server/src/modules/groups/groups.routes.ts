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
router.get('/:id/posts', authMiddleware, groupsController.getPosts)
router.delete('/:id/posts/:postId', authMiddleware, groupsController.deletePost)
router.patch('/:id/posts/:postId/pin', authMiddleware, groupsController.togglePinPost)
router.patch('/:id/members/:userId/role', authMiddleware, groupsController.changeMemberRole)
router.delete('/:id/members/:userId', authMiddleware, groupsController.removeMember)

export default router
