import { Request, Response } from 'express'
import { feedingService } from './feeding.service'

type AuthRequest = Request & { user?: { id: string } }

export const feedingController = {
  async getPlan(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
      const { petId } = req.params as { petId: string }
      const plan = await feedingService.getPlan(petId, authReq.user.id)
      return res.json(plan)
    } catch (err: any) {
      return res.status(err.statusCode ?? 500).json({ error: err.message ?? 'Erro' })
    }
  },

  async savePlan(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
      const { petId } = req.params as { petId: string }
      const plan = await feedingService.savePlan(petId, authReq.user.id, req.body)
      return res.json(plan)
    } catch (err: any) {
      return res.status(err.statusCode ?? 500).json({ error: err.message ?? 'Erro' })
    }
  },

  async getLogs(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
      const { petId } = req.params as { petId: string }
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0]
      const logs = await feedingService.getLogs(petId, authReq.user.id, date)
      return res.json(logs)
    } catch (err: any) {
      return res.status(err.statusCode ?? 500).json({ error: err.message ?? 'Erro' })
    }
  },

  async checkMeal(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
      const { petId, logId } = req.params as { petId: string; logId: string }
      const checked = req.body?.checked !== false
      const log = await feedingService.checkMeal(logId, petId, authReq.user.id, checked)
      return res.json(log)
    } catch (err: any) {
      return res.status(err.statusCode ?? 500).json({ error: err.message ?? 'Erro' })
    }
  },

  async getScore(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
      const { petId } = req.params as { petId: string }
      const start = req.query.start as string
      const end = req.query.end as string
      if (!start || !end) return res.status(400).json({ error: 'start e end são obrigatórios (YYYY-MM-DD)' })
      const score = await feedingService.getScore(petId, authReq.user.id, start, end)
      return res.json(score)
    } catch (err: any) {
      return res.status(err.statusCode ?? 500).json({ error: err.message ?? 'Erro' })
    }
  },

  async getWeeklySummary(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
      const { petId } = req.params as { petId: string }
      const summary = await feedingService.getWeeklySummary(petId, authReq.user.id)
      return res.json(summary)
    } catch (err: any) {
      return res.status(err.statusCode ?? 500).json({ error: err.message ?? 'Erro' })
    }
  },

  async getTimeline(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })
      const { petId } = req.params as { petId: string }
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 20
      const events = await feedingService.getTimeline(petId, authReq.user.id, page, limit)
      return res.json(events)
    } catch (err: any) {
      return res.status(err.statusCode ?? 500).json({ error: err.message ?? 'Erro' })
    }
  },
}
