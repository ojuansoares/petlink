import { Request, Response } from 'express'
import { authService } from './auth.service'
import { AuthRequest } from '../../middlewares/auth.middleware'

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const { email, password, name, location, birthDate, redirectTo } = req.body
      const result = await authService.register(email, password, name, location, birthDate, redirectTo)
      return res.status(201).json(result)
    } catch (err: any) {
      return res.status(err.statusCode ?? 500).json({ error: err.message })
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body
      const result = await authService.login(email, password)
      return res.status(200).json(result)
    } catch (err: any) {
      return res.status(err.statusCode ?? 500).json({ error: err.message })
    }
  },

  async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body
      const result = await authService.refreshToken(refreshToken)
      return res.status(200).json(result)
    } catch (err: any) {
      return res.status(err.statusCode ?? 500).json({ error: err.message })
    }
  },

  async google(req: Request, res: Response) {
    try {
      const { idToken, nonce } = req.body as { idToken?: string; nonce?: string }
      if (!idToken || typeof idToken !== 'string') {
        return res.status(400).json({ error: 'idToken obrigatório (JWT do Google Sign-In)' })
      }
      const result = await authService.loginWithOAuthIdToken('google', idToken, nonce)
      return res.status(200).json(result)
    } catch (err: any) {
      return res.status(err.statusCode ?? 500).json({ error: err.message })
    }
  },

  async facebook(req: Request, res: Response) {
    try {
      const { accessToken, idToken } = req.body as {
        accessToken?: string
        idToken?: string
      }
      const token = idToken ?? accessToken
      if (!token || typeof token !== 'string') {
        return res
          .status(400)
          .json({ error: 'accessToken ou idToken obrigatório (token retornado pelo SDK do Facebook)' })
      }
      const result = await authService.loginWithOAuthIdToken('facebook', token)
      return res.status(200).json(result)
    } catch (err: any) {
      return res.status(err.statusCode ?? 500).json({ error: err.message })
    }
  },

  async me(req: AuthRequest, res: Response) {
    return res.status(200).json({ user: req.user })
  },

  async logout(req: AuthRequest, res: Response) {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token não fornecido' })
      }
      const accessToken = authHeader.slice(7)
      await authService.logout(accessToken)
      return res.status(204).send()
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  },
}