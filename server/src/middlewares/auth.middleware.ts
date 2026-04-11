import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../config/supabase'

export interface AuthRequest extends Request {
  user?: { id: string; email: string }
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido ou expirado' })
    }

    req.user = { id: user.id, email: user.email! }
    next()
  } catch (err: any) {
    console.error('[AuthMiddleware] Erro ao validar token:', err.message)
    return res.status(500).json({ error: 'Erro interno ao validar autenticação' })
  }
}