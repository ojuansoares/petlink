export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Petlink API',
    version: '1.0.0',
    description:
      'BFF REST — autenticação via Supabase Auth; dados estruturados em PostgreSQL (Supabase).',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Desenvolvimento' }],
  tags: [
    { name: 'Health', description: 'Disponibilidade da API' },
    { name: 'Auth', description: 'Cadastro, login e sessão (Supabase JWT)' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'Serviço no ar',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    ts: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Cadastro de tutor',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                  name: { type: 'string' },
                  location: { type: 'string', description: 'Localização (texto livre)' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Usuário e perfil criados' },
          '400': { description: 'Dados inválidos ou e-mail em uso' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login (retorna access + refresh JWT)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Sessão criada' },
          '401': { description: 'Credenciais inválidas' },
        },
      },
    },
    '/auth/google': {
      post: {
        tags: ['Auth'],
        summary: 'Login com Google (id_token do SDK nativo)',
        description:
          'Configure o provedor Google no Supabase (Auth → Providers). O app obtém o id_token com Google Sign-In e envia aqui.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idToken'],
                properties: {
                  idToken: { type: 'string', description: 'JWT retornado pelo Google Sign-In' },
                  nonce: { type: 'string', description: 'Opcional (ex.: fluxos com nonce)' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Sessão + perfil (criado se for o primeiro login)' },
          '401': { description: 'Token inválido ou provedor desabilitado' },
        },
      },
    },
    '/auth/facebook': {
      post: {
        tags: ['Auth'],
        summary: 'Login com Facebook (token do SDK)',
        description:
          'Configure o provedor Facebook no Supabase. Envie access_token ou id_token (Limited Login), conforme o SDK.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string', description: 'Access token clássico do Facebook Login' },
                  idToken: { type: 'string', description: 'ID token (ex.: Limited Login)' },
                },
                anyOf: [{ required: ['accessToken'] }, { required: ['idToken'] }],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Sessão + perfil (criado se for o primeiro login)' },
          '401': { description: 'Token inválido ou provedor desabilitado' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Renovar access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Novos tokens' },
          '401': { description: 'Refresh inválido' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Usuário atual (JWT)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Dados do token' },
          '401': { description: 'Não autenticado' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Encerrar sessões do usuário (global)',
        security: [{ bearerAuth: [] }],
        responses: {
          '204': { description: 'Sem conteúdo' },
          '401': { description: 'Não autenticado' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token retornado em POST /auth/login',
      },
    },
  },
}
