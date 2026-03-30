import type { Session, User } from '@supabase/supabase-js'
import { supabaseAdmin, supabaseAuth } from '../../config/supabase'
import { authRepository } from './auth.repository'
import { AppError } from '../../shared/AppError'

function sessionResponse(session: Session, user: User) {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at,
    user: {
      id: user.id,
      email: user.email,
    },
  }
}

async function ensureOAuthProfile(user: User) {
  const existing = await authRepository.findProfileMaybe(user.id)
  if (existing) return existing

  const meta = user.user_metadata ?? {}
  const name =
    (meta.full_name as string | undefined) ||
    (meta.name as string | undefined) ||
    (meta.given_name as string | undefined) ||
    user.email?.split('@')[0] ||
    'Usuário'

  return authRepository.createProfile(user.id, name, undefined)
}

export const authService = {
  async register(email: string, password: string, name: string, location?: string) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (error) throw new AppError(error.message, 400)

    const profile = await authRepository.createProfile(data.user.id, name, location)

    return { user: data.user, profile }
  },

  async login(email: string, password: string) {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw new AppError('Credenciais inválidas', 401)

    return sessionResponse(data.session!, data.user)
  },

  /**
   * Login nativo OAuth: o app obtém o token no SDK (Google / Facebook) e envia aqui.
   * No painel Supabase: Auth → Providers → habilitar Google e Facebook e preencher Client IDs / secret.
   * Google: envie o **id_token** (JWT). Facebook: em geral o **access_token** do SDK ou id token (Limited Login), conforme o fluxo.
   */
  async loginWithOAuthIdToken(
    provider: 'google' | 'facebook',
    token: string,
    nonce?: string
  ) {
    const { data, error } = await supabaseAuth.auth.signInWithIdToken({
      provider,
      token,
      ...(nonce ? { nonce } : {}),
    })

    if (error || !data.session || !data.user) {
      throw new AppError(error?.message ?? 'Falha no login social', 401)
    }

    const profile = await ensureOAuthProfile(data.user)

    return { ...sessionResponse(data.session, data.user), profile }
  },

  async refreshToken(refreshToken: string) {
    const { data, error } = await supabaseAuth.auth.refreshSession({
      refresh_token: refreshToken,
    })

    if (error || !data.session || !data.user) {
      throw new AppError('Refresh token inválido', 401)
    }

    return sessionResponse(data.session, data.user)
  },

  /**
   * Encerra sessões no Supabase. O Admin API espera o **access token JWT** atual
   * (não o UUID do usuário) — ver Authorization Bearer.
   */
  async logout(accessToken: string) {
    const { error } = await supabaseAdmin.auth.admin.signOut(accessToken, 'global')
    if (error) throw new AppError(error.message, 500)
  },
}
