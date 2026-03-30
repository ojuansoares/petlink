import { api } from './axios'

export type AuthSessionResponse = {
  accessToken: string
  refreshToken: string
  expiresAt: number | null
  user: { id: string; email?: string | null }
  profile?: {
    id: string
    name: string
    location: string | null
    created_at: string
  }
}

/** Envie o id_token retornado pelo Google Sign-In (nativo ou Expo). */
export async function loginWithGoogleIdToken(idToken: string, nonce?: string) {
  const { data } = await api.post<AuthSessionResponse>('/auth/google', {
    idToken,
    ...(nonce ? { nonce } : {}),
  })
  return data
}

/**
 * Envie access_token (login clássico) ou id_token (Limited Login), conforme o SDK.
 */
export async function loginWithFacebookToken(params: {
  accessToken?: string
  idToken?: string
}) {
  const { data } = await api.post<AuthSessionResponse>('/auth/facebook', params)
  return data
}
