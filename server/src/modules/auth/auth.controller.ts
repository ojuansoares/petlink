import { Request, Response } from 'express'
import { authService } from './auth.service'
import { AppError } from '../../shared/AppError'
import { AuthRequest } from '../../middlewares/auth.middleware'

export const authController = {
  async register(req: Request, res: Response) {
    const { email, password, name, location, birthDate, redirectTo } = req.body
    const result = await authService.register(email, password, name, location, birthDate, redirectTo)
    return res.status(201).json(result)
  },

  async login(req: Request, res: Response) {
    const { email, password } = req.body
    const result = await authService.login(email, password)
    return res.status(200).json(result)
  },

  async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body
    const result = await authService.refreshToken(refreshToken)
    return res.status(200).json(result)
  },

  async google(req: Request, res: Response) {
    const { idToken, nonce } = req.body as { idToken?: string; nonce?: string }
    if (!idToken || typeof idToken !== 'string') {
      throw new AppError('idToken obrigatório (JWT do Google Sign-In)', 400)
    }
    const result = await authService.loginWithOAuthIdToken('google', idToken, nonce)
    return res.status(200).json(result)
  },

  async facebook(req: Request, res: Response) {
    const { accessToken, idToken } = req.body as {
      accessToken?: string
      idToken?: string
    }
    const token = idToken ?? accessToken
    if (!token || typeof token !== 'string') {
      throw new AppError('accessToken ou idToken obrigatório (token retornado pelo SDK do Facebook)', 400)
    }
    const result = await authService.loginWithOAuthIdToken('facebook', token)
    return res.status(200).json(result)
  },

  async me(req: AuthRequest, res: Response) {
    return res.status(200).json({ user: req.user })
  },

  async logout(req: AuthRequest, res: Response) {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Token não fornecido', 401)
    }
    const accessToken = authHeader.slice(7)
    await authService.logout(accessToken)
    return res.status(204).send()
  },
}