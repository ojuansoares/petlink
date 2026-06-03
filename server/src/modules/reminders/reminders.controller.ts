import { Request, Response } from 'express'
import { remindersService } from './reminders.service'

type AuthRequest = Request & { user?: { id: string } }

export const remindersController = {
  async list(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
    const result = await remindersService.getReminders(authReq.user.id)
    return res.json(result)
  },
}
