import { env } from './env'

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Petlink API',
    version: '1.0.0',
    description:
      'BFF REST — autenticação via Supabase Auth; dados estruturados em PostgreSQL (Supabase) + MongoDB Atlas.',
  },
  servers: [{ url: env.API_URL, description: 'Desenvolvimento' }],
  tags: [
    { name: 'Health', description: 'Disponibilidade da API' },
    { name: 'Auth', description: 'Cadastro, login e sessão (Supabase JWT)' },
    { name: 'Profile', description: 'Perfil do tutor (RF01)' },
    { name: 'Pets', description: 'Cadastro e listagem de pets (RF02/RF27)' },
    { name: 'Uploads', description: 'Upload de arquivos (Cloudinary)' },
    { name: 'Posts', description: 'Feed, criação e gerenciamento de posts' },
    { name: 'Comments', description: 'Comentários em posts' },
    { name: 'Likes', description: 'Curtidas em posts' },
    { name: 'Follows', description: 'Seguir/deixar de seguir' },
    { name: 'Notifications', description: 'Notificações push e preferências' },
    { name: 'Locations', description: 'Lugares e check-ins (MongoDB)' },
    { name: 'Walks', description: 'Passeios com GPS' },
    { name: 'Feeding', description: 'Plano alimentar e refeições' },
    { name: 'Consultations', description: 'Consultas veterinárias (mídia)' },
    { name: 'Reminders', description: 'Lembretes consolidados' },
    { name: 'Groups', description: 'Grupos de tutores' },
    { name: 'Gamification', description: 'Badges e XP' },
    { name: 'Places', description: 'Lugares (OpenStreetMap)' },
    { name: 'Weather', description: 'Clima e temperatura' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'Serviço no ar',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean', example: true }, ts: { type: 'string', format: 'date-time' } } } } },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Cadastro de tutor',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password', 'name'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' }, name: { type: 'string' }, location: { type: 'string' } } } } } },
        responses: { '201': { description: 'Usuário e perfil criados' }, '400': { description: 'Dados inválidos ou e-mail em uso' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login (retorna access + refresh JWT)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' } } } } } },
        responses: { '200': { description: 'Sessão criada' }, '401': { description: 'Credenciais inválidas' } },
      },
    },
    '/auth/google': {
      post: {
        tags: ['Auth'],
        summary: 'Login com Google (id_token do SDK nativo)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['idToken'], properties: { idToken: { type: 'string' }, nonce: { type: 'string' } } } } } },
        responses: { '200': { description: 'Sessão + perfil' }, '401': { description: 'Token inválido' } },
      },
    },
    '/auth/facebook': {
      post: {
        tags: ['Auth'],
        summary: 'Login com Facebook',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { accessToken: { type: 'string' }, idToken: { type: 'string' } }, anyOf: [{ required: ['accessToken'] }, { required: ['idToken'] }] } } } },
        responses: { '200': { description: 'Sessão + perfil' }, '401': { description: 'Token inválido' } },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Renovar access token',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } } } },
        responses: { '200': { description: 'Novos tokens' }, '401': { description: 'Refresh inválido' } },
      },
    },
    '/auth/me': {
      get: { tags: ['Auth'], summary: 'Usuário atual (JWT)', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Dados do token' }, '401': { description: 'Não autenticado' } } },
    },
    '/auth/logout': {
      post: { tags: ['Auth'], summary: 'Encerrar sessões do usuário', security: [{ bearerAuth: [] }], responses: { '204': { description: 'Sem conteúdo' }, '401': { description: 'Não autenticado' } } },
    },
    '/auth/store-recovery': {
      post: { tags: ['Auth'], summary: 'Armazenar código de recuperação', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['code'], properties: { code: { type: 'string' } } } } } }, responses: { '200': { description: 'Código armazenado' } } },
    },
    '/auth/recovery-session': {
      get: { tags: ['Auth'], summary: 'Recuperar sessão via código', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Dados da sessão' } } },
    },
    '/profile/me': {
      get: { tags: ['Profile'], summary: 'Buscar perfil do tutor', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Perfil do tutor' }, '401': { description: 'Não autenticado' }, '404': { description: 'Perfil não encontrado' } } },
      put: { tags: ['Profile'], summary: 'Atualizar perfil', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, location: { type: 'string' }, avatar_url: { type: 'string' }, bio: { type: 'string' } } } } } }, responses: { '200': { description: 'Perfil atualizado' }, '400': { description: 'Dados inválidos' } } },
      delete: { tags: ['Profile'], summary: 'Excluir conta', security: [{ bearerAuth: [] }], responses: { '204': { description: 'Conta removida' }, '401': { description: 'Não autenticado' } } },
    },
    '/profile/search': {
      get: { tags: ['Profile'], summary: 'Buscar perfis por nome', security: [{ bearerAuth: [] }], parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Lista de perfis' } } },
    },
    '/profile/{userId}': {
      get: { tags: ['Profile'], summary: 'Buscar perfil público', security: [{ bearerAuth: [] }], parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Perfil público' }, '404': { description: 'Não encontrado' } } },
    },
    '/pets': {
      post: { tags: ['Pets'], summary: 'Criar um pet (RF02)', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'species'], properties: { name: { type: 'string' }, species: { type: 'string' }, breed: { type: 'string' }, birth_date: { type: 'string' }, weight_kg: { type: 'number' }, photo_url: { type: 'string' } } } } } }, responses: { '201': { description: 'Pet criado' }, '400': { description: 'Dados inválidos' } } },
      get: { tags: ['Pets'], summary: 'Listar pets do tutor (RF27)', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Lista de pets' }, '401': { description: 'Não autenticado' } } },
    },
    '/pets/search': {
      get: { tags: ['Pets'], summary: 'Buscar pets por nome', security: [{ bearerAuth: [] }], parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Lista de pets' } } },
    },
    '/pets/user/{userId}': {
      get: { tags: ['Pets'], summary: 'Listar pets de um usuário', security: [{ bearerAuth: [] }], parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Lista de pets' } } },
    },
    '/pets/{petId}': {
      get: { tags: ['Pets'], summary: 'Buscar pet pelo id', security: [{ bearerAuth: [] }], parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Pet encontrado' }, '404': { description: 'Não encontrado' } } },
      put: { tags: ['Pets'], summary: 'Atualizar pet', security: [{ bearerAuth: [] }], parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, species: { type: 'string' }, breed: { type: 'string' }, birth_date: { type: 'string' }, weight_kg: { type: 'number' }, photo_url: { type: 'string' }, is_active: { type: 'boolean' } } } } } }, responses: { '200': { description: 'Pet atualizado' }, '404': { description: 'Não encontrado' } } },
      delete: { tags: ['Pets'], summary: 'Remover pet', security: [{ bearerAuth: [] }], parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Pet removido' }, '404': { description: 'Não encontrado' } } },
    },
    '/pets/{petId}/export': {
      get: { tags: ['Pets'], summary: 'Exportar dados do pet (JSON/CSV/PDF)', security: [{ bearerAuth: [] }], parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'csv', 'pdf'], default: 'json' } }], responses: { '200': { description: 'Dados exportados' } } },
    },
    '/pets/{petId}/feeding/plan': {
      get: { tags: ['Feeding'], summary: 'Listar plano alimentar', security: [{ bearerAuth: [] }], parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Plano alimentar' } } },
      post: { tags: ['Feeding'], summary: 'Criar/atualizar plano', security: [{ bearerAuth: [] }], parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'array', items: { type: 'object', properties: { meal_name: { type: 'string' }, meal_time: { type: 'string' }, quantity: { type: 'string' } } } } } } }, responses: { '200': { description: 'Plano salvo' } } },
      delete: { tags: ['Feeding'], summary: 'Remover refeição do plano', security: [{ bearerAuth: [] }], parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['mealPlanId'], properties: { mealPlanId: { type: 'string' } } } } } }, responses: { '200': { description: 'Removido' } } },
    },
    '/pets/{petId}/feeding/logs': {
      get: { tags: ['Feeding'], summary: 'Listar registros do dia', security: [{ bearerAuth: [] }], parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'date', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Registros do dia' } } },
    },
    '/pets/{petId}/feeding/logs/{logId}/check': {
      post: { tags: ['Feeding'], summary: 'Marcar/desmarcar refeição', security: [{ bearerAuth: [] }], parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'logId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['checked'], properties: { checked: { type: 'boolean' } } } } } }, responses: { '200': { description: 'Status atualizado' } } },
    },
    '/pets/{petId}/feeding/score': {
      get: { tags: ['Feeding'], summary: 'Score alimentar do período', security: [{ bearerAuth: [] }], parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'start', in: 'query', schema: { type: 'string' } }, { name: 'end', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Score alimentar' } } },
    },
    '/pets/{petId}/weekly-summary': {
      get: { tags: ['Feeding'], summary: 'Resumo semanal do pet', security: [{ bearerAuth: [] }], parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Resumo semanal' } } },
    },
    '/pets/{petId}/timeline': {
      get: { tags: ['Feeding'], summary: 'Timeline de atividades do pet', security: [{ bearerAuth: [] }], parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }], responses: { '200': { description: 'Timeline paginada' } } },
    },
    '/pets/{petId}/vaccination-card': {
      post: { tags: ['Pets'], summary: 'Gerar carteira de vacinação (PDF)', security: [{ bearerAuth: [] }], parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'PDF gerado' } } },
    },
    '/uploads/image': {
      post: { tags: ['Uploads'], summary: 'Upload de imagem (Cloudinary)', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' }, folder: { type: 'string' } } } } } }, responses: { '201': { description: 'URL e publicId' }, '400': { description: 'Arquivo inválido' } } },
    },
    '/posts': {
      post: { tags: ['Posts'], summary: 'Criar post', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['image_url', 'pet_id'], properties: { image_url: { type: 'string' }, pet_id: { type: 'string' }, caption: { type: 'string' }, location: { type: 'string' } } } } } }, responses: { '201': { description: 'Post criado' }, '400': { description: 'Dados ausentes' } } },
    },
    '/posts/feed': {
      get: { tags: ['Posts'], summary: 'Feed de postagens (recomendados)', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }], responses: { '200': { description: 'Lista de posts' } } },
    },
    '/posts/followed': {
      get: { tags: ['Posts'], summary: 'Feed de quem o usuário segue', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }], responses: { '200': { description: 'Lista de posts' } } },
    },
    '/posts/user/{userId}': {
      get: { tags: ['Posts'], summary: 'Posts de um usuário', security: [{ bearerAuth: [] }], parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }], responses: { '200': { description: 'Lista de posts' } } },
    },
    '/posts/{postId}': {
      put: { tags: ['Posts'], summary: 'Atualizar post', security: [{ bearerAuth: [] }], parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { image_url: { type: 'string' }, caption: { type: 'string' }, location: { type: 'string' } } } } } }, responses: { '200': { description: 'Post atualizado' }, '404': { description: 'Não encontrado' } } },
      delete: { tags: ['Posts'], summary: 'Excluir post', security: [{ bearerAuth: [] }], parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Excluído' }, '404': { description: 'Não encontrado' } } },
    },
    '/posts/{postId}/pin': {
      patch: { tags: ['Posts'], summary: 'Fixar/desfixar post (máx 3)', security: [{ bearerAuth: [] }], parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Status alterado' }, '400': { description: 'Limite atingido' } } },
    },
    '/posts/{postId}/comments': {
      get: { tags: ['Comments'], summary: 'Listar comentários', security: [{ bearerAuth: [] }], parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }], responses: { '200': { description: 'Comentários paginados' } } },
      post: { tags: ['Comments'], summary: 'Criar comentário', security: [{ bearerAuth: [] }], parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['content'], properties: { content: { type: 'string' } } } } } }, responses: { '201': { description: 'Comentário criado' } } },
    },
    '/posts/{postId}/comments/{commentId}': {
      patch: { tags: ['Comments'], summary: 'Editar comentário', security: [{ bearerAuth: [] }], parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'commentId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['content'], properties: { content: { type: 'string' } } } } } }, responses: { '200': { description: 'Comentário atualizado' } } },
      delete: { tags: ['Comments'], summary: 'Deletar comentário', security: [{ bearerAuth: [] }], parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'commentId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Deletado' } } },
    },
    '/posts/{postId}/comments/{commentId}/pin': {
      patch: { tags: ['Comments'], summary: 'Fixar/desfixar comentário', security: [{ bearerAuth: [] }], parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'commentId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Status alterado' } } },
    },
    '/posts/{postId}/like': {
      post: { tags: ['Likes'], summary: 'Curtir/descurtir post', security: [{ bearerAuth: [] }], parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Status da curtida' } } },
      get: { tags: ['Likes'], summary: 'Status da curtida', security: [{ bearerAuth: [] }], parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Status' } } },
    },
    '/posts/{postId}/likes': {
      get: { tags: ['Likes'], summary: 'Lista de quem curtiu', security: [{ bearerAuth: [] }], parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }], responses: { '200': { description: 'Lista paginada' } } },
    },
    '/posts/comments/{commentId}/like': {
      post: { tags: ['Likes'], summary: 'Curtir/descurtir comentário', security: [{ bearerAuth: [] }], parameters: [{ name: 'commentId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Status' } } },
      get: { tags: ['Likes'], summary: 'Status da curtida no comentário', security: [{ bearerAuth: [] }], parameters: [{ name: 'commentId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Status' } } },
    },
    '/follows/{userId}': {
      post: { tags: ['Follows'], summary: 'Seguir usuário', security: [{ bearerAuth: [] }], parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '201': { description: 'Seguindo' } } },
      delete: { tags: ['Follows'], summary: 'Deixar de seguir', security: [{ bearerAuth: [] }], parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Deixou de seguir' } } },
    },
    '/follows/check/{userId}': {
      get: { tags: ['Follows'], summary: 'Verificar se segue', security: [{ bearerAuth: [] }], parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Status do follow' } } },
    },
    '/follows/followers/{userId}': {
      get: { tags: ['Follows'], summary: 'Listar seguidores', security: [{ bearerAuth: [] }], parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Lista de seguidores' } } },
    },
    '/follows/following/{userId}': {
      get: { tags: ['Follows'], summary: 'Listar quem segue', security: [{ bearerAuth: [] }], parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Lista de seguindo' } } },
    },
    '/notifications': {
      get: { tags: ['Notifications'], summary: 'Listar notificações', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Lista de notificações' } } },
    },
    '/notifications/read-all': {
      patch: { tags: ['Notifications'], summary: 'Marcar todas como lidas', security: [{ bearerAuth: [] }], responses: { '204': { description: 'Marcadas' } } },
    },
    '/notifications/register-token': {
      post: { tags: ['Notifications'], summary: 'Registrar token push', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token', 'platform'], properties: { token: { type: 'string' }, platform: { type: 'string' }, fcmToken: { type: 'string' } } } } } }, responses: { '201': { description: 'Registrado' } } },
    },
    '/notifications/preferences': {
      get: { tags: ['Notifications'], summary: 'Preferências de notificação', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Preferências' } } },
      put: { tags: ['Notifications'], summary: 'Atualizar preferências', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { enabled: { type: 'boolean' }, alimentacao: { type: 'boolean' }, vacinas: { type: 'boolean' }, social_likes: { type: 'boolean' }, social_follows: { type: 'boolean' }, aniversario: { type: 'boolean' }, temperatura: { type: 'boolean' }, passeio: { type: 'boolean' } } } } } }, responses: { '200': { description: 'Atualizadas' } } },
    },
    '/notifications/test': {
      post: { tags: ['Notifications'], summary: '[TESTE] Enviar push manual', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['title'], properties: { title: { type: 'string' }, body: { type: 'string' }, type: { type: 'string', enum: ['social', 'temperature_alert'], default: 'social' }, data: { type: 'object' } } } } } }, responses: { '200': { description: 'Push enviado' } } },
    },
    '/locations/nearby': {
      get: { tags: ['Locations'], summary: 'Lugares próximos', security: [{ bearerAuth: [] }], parameters: [{ name: 'lat', in: 'query', schema: { type: 'number' } }, { name: 'lng', in: 'query', schema: { type: 'number' } }, { name: 'radius', in: 'query', schema: { type: 'number' } }], responses: { '200': { description: 'Lista de lugares' } } },
    },
    '/locations/search': {
      get: { tags: ['Locations'], summary: 'Buscar lugares por nome', security: [{ bearerAuth: [] }], parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Resultados' } } },
    },
    '/locations': {
      post: { tags: ['Locations'], summary: 'Criar lugar', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'lat', 'lng'], properties: { name: { type: 'string' }, lat: { type: 'number' }, lng: { type: 'number' }, category: { type: 'string' }, address: { type: 'string' } } } } } }, responses: { '201': { description: 'Lugar criado' } } },
    },
    '/locations/{locationId}/checkin': {
      post: { tags: ['Locations'], summary: 'Fazer check-in', security: [{ bearerAuth: [] }], parameters: [{ name: 'locationId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '201': { description: 'Check-in registrado' } } },
    },
    '/locations/{locationId}/reviews': {
      get: { tags: ['Locations'], summary: 'Avaliações do lugar', security: [{ bearerAuth: [] }], parameters: [{ name: 'locationId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Lista de avaliações' } } },
      post: { tags: ['Locations'], summary: 'Avaliar lugar', security: [{ bearerAuth: [] }], parameters: [{ name: 'locationId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['rating'], properties: { rating: { type: 'integer', minimum: 1, maximum: 5 }, comment: { type: 'string' } } } } } }, responses: { '201': { description: 'Avaliação criada' } } },
    },
    '/walks': {
      get: { tags: ['Walks'], summary: 'Listar passeios', security: [{ bearerAuth: [] }], parameters: [{ name: 'petId', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Lista de passeios' } } },
      post: { tags: ['Walks'], summary: 'Criar passeio', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['pet_id', 'started_at'], properties: { pet_id: { type: 'string' }, started_at: { type: 'string' }, ended_at: { type: 'string' }, distance_m: { type: 'number' }, duration_s: { type: 'integer' } } } } } }, responses: { '201': { description: 'Passeio criado' } } },
    },
    '/walks/stats': {
      get: { tags: ['Walks'], summary: 'Estatísticas agregadas', security: [{ bearerAuth: [] }], parameters: [{ name: 'petId', in: 'query', schema: { type: 'string' } }, { name: 'start', in: 'query', schema: { type: 'string' } }, { name: 'end', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Stats' } } },
    },
    '/walks/{id}': {
      get: { tags: ['Walks'], summary: 'Detalhes do passeio', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Passeio' } } },
      put: { tags: ['Walks'], summary: 'Atualizar passeio', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { notes: { type: 'string' }, photo_url: { type: 'string' } } } } } }, responses: { '200': { description: 'Atualizado' } } },
      delete: { tags: ['Walks'], summary: 'Deletar passeio', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Deletado' } } },
    },
    '/consultations/media/batch': {
      get: { tags: ['Consultations'], summary: 'Listar mídias em lote', security: [{ bearerAuth: [] }], parameters: [{ name: 'consultationIds', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Mídias' } } },
    },
    '/consultations/media/{consultationId}': {
      get: { tags: ['Consultations'], summary: 'Listar mídias da consulta', security: [{ bearerAuth: [] }], parameters: [{ name: 'consultationId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Mídias' } } },
      post: { tags: ['Consultations'], summary: 'Adicionar mídia', security: [{ bearerAuth: [] }], parameters: [{ name: 'consultationId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['url'], properties: { url: { type: 'string' }, file_name: { type: 'string' }, file_type: { type: 'string' } } } } } }, responses: { '201': { description: 'Mídia adicionada' } } },
      delete: { tags: ['Consultations'], summary: 'Remover mídia', security: [{ bearerAuth: [] }], parameters: [{ name: 'consultationId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'mediaId', in: 'query', schema: { type: 'string' } }], responses: { '204': { description: 'Removida' } } },
    },
    '/reminders': {
      get: { tags: ['Reminders'], summary: 'Lembretes consolidados', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Lembretes' } } },
    },
    '/groups': {
      get: { tags: ['Groups'], summary: 'Meus grupos', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Lista de grupos' } } },
      post: { tags: ['Groups'], summary: 'Criar grupo', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, description: { type: 'string' }, photo_url: { type: 'string' }, species: { type: 'string' }, is_public: { type: 'boolean', default: true } } } } } }, responses: { '201': { description: 'Grupo criado' } } },
    },
    '/groups/discover': {
      get: { tags: ['Groups'], summary: 'Descobrir grupos públicos', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Grupos' } } },
    },
    '/groups/search': {
      get: { tags: ['Groups'], summary: 'Buscar grupos por nome', security: [{ bearerAuth: [] }], parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Resultados' } } },
    },
    '/groups/invites/pending': {
      get: { tags: ['Groups'], summary: 'Convites pendentes', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Convites' } } },
    },
    '/groups/invites/{inviteId}/accept': {
      post: { tags: ['Groups'], summary: 'Aceitar convite', security: [{ bearerAuth: [] }], parameters: [{ name: 'inviteId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Convite aceito' } } },
    },
    '/groups/invites/{inviteId}/reject': {
      post: { tags: ['Groups'], summary: 'Recusar convite', security: [{ bearerAuth: [] }], parameters: [{ name: 'inviteId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Convite recusado' } } },
    },
    '/groups/{id}': {
      get: { tags: ['Groups'], summary: 'Detalhes do grupo', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Grupo' } } },
      put: { tags: ['Groups'], summary: 'Atualizar grupo', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, photo_url: { type: 'string' }, is_public: { type: 'boolean' } } } } } }, responses: { '200': { description: 'Grupo atualizado' } } },
      delete: { tags: ['Groups'], summary: 'Deletar grupo', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Grupo deletado' } } },
    },
    '/groups/{id}/join': {
      post: { tags: ['Groups'], summary: 'Entrar no grupo', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Membro adicionado' } } },
    },
    '/groups/{id}/leave': {
      post: { tags: ['Groups'], summary: 'Sair do grupo', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Membro removido' } } },
    },
    '/groups/{id}/invite': {
      post: { tags: ['Groups'], summary: 'Convidar usuário (admin)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['userId'], properties: { userId: { type: 'string' } } } } } }, responses: { '201': { description: 'Convite enviado' } } },
    },
    '/groups/{id}/search-users': {
      get: { tags: ['Groups'], summary: 'Buscar usuários fora do grupo', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'q', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Usuários' } } },
    },
    '/groups/{id}/posts': {
      get: { tags: ['Groups'], summary: 'Posts do grupo', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }], responses: { '200': { description: 'Posts paginados' } } },
    },
    '/groups/{id}/posts/{postId}': {
      delete: { tags: ['Groups'], summary: 'Deletar post do grupo', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'postId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Post deletado' } } },
    },
    '/groups/{id}/posts/{postId}/pin': {
      patch: { tags: ['Groups'], summary: 'Fixar/desfixar post no grupo (admin)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'postId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Status alterado' } } },
    },
    '/groups/{id}/members/{userId}/role': {
      patch: { tags: ['Groups'], summary: 'Alterar papel do membro (admin)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'userId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['role'], properties: { role: { type: 'string', enum: ['admin', 'member'] } } } } } }, responses: { '200': { description: 'Papel atualizado' } } },
    },
    '/groups/{id}/members/{userId}': {
      delete: { tags: ['Groups'], summary: 'Remover membro (admin)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'userId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Membro removido' } } },
    },
    '/gamification/my': {
      get: { tags: ['Gamification'], summary: 'Meu nível e badges', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Dados de gamificação' } } },
    },
    '/gamification/{userId}': {
      get: { tags: ['Gamification'], summary: 'Nível e badges de outro usuário', security: [{ bearerAuth: [] }], parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Dados públicos' } } },
    },
    '/places/search': {
      get: { tags: ['Places'], summary: 'Buscar lugares (OSM Nominatim)', security: [{ bearerAuth: [] }], parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }, { name: 'lat', in: 'query', schema: { type: 'number' } }, { name: 'lng', in: 'query', schema: { type: 'number' } }, { name: 'petFriendly', in: 'query', schema: { type: 'boolean' } }, { name: 'category', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Resultados' } } },
    },
    '/places/pet-friendly/ids': {
      get: { tags: ['Places'], summary: 'IDs de lugares Pet Friendly', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Lista de IDs' } } },
    },
    '/places/{osmType}/{osmId}': {
      get: { tags: ['Places'], summary: 'Detalhes do lugar', security: [{ bearerAuth: [] }], parameters: [{ name: 'osmType', in: 'path', required: true, schema: { type: 'string' } }, { name: 'osmId', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'Detalhes + avaliações' } } },
    },
    '/places/{osmType}/{osmId}/pet-friendly': {
      post: { tags: ['Places'], summary: 'Votar Pet Friendly', security: [{ bearerAuth: [] }], parameters: [{ name: 'osmType', in: 'path', required: true, schema: { type: 'string' } }, { name: 'osmId', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'Voto registrado' } } },
    },
    '/places/{osmType}/{osmId}/reviews': {
      get: { tags: ['Places'], summary: 'Avaliações do lugar', security: [{ bearerAuth: [] }], parameters: [{ name: 'osmType', in: 'path', required: true, schema: { type: 'string' } }, { name: 'osmId', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'Avaliações' } } },
      post: { tags: ['Places'], summary: 'Avaliar lugar', security: [{ bearerAuth: [] }], parameters: [{ name: 'osmType', in: 'path', required: true, schema: { type: 'string' } }, { name: 'osmId', in: 'path', required: true, schema: { type: 'integer' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['rating'], properties: { rating: { type: 'integer', minimum: 1, maximum: 5 }, comment: { type: 'string' } } } } } }, responses: { '201': { description: 'Avaliação criada' } } },
    },
    '/places/reviews/{reviewId}': {
      delete: { tags: ['Places'], summary: 'Remover avaliação', security: [{ bearerAuth: [] }], parameters: [{ name: 'reviewId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Removida' } } },
    },
    '/weather/current': {
      get: { tags: ['Weather'], summary: 'Clima atual (Open-Meteo)', security: [{ bearerAuth: [] }], parameters: [{ name: 'lat', in: 'query', schema: { type: 'number' } }, { name: 'lng', in: 'query', schema: { type: 'number' } }], responses: { '200': { description: 'Dados do clima' } } },
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