import { authService } from '../../../src/modules/auth/auth.service'
import { authRepository } from '../../../src/modules/auth/auth.repository'
import { supabaseAdmin, supabaseAuth } from '../../../src/config/supabase'

jest.mock('../../../src/modules/auth/auth.repository')
jest.mock('../../../src/config/supabase')

const mockedRepo = jest.mocked(authRepository)
const mockedAdmin = jest.mocked(supabaseAdmin)
const mockedAuth = jest.mocked(supabaseAuth)

type MockAuthFn = {
  signUp: jest.Mock
  signInWithPassword: jest.Mock
  signInWithIdToken: jest.Mock
  refreshSession: jest.Mock
}

type MockAdminAuthFn = {
  admin: { signOut: jest.Mock; listUsers: jest.Mock }
}

function getMockAuth(): MockAuthFn {
  return (mockedAuth as any).auth as MockAuthFn
}

function getMockAdminAuth(): MockAdminAuthFn {
  return (mockedAdmin as any).auth as MockAdminAuthFn
}

describe('authService', () => {
  beforeEach(() => {
    jest.resetAllMocks()

    getMockAuth().signUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Email already registered' },
    })
    getMockAuth().signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    })
    getMockAuth().signInWithIdToken.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid token' },
    })
    getMockAuth().refreshSession.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'invalid' },
    })
    const mockAdmin = { signOut: jest.fn().mockResolvedValue({ error: null }), listUsers: jest.fn().mockResolvedValue({ data: { users: [] }, error: null }) }
    getMockAdminAuth().admin = mockAdmin
    mockedRepo.emailExists.mockResolvedValue(false)
  })

  describe('register', () => {
    it('deve registrar usuário com dados válidos', async () => {
      getMockAuth().signUp.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'teste@teste.com', identities: [{ id: 'id1' }] }, session: null },
        error: null,
      })
      mockedRepo.upsertProfile.mockResolvedValue({ id: 'user-1', name: 'João' } as any)

      const result = await authService.register('teste@teste.com', '123456', 'João')

      expect(result.user!.id).toBe('user-1')
      expect(result.profile).toMatchObject({ name: 'João' })
      expect(result.message).toContain('Confira seu email')
    })

    it('deve rejeitar email duplicado', async () => {
      mockedRepo.emailExists.mockResolvedValue(true)

      await expect(authService.register('teste@teste.com', '123456', 'João'))
        .rejects.toThrow('Email já cadastrado')
    })

    it('deve rejeitar se idade < 13', async () => {
      const under13 = new Date()
      under13.setFullYear(under13.getFullYear() - 12)

      await expect(authService.register('teste@teste.com', '123456', 'João', undefined, under13.toISOString()))
        .rejects.toThrow('pelo menos 13 anos')
    })

    it('deve aceitar idade >= 13', async () => {
      getMockAuth().signUp.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'teste@teste.com', identities: [{ id: 'id1' }] }, session: null },
        error: null,
      })
      mockedRepo.upsertProfile.mockResolvedValue({ id: 'user-1', name: 'João' } as any)

      const over13 = new Date()
      over13.setFullYear(over13.getFullYear() - 20)

      const result = await authService.register('teste@teste.com', '123456', 'João', undefined, over13.toISOString())

      expect(result.user!.id).toBe('user-1')
    })

    it('deve tratar erro de email já registrado do Supabase', async () => {
      getMockAuth().signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'already been registered' },
      })

      await expect(authService.register('teste@teste.com', '123456', 'João'))
        .rejects.toThrow('Email já cadastrado')
    })

    it('deve tratar identities vazias como email duplicado', async () => {
      getMockAuth().signUp.mockResolvedValue({
        data: { user: { id: 'user-1', identities: [] }, session: null },
        error: null,
      })

      await expect(authService.register('teste@teste.com', '123456', 'João'))
        .rejects.toThrow('Email já cadastrado')
    })
  })

  describe('login', () => {
    it('deve fazer login com credenciais válidas', async () => {
      getMockAuth().signInWithPassword.mockResolvedValue({
        data: {
          session: { access_token: 'abc', refresh_token: 'def', expires_at: 9999999999 },
          user: { id: 'user-1', email: 'teste@teste.com' },
        },
        error: null,
      })

      const result = await authService.login('teste@teste.com', '123456')

      expect(result.accessToken).toBe('abc')
      expect(result.user.email).toBe('teste@teste.com')
    })

    it('deve rejeitar email não confirmado', async () => {
      getMockAuth().signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Email not confirmed' },
      })

      await expect(authService.login('teste@teste.com', '123456'))
        .rejects.toThrow('Confirme seu email')
    })

    it('deve rejeitar credenciais inválidas', async () => {
      getMockAuth().signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid login credentials' },
      })

      await expect(authService.login('teste@teste.com', 'senha_errada'))
        .rejects.toThrow('Credenciais inválidas')
    })
  })

  describe('refreshToken', () => {
    it('deve renovar token', async () => {
      getMockAuth().refreshSession.mockResolvedValue({
        data: {
          session: { access_token: 'new-abc', refresh_token: 'new-def', expires_at: 9999999999 },
          user: { id: 'user-1', email: 'teste@teste.com' },
        },
        error: null,
      })

      const result = await authService.refreshToken('old-refresh')

      expect(result.accessToken).toBe('new-abc')
    })

    it('deve rejeitar refresh token inválido', async () => {
      getMockAuth().refreshSession.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'invalid' },
      })

      await expect(authService.refreshToken('invalid-token'))
        .rejects.toThrow('Refresh token inválido')
    })
  })

  describe('logout', () => {
    it('deve encerrar sessão', async () => {
      getMockAdminAuth().admin.signOut.mockResolvedValue({ error: null })

      await authService.logout('access-token')

      expect(getMockAdminAuth().admin.signOut).toHaveBeenCalledWith('access-token', 'global')
    })
  })

  describe('loginWithOAuthIdToken', () => {
    it('deve fazer login com Google', async () => {
      getMockAuth().signInWithIdToken.mockResolvedValue({
        data: {
          session: { access_token: 'abc', refresh_token: 'def', expires_at: 9999999999 },
          user: { id: 'user-1', email: 'teste@teste.com', user_metadata: { name: 'João' } },
        },
        error: null,
      })
      mockedRepo.findProfileMaybe.mockResolvedValue(null)
      mockedRepo.upsertProfile.mockResolvedValue({ id: 'user-1', name: 'João' })

      const result = await authService.loginWithOAuthIdToken('google', 'google-token')

      expect(result.accessToken).toBe('abc')
      expect(result.profile).toMatchObject({ name: 'João' })
    })

    it('deve reutilizar perfil existente no OAuth', async () => {
      getMockAuth().signInWithIdToken.mockResolvedValue({
        data: {
          session: { access_token: 'abc', refresh_token: 'def', expires_at: 9999999999 },
          user: { id: 'user-1', email: 'teste@teste.com' },
        },
        error: null,
      })
      mockedRepo.findProfileMaybe.mockResolvedValue({ id: 'user-1', name: 'João Existente' })

      const result = await authService.loginWithOAuthIdToken('google', 'token')

      expect(result.profile).toMatchObject({ name: 'João Existente' })
      expect(mockedRepo.upsertProfile).not.toHaveBeenCalled()
    })

    it('deve rejeitar falha no OAuth', async () => {
      getMockAuth().signInWithIdToken.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid token' },
      })

      await expect(authService.loginWithOAuthIdToken('google', 'bad-token'))
        .rejects.toThrow('Invalid token')
    })
  })
})
