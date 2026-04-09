import { env } from './env'
 
export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Petlink API',
    version: '1.0.0',
    description:
      'BFF REST — autenticação via Supabase Auth; dados estruturados em PostgreSQL (Supabase).',
  },
  servers: [{ url: env.API_URL, description: 'Desenvolvimento' }],
  tags: [
    { name: 'Health', description: 'Disponibilidade da API' },
    { name: 'Auth', description: 'Cadastro, login e sessão (Supabase JWT)' },
    { name: 'Profile', description: 'Perfil do tutor (RF01)' },
    { name: 'Pets', description: 'Cadastro e listagem de pets (RF02/RF27)' },
    { name: 'Uploads', description: 'Upload de arquivos (Cloudinary)' },
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

    '/profile/me': {
      get: {
        tags: ['Profile'],
        summary: 'Buscar perfil do tutor',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Perfil do tutor' },
          '401': { description: 'Não autenticado' },
          '404': { description: 'Perfil não encontrado' },
        },
      },
      put: {
        tags: ['Profile'],
        summary: 'Atualizar perfil do tutor',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  location: { type: 'string' },
                  avatar_url: { type: 'string' },
                  bio: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Perfil atualizado' },
          '400': { description: 'Dados inválidos' },
        },
      },
    },

    '/pets': {
      post: {
        tags: ['Pets'],
        summary: 'Criar um pet (RF02)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'species'],
                properties: {
                  name: { type: 'string' },
                  species: { type: 'string' },
                  breed: { type: 'string', nullable: true },
                  birth_date: { type: 'string', description: 'YYYY-MM-DD', nullable: true },
                  weight_kg: { type: 'number', nullable: true },
                  photo_url: { type: 'string', nullable: true },
                  allergies: { type: 'string', nullable: true },
                  temperament: { type: 'string', nullable: true },
                  observations: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Pet criado' },
          '400': { description: 'Dados inválidos' },
        },
      },
      get: {
        tags: ['Pets'],
        summary: 'Listar pets do tutor (RF27)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Lista de pets' },
          '401': { description: 'Não autenticado' },
        },
      },
    },

    '/pets/{petId}': {
      get: {
        tags: ['Pets'],
        summary: 'Buscar pet pelo id',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'petId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Pet encontrado' },
          '400': { description: 'petId inválido' },
          '404': { description: 'Pet não encontrado' },
        },
      },
      put: {
        tags: ['Pets'],
        summary: 'Atualizar dados do pet',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'petId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  species: { type: 'string' },
                  breed: { type: 'string', nullable: true },
                  birth_date: { type: 'string', description: 'YYYY-MM-DD', nullable: true },
                  weight_kg: { type: 'number', nullable: true },
                  photo_url: { type: 'string', nullable: true },
                  allergies: { type: 'string', nullable: true },
                  temperament: { type: 'string', nullable: true },
                  observations: { type: 'string', nullable: true },
                  is_active: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Pet atualizado' },
          '400': { description: 'Dados inválidos' },
          '404': { description: 'Pet não encontrado' },
          '409': { description: 'Já existe pet com esse nome' },
        },
      },
      delete: {
        tags: ['Pets'],
        summary: 'Remover pet e registros relacionados',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'petId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': { description: 'Pet removido' },
          '400': { description: 'petId inválido' },
          '401': { description: 'Não autenticado' },
          '404': { description: 'Pet não encontrado' },
        },
      },
    },

    '/uploads/image': {
      post: {
        tags: ['Uploads'],
        summary: 'Upload de imagem (retorna URL)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                  folder: { type: 'string', description: 'Opcional. Ex.: petlink/{userId}/pets' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Upload ok (retorna url e publicId)' },
          '400': { description: 'Arquivo inválido' },
          '401': { description: 'Não autenticado' },
          '413': { description: 'Arquivo muito grande' },
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
