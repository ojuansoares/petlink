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

  return authRepository.upsertProfile(user.id, name)
}

export const authService = {
  async register(email: string, password: string, name: string, location?: string, birthDate?: string, redirectTo?: string) {
    const normalizedEmail = email.trim().toLowerCase()
    const alreadyExists = await authRepository.emailExists(normalizedEmail)
    if (alreadyExists) {
      throw new AppError('Email já cadastrado', 409)
    }

    // Validar idade mínima de 13 anos
    if (birthDate) {
      const birth = new Date(birthDate)
      const today = new Date()
      const age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      const dayDiff = today.getDate() - birth.getDate()
      const realAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age
      if (realAge < 13) {
        throw new AppError('Você precisa ter pelo menos 13 anos para se cadastrar', 400)
      }
    }

    const { data, error } = await supabaseAuth.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name,
        },
        ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
      },
    })

    if (error) {
      const lower = error.message.toLowerCase()
      if (lower.includes('already registered') || lower.includes('already been registered')) {
        throw new AppError('Email já cadastrado', 409)
      }
      throw new AppError(error.message, 400)
    }
    if (!data.user) throw new AppError('Falha ao criar usuario', 400)

    // Quando "Confirm email" está habilitado, o Supabase pode mascarar usuário já existente
    // retornando sucesso sem sessão e com identities vazias (anti-enumeration).
    if (!data.session && (!data.user.identities || data.user.identities.length === 0)) {
      throw new AppError('Email já cadastrado', 409)
    }

    // O profile base é criado pelo trigger do Supabase (auth.users -> public.profiles).
    // Aqui só sincronizamos dados extras de forma idempotente.
    const profile = await authRepository.upsertProfile(data.user.id, name, location, birthDate)

    return {
      user: data.user,
      profile,
      message: 'Cadastro criado. Confira seu email e confirme a conta antes de fazer login.',
    }
  },

  async login(email: string, password: string) {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      const lower = error.message.toLowerCase()
      if (lower.includes('email not confirmed')) {
        throw new AppError('Confirme seu email antes de fazer login', 403)
      }

      throw new AppError('Credenciais inválidas', 401)
    }

    return sessionResponse(data.session, data.user)
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
