# PetLink — Plano de Desenvolvimento

## Stack de banco de dados

| Banco | Função | Tabelas/Collections |
|-------|--------|---------------------|
| **Supabase (PostgreSQL)** | Dados estruturados com integridade referencial + RLS | profiles, pets, vaccines, weight_records, consultations, consultations_attachments, feeding_plans, feeding_logs, walks, follows, calendar_events, groups, group_members, group_posts, notifications, push_tokens |
| **MongoDB Atlas** | Dados de alto volume, schema flexível, geoespacial | posts, comments, likes, comment_likes, locations (2dsphere), reviews, checkins |

**Fluxo:**
```
App (Redux) → Axios (JWT) → Node.js BFF → Supabase (auth, pets, saúde, walks, follows, grupos, notificações)
                                         → MongoDB Atlas (posts, comments, likes, locations, reviews, checkins)
                                         → Cloudinary (imagens)
```

---

## Estrutura de diretórios (servidor)

```
server/src/
├── config/
│   ├── env.ts            # Zod — valida MONGODB_URI, SUPABASE_*, CLOUDINARY_*
│   ├── mongoose.ts       # Conexão MongoDB Atlas
│   ├── supabase.ts       # Conexão Supabase admin
│   ├── cloudinary.ts
│   └── swagger.ts
├── models/               # Mongoose schemas (MongoDB)
│   ├── Post.ts
│   ├── Comment.ts
│   ├── Like.ts
│   ├── CommentLike.ts
│   ├── Location.ts        # índice 2dsphere
│   ├── Review.ts
│   └── Checkin.ts
├── modules/
│   ├── auth/             # Supabase
│   ├── profile/          # Supabase
│   ├── pets/             # Supabase
│   ├── posts/            # MongoDB ✅ (enriquecido c/ Supabase p/ profiles/pets)
│   ├── comments/         # MongoDB ✅ (com paginação, pin, edit, enrich profile)
│   ├── likes/            # MongoDB ✅ (com paginação, enrich profile)
│   ├── commentLikes/     # MongoDB ✅ (toggle like em comentário)
│   ├── locations/        # MongoDB ✅ (geo $near)
│   ├── walks/            # Supabase
│   ├── follows/          # Supabase
│   ├── notifications/    # Supabase
│   └── uploads/          # Cloudinary
├── middlewares/
│   └── auth.middleware.ts
├── shared/
│   ├── AppError.ts
│   └── mapId.ts          # _id → id p/ lean()
├── app.ts
└── server.ts             # connectMongo() + listen()
```

---

## Status atual

### Backend (Express)

#### Supabase (PostgreSQL) — pronto
- [x] Auth: registro, login, Google, Facebook, refresh, logout
- [x] Profile: GET/PUT/DELETE próprio, GET público
- [x] Pets: CRUD completo + listagem
- [x] Follows: seguir/deixar de seguir, checar, listar
- [x] Upload: Cloudinary
- [x] Walks: CRUD (`/walks`, Supabase)
- [x] Notificações: list, mark-all-read, register-token (`/notifications`, Supabase)

#### MongoDB Atlas — pronto
- [x] Config mongoose + conexão em `server.ts`
- [x] 7 modelos: Post, Comment, Like, CommentLike, Location (2dsphere), Review, Checkin
- [x] Locations: nearby (`$near`), search, create, checkin, reviews (`/locations`, MongoDB)
- [x] Comments: list, create, delete, edit, pin/unpin (`/posts/:postId/comments`, MongoDB)
- [x] Comments: enriquecido com Supabase (name, avatar_url) + avatar Cloudinary otimizado (120×120)
- [x] Comments: paginação server-side (page/limit, total, hasMore)
- [x] Likes: toggle, status, list enrich + paginação (`/posts/:postId/like`, MongoDB)
- [x] CommentLikes: toggle like em comentário (`/posts/:postId/comments/:commentId/like`)

#### ✅ Concluído (Phase 2)
- [x] Posts: módulo `posts/` reescrito para Mongoose `Post` com enriquecimento de profiles/pets via Supabase
- [x] Script de migração executado: 11 posts migrados do Supabase → MongoDB
- [x] Rotas de posts mantêm mesma interface (`/posts`, `/posts/feed`, `/posts/followed`, etc.)

### Mobile (Expo + React Native) — Home Screen 🏠

#### Estado atual
- Header: "Bem-vindo de volta!" / "Olá, Humano!"
- Banner carrossel estático (2 imagens)
- Seção "Lembretes" com 3 cards hardcoded (vacina, alimentação, passeio)
- Nada conectado ao backend — tudo mockado/estático

#### O que precisa ser construído

| # | Tarefa | Prioridade |
|---|--------|------------|
| H1 | **Dashboard do pet ativo**: foto, nome, espécie, peso atual, próxima vacina — puxado do Redux (pets + health) | ✅ |
| H2 | **Lembretes reais**: endpoint `GET /reminders` no servidor — vacinas vencendo/próximas + consultas futuras. Consumido na Home. | ✅ |
| H3 | **Quick actions**: botões de ação rápida — "Criar post", "Registrar peso", "Agendar consulta", "Alimentação" | ✅ |
| H4 | **Resumo da semana**: card com stats dos últimos 7 dias (refeições, peso, vacinas, consultas) — endpoint `GET /pets/:petId/weekly-summary` | ✅ |
| H5 | **Feed de atividades**: timeline cronológica (peso, vacinas, consultas, posts) com paginação — endpoint `GET /pets/:petId/timeline` | ✅ |
| H7 | **Empty state inteligente**: se não tem pet, CTA pra cadastrar. Se tem pet sem dados, onboarding gentil | ✅ |
| H8 | **Responsividade**: adaptar layout para diferentes tamanhos de tela (ScrollView com seções flexíveis, sem hardcoded heights) | ✅ |

### Mobile (Expo + React Native) — Demais features
- [x] Auth: login, registro, Google, Facebook, biometria
- [x] Home, Pets CRUD, vacinas, consultas, peso, calendário
- [x] Feed (recomendados/seguindo), paginação, offline
- [x] Profile, perfil público, seguir/deixar de seguir
- [x] WatermelonDB offline, sincronização
- [x] Navegação completa, tema escuro/claro, onboarding
- [x] NotificationService (expo-notifications + Expo Push)
- [x] LocationService (geolocalização, watch, reverse geocode)
- [x] Password reset com server bridge (`recovery_code`)
- [x] Comments: CommentSheet com FlatList, criar, editar inline (React.memo CommentContent), deletar, pin/unpin
- [x] Comments: menu contextual (3 pontinhos) com Editar/Fixar/Desafixar/Deletar/Denunciar
- [x] Comments/Likes: enriquecidos com username + avatar_url do perfil
- [x] Comments/Likes: paginação com infinite scroll (onEndReached)
- [x] Likes: LikesSheet com lista de quem curtiu
- [x] CommentLikes: toggle like em comentário
- [x] ConfirmModal: componente customizado (substitui Alert.alert nativo)
- [x] Bloqueio offline: interceptor axios bloqueia mutações sem internet
- [x] Step indicator (4 bolinhas) nos modais de criação de pet + mais espécies padrão (Peixe, Roedor, Coelho, Hamster, Tartaruga, Cavalo) + espécie customizada ("Outro")
- [x] Peso responsivo por espécie: MAX_WEIGHT_BY_SPECIES com maxLength dinâmico, validação no handleNext/create/update
- [x] formatCount (abreviação numérica: 1,5mil, 2mi) em todos os contadores (posts, seguidores, seguindo, pets, likes, comentários)
- [x] CommentSheet: keyboard via addListener + marginBottom (sem KeyboardAvoidingView — evita modal "voando")
- [x] LikesSheet: loadingListByPostId distingue loading de empty
- [x] PublicProfileScreen: RefreshControl (pull-to-reload perfil/posts/pets/follow)
- [x] ProfileFeedScreen: ícones like/comentário size=26 (consistente com FeedPostItem)
- [x] Ações em notificações: vacina (✅ marcar aplicada, ⏰ lembrar amanhã) e alimentação (✅ já alimentei)
- [x] Deep links em notificações: ao tap, navega para tela correta (Vacina + detail, Alimentação, Perfil Público)

## Backend (Express)

### Novas funcionalidades
- [x] Feed day-grouped + random-within-day: posts ordenados por dia (hoje, ontem, anteontem…), dentro de cada dia ordem aleatória a cada reload. Aplica-se a ambos os feeds: Recomendado e Seguindo.
- [x] Navegação para perfil público via CommentSheet/LikesSheet: requestAnimationFrame após onClose() para evitar race condition nos contadores.

### Migrations (Supabase)
- [x] schema.sql — schema original (auth, profiles, pets, vacinas, consultas, etc.)
- [x] `migrations/002_push_tokens.sql` — push_tokens + índices extras
- [x] Rodar `002_push_tokens.sql` no dashboard do Supabase
- [x] `migrations/005_groups.sql` — groups, group_members, RPC, RLS, índices trigram
- [x] `migrations/008_group_invites.sql` — group_invites, RLS, índices
- [x] Tabela `posts` removida do Supabase (migrado para MongoDB)

---

## Arquivos alterados nesta sessão (30/05/2026) — Grupos v3 + Correções

### Servidor
| Arquivo | Mudança |
|---------|---------|
| `src/migrations/008_group_invites.sql` | **Novo** — tabela `group_invites` com RLS |
| `src/modules/groups/groups.repository.ts` | `member_count: 0` explícito no create; `discover`/`search` filtram grupos do usuário; + `getUserGroupIds`, + 6 métodos de invite + `searchUsersForGroup` |
| `src/modules/groups/groups.service.ts` | `discover`/`search` recebem userId; + 5 métodos de invite |
| `src/modules/groups/groups.controller.ts` | `discover`/`search` passam userId; + 5 handlers de invite |
| `src/modules/groups/groups.routes.ts` | +5 rotas de invite (antes de `/:id`) |

### Mobile
| Arquivo | Mudança |
|---------|---------|
| `src/api/groups.api.ts` | +6 funções de invite + tipo `GroupInvite` |
| `src/store/slices/groupsSlice.ts` | +3 thunks invite, +1 reducer `setGroupMembers`, estado `pendingInvites`, selectors |
| `src/screens/GroupDetailScreen.tsx` | **Reescrito** — `MemberRow` extraído, `AddMemberModal` com busca, `groupMembers` populado, botão "Entrar" para não-membros |
| `src/screens/GroupsScreen.tsx` | Seção "Solicitações de entrada" no topo de Meus Grupos; DiscoverCard checa `myGroups` |

## Fases

### Fase 1 — Fundação ✅ (concluída)

| # | Tarefa | Status | Banco |
|---|--------|--------|-------|
| 1 | Servidor de notificações (`/notifications`) | ✅ | Supabase |
| 2 | Servidor de localizações (`/locations`) | ✅ → **reescrito p/ MongoDB** | MongoDB |
| 3 | Servidor de walks (`/walks`) | ✅ | Supabase |
| 4 | NotificationService.ts (mobile) | ✅ | — |
| 5 | LocationService.ts (mobile) | ✅ | — |
| 6 | Barrel `api.ts` + imports quebrados | ✅ | — |
| 7 | Migration SQL inicial | ✅ → `002_push_tokens.sql` | Supabase |

---

### Fase 2 — MongoDB Atlas ✅ (concluída)

#### 2.1 — Setup Mongoose ✅
| # | Tarefa | Status |
|---|--------|--------|
| 8 | Instalar mongoose | ✅ (já estava no package.json) |
| 9 | Config `server/src/config/mongoose.ts` | ✅ |
| 10 | Adicionar `MONGODB_URI` ao `env.ts` | ✅ |
| 11 | Inicializar no `server.ts` | ✅ |

#### 2.2 — Mongoose Models ✅
| # | Model | Status |
|---|-------|--------|
| 12 | Post | ✅ |
| 13 | Comment | ✅ |
| 14 | Like | ✅ (unique compound postId+userId) |
| 15 | Location | ✅ (índice 2dsphere) |
| 16 | Review | ✅ (unique locationId+authorId) |
| 17 | Checkin | ✅ |

#### 2.3 — Locations + Reviews + Checkins ✅
| # | Tarefa | Status |
|---|--------|--------|
| 18 | Reescrever `locations.repository.ts` (Mongoose + $near) | ✅ |
| 19 | Criar módulo `comments` (`/posts/:postId/comments`) | ✅ |
| 20 | Criar módulo `likes` (`/posts/:postId/like`) | ✅ |
| 21 | Incrementar likesCount/commentsCount no Post | ✅ (no service) |
| 22 | Recalcular avgRating nas reviews | ✅ (aggregation pós-save) |

#### 2.4 — Migrar Posts ✅ (concluído)
| # | Tarefa | Status |
|---|--------|--------|
| 23 | Reescrever `posts.repository.ts` (Supabase → Mongoose Post + enrich) | ✅ |
| 24 | Feed → sort `createdAt: -1` com day-grouped + random-within-day (ambos os feeds) | ✅ |
| 25 | Script `src/scripts/migrate-posts-to-mongo.ts` | ✅ (11 posts migrados) |
| 26 | Remover tabela `posts` do Supabase (após validar) | ✅ |

#### 2.5 — Mobile: slices
| # | Tarefa | Status |
|---|--------|--------|
| 27 | Validar `locationsSlices.ts` (formato de resposta) | ✅ (resposta mantém lat/lng via cálculo no repositório) |
| 28 | Validar `postsSlice.ts` (API inalterada) | ✅ |
| 29 | `commentsSlice.ts` | ✅ Paginação (pages, hasMore), create, edit, delete, togglePin, fetchMore |
| 30 | `likesSlice.ts` | ✅ Paginação, toggle, fetch, fetchMore |
| 31 | `commentLikesSlice.ts` | ✅ Toggle like em comentário |

#### 2.6 — Mobile: Comments & Likes UI

**API disponível no servidor:**
| Método | Rota | Descrição | Resposta |
|--------|------|-----------|----------|
| `GET` | `/posts/:postId/comments?page=1&limit=10` | Lista comentários (paginado) | `{ data: Comment[], total, page, hasMore }` |
| `POST` | `/posts/:postId/comments` | Criar comentário (`{ content }`) | `Comment` (enriquecido) |
| `PATCH` | `/posts/:postId/comments/:commentId` | Editar comentário (`{ content }`) | `Comment` |
| `DELETE` | `/posts/:postId/comments/:commentId` | Deletar próprio comentário | `204` |
| `POST` | `/posts/:postId/comments/:commentId/pin` | Toggle pin (autor do post) | `{ isPinned: boolean }` |
| `POST` | `/posts/:postId/like` | Toggle like | `{ liked: boolean, likesCount: number }` |
| `GET` | `/posts/:postId/like` | Status do like | `{ liked: boolean, likesCount: number }` |
| `GET` | `/posts/:postId/likes?page=1&limit=10` | Lista quem curtiu (paginado, enrich) | `{ data: LikeEntry[], total, page, hasMore }` |
| `POST` | `/posts/:postId/comments/:commentId/like` | Toggle like em comentário | `{ liked: boolean, likesCount: number }` |

**Modelo `Comment` enriquecido (retornado pela API):**
```ts
{
  id: string, postId: string, authorId: string,
  content: string, createdAt: string, updatedAt: string,
  isPinned: boolean, likesCount: number,
  username?: string | null, avatar_url?: string | null  // do Supabase profiles
}
```

**Modelo `LikeEntry` enriquecido:**
```ts
{
  id: string, postId: string, userId: string,
  createdAt: string,
  username?: string | null, avatar_url?: string | null  // do Supabase profiles
}
```

**Post já inclui:** `likes_count`, `comments_count`

| # | Tarefa | Status | Detalhes |
|---|--------|--------|----------|
| 31 | `commentsSlice.ts` | ✅ | Store comments por postId. Thunks: fetchComments, createComment, editComment, deleteComment, togglePin, fetchMoreComments (paginação). |
| 32 | `likesSlice.ts` | ✅ | Store `liked` status por postId. Thunks: toggleLike, fetchLikesByPost, fetchLikeStatus, fetchMoreLikesByPost. |
| 33 | `commentLikesSlice.ts` | ✅ | Store comment likes. Thunk: toggleCommentLike (retorna `{ liked, likesCount }`). |
| 34 | `LikesButton` componente | ✅ | Ícone coração preenchido/vazado + contagem + loading spinner. |
| 35 | `LikesSheet` componente | ✅ | Bottom sheet com lista de quem curtiu, avatar + username, navigate ao perfil, infinite scroll. |
| 36 | `CommentSheet` componente | ✅ | Bottom sheet com FlatList, input fixo no final, CommentContent (React.memo) com edição inline, menu 3 pontinhos (Editar/Fixar/Desafixar/Deletar/Denunciar), ConfirmModal, infinite scroll. |
| 37 | `ConfirmModal` componente | ✅ | Modal customizado com tema do app, substitui Alert.alert em deletar comentário, biometria, sessão. |
| 38 | Integrar no `FeedPostItem` | ✅ | LikesButton + CommentSheet. Like e comentário com enriched profile. |
| 39 | Botão de like no `ProfileFeed` | ✅ | LikesButton + CommentSheet na tela ProfileFeedScreen. |
| 40 | Offline: like + comentário | ✅ | Bloqueado pelo interceptor de mutação offline. |
| 41 | Enriquecimento de perfil | ✅ | username (name do Supabase) + avatar_url (Cloudinary 120×120) em comments/likes. |
| 42 | Paginação infinite scroll | ✅ | onEndReached carrega próxima página, spinner no rodapé da FlatList. |
| 43 | Avatar otimizado | ✅ | Preset 'avatar' → w_120,h_120,c_fill via optimizeCloudinaryUrl. |

---

### Fase 3 — Push Notifications

#### 3.1 — Servidor: infra de disparo

| # | Tarefa | Status | Detalhes |
|---|--------|--------|----------|
| 39 | `POST /notifications/register-token` | ✅ | Já existe no módulo `notifications/` |
| 40 | Instalar `expo-server-sdk` e `node-cron` | ✅ | server/package.json |
| 41 | Adicionar `EXPO_ACCESS_TOKEN` ao `env.ts` | ⏭️ | Não necessário — Expo Push API não requer token |
| 42 | Criar módulo `push/` com `push.service.ts` | ✅ | `sendPush()`: busca token, envia via Expo, trata DeviceNotRegistered, salva notificação |
| 43 | Criar `push.scheduler.ts` | ✅ | Cron diário 08:00 — vacinas vencendo (`notified=false`) |
| 44 | Gatilho social: like | ✅ | `likes.service.ts` → push pro autor do post |
| 45 | Gatilho social: comentário | ✅ | `comments.service.ts` → push pro autor do post |
| 46 | Gatilho social: seguir | ✅ | `follows.service.ts` → push pra quem foi seguido |

#### 3.2 — Mobile: wiring

| # | Tarefa | Status | Detalhes |
|---|--------|--------|----------|
| 47 | Instalar `expo-device` | ✅ | Necessário para `getExpoPushTokenAsync()` |
| 48 | Adicionar `expo-notifications` plugin no `app.json` | ✅ | `plugins: ["expo-notifications"]` |
| 49 | Inicializar notificações no `App.tsx` | ✅ | `configureNotifications()`, `createNotificationChannel()`, `requestNotificationPermission()`, `getExpoPushToken()`, `registerPushTokenOnServer()` pós-hydration, condicionado à preferência do usuário |
| 50 | Conectar `SettingsNotificationsScreen` ao Redux | ✅ | Toggle persiste em AsyncStorage (`petlink.notifications.enabled`), lido no startup |

#### 3.3 — FCM / EAS Build ✅

| # | Tarefa | Status | Detalhes |
|---|--------|--------|----------|
| 51 | Criar conta Firebase + configurar FCM | ✅ | Console Firebase configurado |
| 52 | Baixar `google-services.json` e `GoogleService-Info.plist` | ✅ | Em `mobile/google-services.json` |
| 53 | Configurar EAS Build para FCM | ✅ | Chave FCM enviada via `eas credentials` |
| 54 | Testar push em produção (APK + EAS) | ✅ | Push do servidor chega no app via FCM |

---

### Fase 4 — Social & Engajamento

| # | Tarefa | Status |
|---|--------|--------|
| 44 | Compartilhar perfil/pet (deep link) | ✅ |
| 45 | Badges e conquistas | ✅ |

---

### Grupos — Plano de Implementação (v2 — Feed + Membros)

**Ideia:** Grupos de tutores com interesses em comum. Dentro do grupo: feed de posts (foto ou texto) com comentários e likes, lista de membros, e papéis (admin/membro).

**NOVOS ARQUIVOS:**
- `mobile/src/screens/GroupDetailScreen.tsx` — tela principal do grupo (Posts | Membros)
- `mobile/src/components/ui/CreateGroupPostModal.tsx` — criar post no grupo
- `mobile/src/components/ui/CreateGroupModal.tsx` — criar grupo com foto

**ARQUIVOS MODIFICADOS:**
- `server/src/models/Post.ts` — campo `groupId` opcional
- `server/src/modules/posts/posts.repository.ts` — `listByGroup`, `togglePinInGroup`, `findByIdInGroup`, feed filtra group posts
- `server/src/modules/posts/posts.service.ts` — group post validation (texto ou foto, membership, pet opcional)
- `server/src/modules/groups/groups.routes.ts` — +5 rotas (posts, pin, member mgmt)
- `server/src/modules/groups/groups.controller.ts` — handlers novos
- `server/src/modules/groups/groups.service.ts` — `getPosts`, `deletePost`, `togglePinPost`, `changeMemberRole`, `removeMember`
- `server/src/modules/groups/groups.repository.ts` — `updateMemberRole`
- `mobile/src/screens/GroupsScreen.tsx` — GroupDetailModal, CreateGroupModal, FAB, cards Pressable
- `mobile/src/screens/SearchScreen.tsx` — resultado de grupo navega direto pro GroupDetail
- `mobile/src/store/slices/groupsSlice.ts` — thunks p/ posts, pin, roles
- `mobile/src/api/groups.api.ts` — endpoints novos (posts, pin, roles)
- `mobile/src/utils/shareLink.ts` — `shareGroup`
- `mobile/src/navigation/types.ts` + `RootNavigator.tsx` — rota GroupDetail + deep link
- `mobile/src/store/slices/postsSlice.ts` — `Post.image_url` e `pet_id` opcionais
- `mobile/src/components/ui/PostOptionsModal.tsx` — guard image_url undefined

**MIGRAÇÕES SUPABASE:**
- `005_groups.sql` — tabelas `groups`, `group_members`, funções RPC, RLS, índices trigram
- `008_group_invites.sql` — tabela `group_invites`, RLS policies, índices

#### Fluxo de navegação

```
GroupsScreen (tela inicial)
  ├── "Meus Grupos" tab → card do grupo → DETAIL MODAL (info do grupo)
  │                                          └── "Entrar no grupo" → GroupDetailScreen
  │
  └── "Descobrir" tab  → card do grupo → DETAIL MODAL (info do grupo)
                                             └── "Entrar no grupo" → GroupDetailScreen

GroupDetailScreen
  ├── Header: nome, foto, descrição
  │   └── "⋯" menu: Sair do grupo | Denunciar
  │
  ├── Tab "Posts"
  │   ├── "O que você está pensando?" — input que abre modal de criar post (foto ou texto)
  │   └── Feed de posts do grupo (foto ou texto), cada um com:
  │       ├── Comentários (tap abre CommentSheet existente)
  │       └── Like (LikesButton existente)
  │
  └── Tab "Membros"
      ├── Lista de membros (avatar, nome, role)
      ├── Se você é admin: botão "⋯" em cada membro → Tornar admin | Remover
      └── Botão "Convidar" (abre share sheet com link do grupo)
```

#### Servidor (Express)

##### Posts em grupo (MongoDB)

- [x] Adicionar campo opcional `groupId` ao modelo `Post` (Mongoose) — `server/src/models/Post.ts`
- [x] `POST /posts` aceitar `group_id` opcional no payload (texto ou foto) — `server/src/modules/posts/posts.service.ts`
- [x] `GET /groups/:id/posts?page=&limit=` — listar posts do grupo (enriquecido, paginado, sem day-grouping) — `server/src/modules/groups/groups.routes.ts`
- [x] `DELETE /groups/:id/posts/:postId` — deletar post (autor ou admin do grupo) — `server/src/modules/groups/groups.routes.ts`

##### Membros (Supabase — já existe `group_members`)

- [x] `PATCH /groups/:id/members/:userId/role` — alterar role (`admin` | `member`) — só admin pode
- [x] `DELETE /groups/:id/members/:userId` — remover membro (admin remove alguém, ou usuário sai sozinho)

##### Grupo

- [x] `GET /groups/:id` já retorna `my_role` e lista de membros

##### Filtro de group posts no feed global

- [x] Feed global (`/posts/feed` e `/posts/followed`) exclui posts com `groupId` (`$exists: false`)

#### Mobile

##### Navegação

- [x] Rota `GroupDetail` em `AppStackParamList` + `RootNavigator.tsx` + deep link `petlink://group/:groupId`

##### GroupsScreen

- [x] Cards são `Pressable` → abrem `GroupDetailModal` (info do grupo com foto, nome, descrição, membros)
- [x] `GroupDetailModal` — Se é membro: "Ir para o grupo" → `GroupDetail`; se não: "Entrar" → joinThunk → `GroupDetail`
- [x] FAB "Criar grupo" → `CreateGroupModal` com upload de foto

##### GroupDetailScreen

- [x] Header fixo: foto, nome, descrição, "⋯" (Sair / Denunciar)
- [x] SegmentedTabs: "Posts" | "Membros"

##### Aba Posts

- [x] Input fixo "O que você está pensando?" → `CreateGroupPostModal`
- [x] `CreateGroupPostModal`: texto (obrigatório se sem foto), foto opcional, publicar
- [x] Feed FlatList com posts (texto e/ou foto), LikesButton, CommentSheet

##### Fixar posts no grupo

- [x] Só admin pode fixar/desafixar posts no grupo
- [x] Máx. 2 posts fixados por grupo
- [x] `PATCH /groups/:id/posts/:postId/pin` — toggle isPinned para admin
- [x] Posts fixados sobem no topo (`sort: { isPinned: -1, createdAt: -1 }`)
- [x] Botão pin no GroupDetailScreen + pin indicator no post header

##### Aba Membros

- [x] FlatList de membros com avatar, nome, role
- [x] Se admin: "⋯" em cada membro → Tornar admin | Remover
- [x] Botão "Convidar" → share sheet com link do grupo

##### Convidar / Compartilhar

- [x] `shareLink.ts` — `shareGroup(groupId, groupName)` com `petlink://group/${groupId}`

##### Criar grupo com foto

- [x] `CreateGroupModal` — nome, descrição, espécie, upload de foto via Cloudinary

##### Busca por grupos

- [x] `SearchScreen` já filtra por Grupos (dropdown Pessoas/Pets/Grupos)
- [x] Tapping resultado navega direto para `GroupDetail`
- [x] `GET /groups/search?q=` já existia (migração 005 + `pg_trgm`)

---

### Grupos — v3: Convite de usuários + Correções

**Ideia:** Sistema de convite interno (não apenas link). Admin busca usuários dentro do app e envia convite. O convidado vê "Solicitações de entrada" no topo de Meus Grupos e pode aceitar/recusar.

#### Novos arquivos
| Arquivo | Descrição |
|---------|-----------|
| `server/src/migrations/008_group_invites.sql` | Tabela `group_invites` com RLS |

#### Arquivos modificados
| Arquivo | Mudança |
|---------|---------|
| `server/src/modules/groups/groups.repository.ts` | +6 métodos: `createInvite`, `findPendingInvite`, `listPendingInvites`, `acceptInvite`, `rejectInvite`, `searchUsersForGroup` |
| `server/src/modules/groups/groups.service.ts` | +5 métodos de negócio: `inviteUser` (só admin, valida duplicidade), `listPendingInvites`, `acceptInvite` (addMember automático), `rejectInvite`, `searchUsersForGroup` |
| `server/src/modules/groups/groups.controller.ts` | +5 handlers HTTP |
| `server/src/modules/groups/groups.routes.ts` | +5 rotas (invites antes de `/:id`) |
| `mobile/src/api/groups.api.ts` | +6 funções + tipo `GroupInvite` |
| `mobile/src/store/slices/groupsSlice.ts` | +3 thunks, +1 reducer (`setGroupMembers`), estado `pendingInvites`, selectors |
| `mobile/src/screens/GroupDetailScreen.tsx` | **Reescrito** — corrige bugs, add `AddMemberModal`, `MemberRow` component |
| `mobile/src/screens/GroupsScreen.tsx` | Seção "Solicitações de entrada" no topo de Meus Grupos |

#### Correções de bugs
| # | Problema | Solução |
|---|----------|---------|
| 1 | `groupMembers` nunca populado no Redux → aba Membros vazia | `loadGroupDetails` agora dispara `setGroupMembers` |
| 2 | `useAppSelector` dentro de `renderItem` (viola hooks) | Extraído componente `MemberRow` |
| 3 | Deep link `petlink://group/:id` não tinha como entrar no grupo | Botão "Entrar no grupo" no header quando `!isMember` |

#### Fluxo de convite
```
Admin na aba Membros → "Adicionar membros"
  → Modal com campo de busca (debounce 300ms)
  → Busca usuários por nome (exclui membros atuais)
  → "Convidar" → POST /groups/:id/invite

Convidado abre GroupsScreen
  → "Solicitações de entrada" no topo
  → Card com ✓ (aceitar) e ✕ (recusar)
  → Aceitar → addMember + grupo aparece em Meus Grupos
  → Recusar → invite marcado como 'rejected'
```

#### API
| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/groups/:id/invite` | Admin convida usuário |
| `GET` | `/groups/invites/pending` | Lista convites pendentes (com grupo + nome do convidador) |
| `POST` | `/groups/invites/:inviteId/accept` | Aceitar + vira membro |
| `POST` | `/groups/invites/:inviteId/reject` | Recusar |
| `GET` | `/groups/:id/search-users?q=` | Busca usuários fora do grupo |

---

### #45 — Gamificação / Badges & Conquistas

**Ideia:** Sistema de níveis e conquistas para engajar o usuário. Toda ação relevante no app dá XP. Ao atingir marcos, desbloqueia badges. Tudo visível numa nova aba "Conquistas" dentro do Perfil.

#### Perfil — Nova aba "Conquistas"

O header do perfil (foto, nome, stats) permanece igual. Abaixo dele, um `SegmentedTabs` alterna entre:
- **Posts** — grid de fotos (comportamento atual)
- **Conquistas** — seção de gamificação

#### Estrutura da aba Conquistas

1. **Card de Nível** — no topo:
   - Nível atual (ex: "Nível 5 — Veterano")
   - Barra de XP (ex: 1.200 / 2.000)
   - Nome do nível com ícone
2. **Badges conquistadas** — grid de badges que o usuário já desbloqueou
   - Cada badge: ícone + nome + descrição curta
3. **Próximas conquistas** — badges que faltam pouco pra desbloquear (progresso > 50%)
   - Badges "travadas" com barra de progresso

#### Badges planejadas

| Badge | Gatilho | XP |
|-------|---------|----|
| 🐾 Primeiro Post | Criar 1 post | 50 |
| 📸 Paparazzi | Criar 10 posts | 100 |
| 💉 Vacina em Dia | Marcar 5 doses | 100 |
| 🛡️ Protetor | Marcar 20 doses | 200 |
| 🍽️ Refeição Feita | Completar 7 dias de alimentação | 100 |
| 🥇 Dieta de Ouro | Completar 30 dias de alimentação | 300 |
| 👥 Social | Entrar em 3 grupos | 100 |
| 🌟 Líder | Criar um grupo | 150 |
| 🔥 Sequência | 7 dias seguidos de check-in alimentar | 200 |
| 📍 Explorador | Fazer check-in em 3 locais | 100 |
| 🏆 Veterano | Acumular 1.000 XP | 500 |

#### Servidor (Express + Supabase)

- [x] Migration `006_gamification.sql`:
  - `user_levels` (user_id, level, xp, xp_to_next_level)
  - `achievements` (id, name, description, icon_url, category, xp_reward, criteria — JSON)
  - `user_achievements` (user_id, achievement_id, unlocked_at)
- [x] Módulo `gamification/`:
  - `GET /gamification/my` — nível atual + XP + badges conquistadas + progresso das próximas
  - `GET /gamification/:userId` — stats públicos de outro usuário
  - `POST /gamification/event` — registrar evento de XP (chamado internamente por outros módulos)
  - Lógica de nível: a cada N XP sobe de nível, `xp_to_next_level` aumenta
  - Cálculo de streak de alimentação (dias consecutivos com check-in)
 
#### Mobile

- [x] `gamificationSlice.ts` — store Redux com fetch, novo desbloqueio, loading
- [x] `GamificationSection.tsx` — card de nível com barra de XP, grid de badges desbloqueadas, lista "Em andamento" com progresso, lista "Bloqueadas", modal de detalhes por badge com status (completa/andamento/bloqueada), barra de progresso, data de desbloqueio
- [x] `gamification.api.ts` — `getMyStats()` e `getUserStats(userId)`
- [x] `levelColors.ts` — cores por nível (Bronze→Rubi) e por XP (bronze→rubi)
- [x] Perfil público: nível e badges exibidos ao lado do nome; modal de conquistas ao clicar
- [x] ProfileScreen: adicionar `SegmentedTabs` (Posts | Conquistas) abaixo do header
- [x] Feedback visual ao desbloquear badge (modal "Conquista desbloqueada!")

---

### Fase 5 — Qualidade & Confiabilidade

| # | Tarefa |
|---|--------|
| 47 | Testes unitários (Jest) |
| 48 | Error tracking (Sentry) |
| 49 | CI/CD (GitHub Actions) |
| 50 | Analytics |
| 51 | Tratamento de erros consistente |
| 52 | Performance (virtualização, lazy loading) |

---

### Fase 6 — Passeio (Walk Tracking)

**Backend já tem:** CRUD básico (`GET /walks?petId=`, `POST /walks`) no módulo `walks/`. Frontend tem slice (`walksSlices.ts`).

| # | Tarefa | Detalhes |
|---|--------|----------|
| W1 | Tela `WalkScreen` com mapa em tempo real | `expo-map-view` + localização em background (`expo-location`). Botão "Iniciar passeio" → começa a gravar a rota (GPS points a cada N segundos). Botão "Finalizar" → para gravação. |
| W2 | Rota no mapa (polyline overlay) | Durante o passeio, desenhar a linha percorrida no mapa. Ao finalizar, mostrar o traçado completo com zoom ajustado. |
| W3 | Dashboard final do passeio | Ao encerrar: duração, distância total (em km), velocidade média, calorias estimadas, mapa com rota estática. Salvar no Supabase (`walks`) com `route: { lat, lng }[]`, `distance_km`, `duration_min`, `avg_speed`, `calories`. |
| W4 | Calendário de passeios | Igual ao feeding — mini calendário com marcação nos dias que tiveram passeio. Tap no dia → lista dos passeios daquele dia. |
| W5 | Postar passeio (vínculo com feed) | Botão "Compartilhar" no dashboard final → abre criação de post com overlay do mapa da rota sobre a foto (ou como imagem separada). Usar `staticMapUrl` da OpenStreetMap/Mapbox pra gerar a imagem da rota. |
| W6 | Histórico completo | Lista de passeios (FlatList) igual vacinas, com data, distância, duração. Tap → abre detalhes com mapa estático. |
| W7 | Notificações de lembrete | Lembrete agendado: "Hora de passear com o {petName}!" (local push, igual vacinas). |

---

| # | Tarefa | Detalhes |
|---|--------|----------|
| O1 | Refatorar `OnboardingScreen` | Ilustrações/imagens reais (não só texto), animações de transição (fade, slide), indicador de página. |
| O2 | Splash screen personalizada | Logo PetLink + animação inicial no splash. Configurar `expo-splash-screen` com cores do tema (`#5D7052`). |
| O3 | Splash animada (`expo-splash-screen` + Lottie) | Animação Lottie do logo na splash, substituindo tela branca padrão. |
| O4 | Deep Links / Universal Links | assetlinks.json, AASA, intentFilters, redirecionamento de `petlink.app/*` para o app. |
| O5 | Login Social (Google + Facebook) | SDKs nativos, botões na LoginScreen, thunks Redux. |
| O6 | Tratamento de erros global | Tela de erro genérica com botão "Tentar novamente", timeout handling, fallback UI. |
| O7 | Empty states em todas as listas | Listas sem dados mostram ilustração + CTA (ex: "Nenhum passeio ainda", "Cadastre seu primeiro pet"). |
| O8 | Suporte a deep link de notificação | Tap na notificação abre a tela correta (ex: notificação de vacina → VaccineScreen). |

---

## Supabase Schema (PostgreSQL)

### `profiles`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | FK → auth.users |
| name | text NOT NULL | Nome de exibição |
| location | text | Localização |
| avatar_url | text | URL do avatar |
| bio | text | Biografia |
| birth_date | date | Data de nascimento |
| level | integer DEFAULT 1 | Nível do usuário |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `pets`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| owner_id | uuid FK → profiles | Dono do pet |
| name | text NOT NULL | |
| species | text NOT NULL | |
| breed | text | |
| birth_date | date | |
| weight_kg | numeric | |
| photo_url | text | |
| allergies | text | |
| temperament | text | |
| observations | text | |
| is_active | boolean DEFAULT true | |
| weight_history | jsonb DEFAULT '[]' | |
| tags | text[] DEFAULT '{}' | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `groups`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| name | text NOT NULL | Nome do grupo |
| description | text | |
| photo_url | text | |
| species | text | Espécie alvo (ex: Cachorro) |
| is_public | boolean DEFAULT true | Se é público ou privado |
| created_by | uuid FK → profiles | Quem criou |
| member_count | integer DEFAULT 1 | Contagem desnormalizada de membros |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `group_members`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| group_id | uuid FK → groups ON DELETE CASCADE | |
| user_id | uuid FK → auth.users ON DELETE CASCADE | |
| role | text CHECK ('owner','admin','member') | Papel no grupo |
| joined_at | timestamptz | |
| UNIQUE | (group_id, user_id) | |

### `vaccines`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| pet_id | uuid FK → pets | |
| name | text NOT NULL | |
| type | text DEFAULT 'vaccine' | |
| applied_at | date NOT NULL | |
| next_dose_at | date | |
| lab | text | |
| batch | text | |
| vet_name | text | |
| notes | text | |
| notified | boolean DEFAULT false | |
| is_completed | boolean DEFAULT false | |
| doses | jsonb DEFAULT '[]' | Array de doses |
| owner_id | uuid FK → auth.users | |
| created_at | timestamptz | |

### `consultations`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| pet_id | uuid FK → pets | |
| vet_name | text NOT NULL | |
| clinic | text | |
| consulted_at | timestamptz NOT NULL | |
| reason | text NOT NULL | |
| diagnosis | text | |
| exams_requested | text | |
| prescription | text | |
| notes | text | |
| owner_id | uuid FK → auth.users | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `consultation_attachments`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| consultation_id | uuid FK → consultations | |
| url | text NOT NULL | |
| file_name | text | |
| file_type | text | |
| created_at | timestamptz | |

### `feeding_plans`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| pet_id | uuid FK → pets | |
| meal_name | text NOT NULL | |
| meal_time | time NOT NULL | |
| quantity | text | |
| order_index | integer DEFAULT 0 | |
| is_active | boolean DEFAULT true | |
| created_at | timestamptz | |

### `feeding_logs`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| pet_id | uuid FK → pets | |
| meal_plan_id | uuid FK → feeding_plans | |
| meal_name | text NOT NULL | |
| scheduled_time | time NOT NULL | |
| quantity | text | |
| order_index | integer DEFAULT 0 | |
| log_date | date DEFAULT CURRENT_DATE | |
| checked_at | timestamptz | null = não feito |
| created_at | timestamptz | |

### `walks`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| pet_id | uuid FK → pets | |
| owner_id | uuid FK → profiles | |
| started_at | timestamptz NOT NULL | |
| ended_at | timestamptz | |
| distance_m | numeric | |
| duration_s | integer | |
| steps_count | integer | |
| avg_speed_kmh | numeric | |
| route | jsonb | |
| notes | text | |
| created_at | timestamptz | |

### `follows`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| follower_id | uuid PK FK → profiles | Quem segue |
| following_id | uuid PK FK → profiles | Quem é seguido |
| created_at | timestamptz | |

### `notifications`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| user_id | uuid FK → profiles | |
| type | text NOT NULL | |
| title | text NOT NULL | |
| body | text | |
| data | jsonb | |
| read_at | timestamptz | |
| sent_at | timestamptz | |

### `push_tokens`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| user_id | uuid UNIQUE FK → auth.users | |
| token | text NOT NULL | Expo Push Token |
| platform | text CHECK ('ios','android') | |
| created_at | timestamptz | |

### `calendar_events`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| pet_id | uuid FK → pets | |
| owner_id | uuid FK → profiles | |
| title | text NOT NULL | |
| type | text NOT NULL | |
| event_date | timestamptz NOT NULL | |
| notes | text | |
| completed | boolean DEFAULT false | |
| created_at | timestamptz | |

### `user_notification_preferences`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| user_id | uuid PK FK → auth.users | |
| enabled | boolean DEFAULT true | Master toggle |
| alimentacao | boolean DEFAULT true | |
| vacinas | boolean DEFAULT true | |
| social_likes | boolean DEFAULT true | |
| social_follows | boolean DEFAULT true | |
| aniversario | boolean DEFAULT true | |
| updated_at | timestamptz | |

### `achievements`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| key | text UNIQUE NOT NULL | Identificador único |
| name | text NOT NULL | |
| description | text | |
| icon | text DEFAULT 'trophy-outline' | |
| category | text DEFAULT 'milestone' | |
| xp_reward | integer DEFAULT 0 | |
| criteria_type | text NOT NULL | Tipo de gatilho |
| criteria_threshold | integer NOT NULL | Quantidade necessária |
| sort_order | integer DEFAULT 0 | |
| created_at | timestamptz | |

### `user_achievements`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| user_id | uuid PK FK → auth.users | |
| achievement_id | uuid PK FK → achievements | |
| unlocked_at | timestamptz | |

### RLS Policies (groups)
```sql
-- groups
Anyone can view public groups       → SELECT is_public = true OR created_by = auth.uid()
Members can view their groups       → SELECT id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
Users can create groups             → INSERT created_by = auth.uid()
Creator can update their group      → UPDATE created_by = auth.uid()
Creator can delete their group      → DELETE created_by = auth.uid()

-- group_members
Members can view members            → SELECT group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
Users can join public groups        → INSERT user_id = auth.uid() AND group_id IN (SELECT id FROM groups WHERE is_public = true)
Users can leave groups              → DELETE user_id = auth.uid()
```

---

## Variáveis de ambiente

### `server/.env`
```
PORT=3000
API_URL=http://localhost:3000
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/petlink
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
# SUPABASE_JWT_SECRET=    (opcional)
```

### `mobile/.env`
```
EXPO_PUBLIC_API_URL=http://SEU_IP:3000
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

---

### Plano de Alimentação 🍽️

**Funcionalidade:** Plano alimentar do pet com refeições programadas e check diário.

#### Fluxo
1. Tutor cria refeições para o pet (nome, horário, quantidade) — "Refeição 1", "Refeição 2"...
2. Após salvo, a tela vira modo **check diário**: cada refeição tem um checkbox
3. Todo dia o tutor marca as refeições concluídas
4. Quando todas as refeições do dia são marcadas → **animação + modal colorido** de parabéns

#### Servidor (`/pets/:petId/feeding/`)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/plan` | Lista refeições do plano ativo |
| `POST` | `/plan` | Cria/atualiza plano (array de refeições) |
| `DELETE` | `/plan` | Desativa plano (`is_active = false`) + cancela notificações |
| `GET` | `/logs?date=YYYY-MM-DD` | Logs de check do dia |
| `POST` | `/logs/:logId/check` | Marcar refeição como concluída |

#### Banco (Supabase)

**`feeding_plans`**
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| pet_id | uuid FK → pets | |
| meal_name | text | Nome (ex: "Refeição 1") |
| meal_time | time | Horário programado |
| quantity | text | Quantidade (ex: "100g") |
| order_index | int | Ordem das refeições |
| is_active | boolean | Se o plano está ativo |
| created_at | timestamptz | |

**`feeding_logs`**
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| pet_id | uuid FK → pets | |
| meal_plan_id | uuid FK → feeding_plans | |
| meal_name | text | Snapshot do nome |
| scheduled_time | time | Snapshot do horário |
| quantity | text | Snapshot da quantidade |
| order_index | int | Snapshot da ordem |
| log_date | date | Data do check |
| checked_at | timestamptz | null = não feito ainda |
| created_at | timestamptz | |

#### Mobile
- **Tela de criação:** formulário inline para adicionar N refeições com nome, horário e quantidade
- **Tela de check diário:** lista de refeições do dia com botão de check, progresso visual
- **Animação conclusão:** modal colorido com confetes/celebração quando 100% do dia é concluído
- **Fila offline:** `FeedingQueueRepository` (AsyncStorage) — quando offline, `checkMealThunk` e `handleFeedingNotificationAction` salvam ação na fila. Ao reconectar, `App.tsx` chama `processQueue()`. Cada item tem `retries` (max 3); se esgotar as tentativas vira *dead letter* e é descartado.
- **Desativar:** botão "Desativar plano" no modo check → `DELETE /feeding/plan` → `is_active = false` + `cancelFeedingNotifications()`

#### Status
| # | Tarefa | Status |
|---|--------|--------|
| F1 | Migration SQL (feeding_plans + feeding_logs) | ✅ |
| F2 | Módulo `feeding/` server (CRUD plano + check logs) | ✅ |
| F3 | Mobile: FeedingScreen (criação do plano + check diário) | ✅ |
| F4 | Mobile: animação de conclusão (modal colorido) | ✅ |
| F5 | Notificação local de lembrete de refeição | ✅ (local, sem Firebase) |
| F6 | Ação "Já alimentei" na notificação | ✅ |
| F7 | **Fila offline**: quando sem internet, "Já alimentei" (app ou notificação) vai pra fila AsyncStorage. Quando voltar a net, processa em ordem. Cada item tem até 3 tentativas; após 3 falhas é descartado. Notificação diferida guarda a `date` original pra resolver no dia correto. | ✅ |
| F8 | **Desativar plano**: botão "Desativar plano" na tela de check + endpoint `DELETE /:petId/feeding/plan` no server + cancela notificações. | ✅ |

---

## Próximos passos (prioritário)

**✅ Concluídos:**
- **H1 — Dashboard do pet ativo**: card com foto, nome, espécie, peso, próxima vacina
- **H7 — Empty state inteligente**: sem pet → CTA cadastro; pet sem dados → onboarding
- **H2 — Lembretes reais**: endpoint `GET /reminders` consumido na HomeScreen
- **H3 — Quick actions**: Criar post, Registrar peso, Agendar consulta, Alimentação
- **H6 — Birthday notifications + calendário**: notificações 30d/7d/dia do aniversário + evento no calendário com cake icon
- **Banner carrossel**: auto-rotação 4s + dots indicadores + swipe manual
- **Action buttons notificação**: "Já alimentei" feeding + deep links (vacina detail, feeding, perfil público)
- **Deep links**: navigationRef + navegação correta ao tap na notificação
- **Postar consulta**: botão "Postar consulta" no modal de detalhes (com foto) + checkbox "Postar após salvar" no formulário de criação. Abre CreatePostModal pré-preenchido com foto e pet da consulta.
- **Config notificações funcionando**: migration `004_notification_preferences.sql` (tabela `user_notification_preferences`), `GET/PUT /notifications/preferences`, server filtra pushes por preferência (enabled, vacinas, social_likes, social_follows), mobile Settings sincroniza com servidor, toggles: Alimentação, Vacinas, Aniversário (novo), Curtidas/comentários, Seguidores (replace do mock "Posts de amigos").
- **FeedingScoreCalendar**: `GET /pets/:petId/feeding/score?start=&end=` (agregação diária), componente móvel com visão semanal (padrão) e mensal, dias coloridos por completude (verde/laranja/vermelho), integrado na tela de alimentação.
- **H4 — Resumo da semana**: Card na HomeScreen com stats dos últimos 7 dias (refeições, peso, vacinas, consultas). Endpoint `GET /pets/:petId/weekly-summary`.
- **H5 — Feed de atividades**: Timeline cronológica (peso, vacinas, consultas, posts) com paginação. Endpoint `GET /pets/:petId/timeline`. Botão "Atividades" na aba Controle do PetsScreen.
- **H8 — Responsividade**: `useWindowDimensions` reativo substitui `Dimensions.get('window')` estático em toda a base. ProfileGrid adaptável (3 colunas phone / 4 tablets). Quick actions com `flexWrap` em telas estreitas. Imports mortos removidos.
- **Offline HomeCache**: cache de reminders e weekly summary na tabela `sync_meta` do WatermelonDB. API functions salvam no cache após sucesso e retornam cache quando offline. HomeScreen permanece bonita sem internet.

**Pendentes:**

Nenhum — todas as tarefas H1-H8 estão concluídas. ✅

Próximas fases disponíveis: Onboarding, Testes (Jest), Sentry, CI/CD.

---

### Firebase FCM — passo a passo

1. Acessar [console.firebase.google.com](https://console.firebase.google.com) e criar/entrar no projeto
2. Adicionar um **app Android** com package name `com.petlink.app`
3. Baixar o arquivo **`google-services.json`** e colocar em `mobile/google-services.json`
4. No `app.json`, dentro de `plugins`, adicionar:
   ```json
   ["expo-notifications", { "androidMode": "default" }]
   ```
5. Rebuildar o dev client:
   ```bash
   cd mobile && npx expo run:android
   ```
6. Subir a **chave FCM** via EAS (necessário uma vez):
   ```bash
   # Baixar service account key no Firebase:
   #   Firebase Console → Configurações → Contas de serviço → Gerar chave privada
   # Depois:
   npx eas credentials --platform android
   #   → Push Notifications (FCM V1)
   #   → Upload a Google Service Account Key
   #   → Selecionar o JSON baixado
   #   → Assign to app
   ```
7. Após o build, `getExpoPushTokenAsync()` passa a funcionar e o token é registrado automaticamente no servidor via `registerPushTokenOnServer()` em `App.tsx:359`

**Resultado:** push notifications do servidor passam a funcionar (likes, comentários, seguidores, lembretes).

---

### Notificações de Vacinas e Vermífugos

**Regras por tipo:**

| Milestone | Vacina | Vermífugo |
|-----------|--------|-----------|
| Lembrete antecipado | 30 dias antes | — |
| Lembrete próximo | 7 dias antes | 7 dias antes |
| Véspera | 1 dia antes | 1 dia antes |
| Dia da dose | No dia (09:00) | No dia (09:00) |
| Atraso inicial | 3 dias depois | 3 dias depois |
| Atraso recorrente | A cada 7 dias | — |

**Regras de negócio:**
- Notificar para cada dose **não aplicada** (`dose.applied === false`)
- Cancelar todas as notificações quando a dose for marcada como aplicada
- Cancelar quando o registro de vacina/vermífugo for **excluído**
- **Anti-spam:** máximo 1 notificação por dia por vacina (dedup por `vaccineId-targetDate`)
- Agendar todas às **09:00**
- **Backup automático** no AsyncStorage (`petlink.vaccine.plans_backup`) + **restore** automático ao iniciar o app
- **Implementado:** `scheduleVaccineNotifications()`, `cancelVaccineNotifications()`, `cancelAllVaccineNotifications()`, `restoreScheduledNotifications()`

**Integração (já aplicada):**
- `VaccineScreen.tsx` — criar/editar (reschedule), excluir (cancel), toggle dose (reschedule)
- `Calendar.tsx` — toggle dose (reschedule)
- `App.tsx` — restore automático no startup

**Status:** ✅ (implementado)

---

### Melhorias futuras — Vacinas/Vermífugos (⚠️ posterior)

- [x] **Ações nas notificações:** "Marcar como aplicada", "Lembrar amanhã"
  - Usar `Notifications.setNotificationCategoryAsync()` para criar categorias com botões de ação
  - Tratar o tap no listener `addNotificationResponseReceivedListener()`
  - "Marcar como aplicada" → chamar `updateVaccine()` para toggle da dose
  - "Lembrar amanhã" → cancelar notificações da vacina

---

### Onboarding / Tutorial
- Refatorar `OnboardingScreen.tsx` com:
  - Ilustrações/imagens reais em vez de só texto
  - Animações de transição entre passos (fade, slide)
  - Splash screen personalizada com logo + animação inicial
  - Design mais criativo e envolvente (cores, ícones grandes, progresso visual)
  - Botão "Pular" no canto superior
- **Status:** ⏳ (pendente)

---

## Decisões de arquitetura

### O que vai em cada banco

**Supabase (PostgreSQL):** Tudo que é relacional e exige RLS — auth, perfis, pets, saúde, walks, follows, grupos, notificações.

**MongoDB Atlas:** Dados de alto volume com schema flexível — posts (feed social), comments, likes, locations (com `$near` geoespacial), reviews, checkins.

### Padrão de código (qualquer banco)
```
server/src/modules/<nome>/
├── routes.ts          # Router Express
├── controller.ts      # Request/response
├── service.ts         # Regras de negócio
└── repository.ts      # Acesso a dados (supabaseAdmin ou Mongoose)
```

### Migration segura
1. Criar modelo + repositório novo (MongoDB)
2. Rodar script de migração (lê Supabase → escreve MongoDB)
3. Validar
4. Trocar rota oficial
5. Remover tabela do Supabase

---

## Setup FCM / Firebase (Fase 3 — concluído)

### Arquivos alterados

| Arquivo | O que foi feito |
|---------|----------------|
| `mobile/app.json` | Plugin `expo-notifications` trocado de string para `["expo-notifications", { "androidMode": "default" }]` |
| `mobile/google-services.json` | Baixado do Firebase Console e copiado para `mobile/` e `android/app/` |
| `android/build.gradle` | Adicionado `classpath('com.google.gms:google-services:4.4.4')` |
| `android/app/build.gradle` | Adicionado `apply plugin: "com.google.gms.google-services"` + dependências `firebase-bom:34.13.0` e `firebase-analytics` |
| `android/gradle/wrapper/gradle-wrapper.properties` | `distributionUrl` → `gradle-8.13-bin.zip`; `networkTimeout=300000` |
| `android/gradle.properties` | Removido `android.ndkVersion` override (NDK 27 baixado com sucesso na rede rápida) |

### Chave FCM enviada via EAS

```bash
npx eas credentials --platform android
#   → Push Notifications (FCM V1)
#   → Upload a Google Service Account Key
#   → Selecionar o JSON do Firebase (petlink-b90a4-firebase-adminsdk-....json)
#   → Assign to app
```

### Comandos EAS Build

```bash
# Development build (hot reload, debug)
npx eas build --platform android --profile development

# APK preview (standalone, sem dev client)
npx eas build --platform android --profile preview

# Production (AAB para Play Store)
npx eas build --platform android --profile production

# iOS development
npx eas build --platform ios --profile development
```

### Problemas conhecidos

**ADB (Android Debug Bridge):** A porta 5037 padrão está quebrada no sistema (não foi possível diagnosticar a causa). Solução: rodar ADB em porta alternativa:
```bash
export ANDROID_ADB_SERVER_PORT=5040
adb -P 5040 nodaemon server &
npx expo run:android  # precisa do ANDROID_ADB_SERVER_PORT=5040
```

**Gradle:** Versão 8.13 é exigida pelo AGP atual. Já está cacheado em `~/.gradle/wrapper/dists/gradle-8.13-bin/`.

**Toast titles:** Os toasts in-app usavam título genérico "Notificação" / "Aviso". Foram substituídos por títulos contextuais (ex: "Post criado", "Pet", "Perfil") em todos os callers.

### Para rebuildar em outro PC

```bash
# 1. Colocar google-services.json em mobile/
# 2. Rodar:
cd mobile
npx expo run:android
```

Se o ADB estiver quebrado:
```bsh
ANDROID_ADB_SERVER_PORT=5040 adb -P 5040 nodaemon server &
ANDROID_ADB_SERVER_PORT=5040 npx expo run:android
```

### Testar push notifications

1. Buildar e instalar o APK
2. Logar no app (o token é registrado automaticamente)
3. Disparar push de teste:
   ```bash
   curl -X POST https://exp.host/--/api/v2/push/send \
     -H "Content-Type: application/json" \
     -d '{
       "to": "ExponentPushToken[...]",
       "title": "Teste",
       "body": "Push funcionou!"
     }'
   ```
4. Ou usar outra conta para curtir/seguir/comentar — o servidor dispara push automaticamente

---

### Deep Links / Universal Links (compartilhamento funcionar fora do app)

**Problema:** WhatsApp e outros apps não reconhecem `petlink://` como link clicável (só `https://`).

**Solução futura:** Usar um domínio HTTPS gratuito com página de redirecionamento + verificação de app.

**Passo a passo (gratuito com Vercel):**

1. Criar conta em [vercel.com](https://vercel.com) (grátis)
2. Criar um repositório com dois arquivos:

   **`public/index.html`** — página de redirecionamento:
   ```html
   <!DOCTYPE html>
   <html>
   <script>
     const path = window.location.pathname  // /profile/abc
     window.location.href = 'petlink://' + path.slice(1)
     setTimeout(() => {
       window.location.href = 'https://petlink.app'  // fallback se app não instalado
     }, 2000)
   </script>
   </html>
   ```

   **`public/.well-known/apple-app-site-association`** (iOS):
   ```json
   {
     "applinks": {
       "apps": [],
       "details": [{
         "appID": "TEAMID.com.petlink.app",
         "paths": ["*"]
       }]
     }
   }
   ```

   **`public/.well-known/assetlinks.json`** (Android):
   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "com.petlink.app",
       "sha256_cert_fingerprints": ["..."]
     }
   }]
   ```

3. Fazer deploy no Vercel → domínio `petlink.vercel.app`
4. No `shareLink.ts` e `RootNavigator.tsx`, já está configurado com `https://petlink.app` — basta trocar pelo domínio real do Vercel
5. No `app.json`, configurar `intentFilters` para o domínio
6. Buildar APK → links `https://petlink.vercel.app/profile/abc` abrem direto no app

**Status:** ⏳ (futuro)

---

### Login com Google e Facebook — Final

**Status:** ⏳ (deixar por último)

**Contexto:** Backend já tem os endpoints `POST /auth/google` e `POST /auth/facebook` completos (usam `supabase.auth.signInWithIdToken`). Frontend tem as funções `loginWithGoogleIdToken()` e `loginWithFacebookToken()` na API. Falta a integração nativa no app.

| # | Tarefa | Status | Detalhes |
|---|--------|--------|----------|
| 1 | Instalar `@react-native-google-signin/google-signin` | ❌ | SDK nativo do Google |
| 2 | Instalar `react-native-fbsdk-next` | ❌ | SDK nativo do Facebook |
| 3 | Adicionar variáveis de ambiente no `mobile/.env` | ❌ | `EXPO_PUBLIC_GOOGLE_CLIENT_ID` (Web Client ID do Google Cloud Console), `EXPO_PUBLIC_FACEBOOK_APP_ID` |
| 4 | Criar `loginWithGoogleThunk` no `authSlice.ts` | ❌ | Chama SDK → obtém `idToken` → posta em `/auth/google` → salva tokens |
| 5 | Criar `loginWithFacebookThunk` no `authSlice.ts` | ❌ | Chama SDK → obtém `accessToken`/`idToken` → posta em `/auth/facebook` → salva tokens |
| 6 | Adicionar botões "Entrar com Google" e "Entrar com Facebook" no `LoginScreen` | ❌ | Abaixo do formulário de email, antes do biometria |
| 7 | Configurar Supabase Auth → Providers: Google + Facebook | ❌ | No Dashboard do Supabase, habilitar providers e colocar Client ID / Secret |
| 8 | Configurar deep link `/auth/callback` no Supabase e no `app.json` | ❌ | Necessário para o fluxo OAuth de redirect |
| 9 | Testar login social em produção (APK release) | ❌ | Simular só funciona em build standalone |

---

## Princípios

1. **KISS** — cada feature resolve um problema real.
2. **Servidor primeiro** — toda feature nova começa com a rota, depois o app.
3. **Offline first** — app funciona sem internet.
4. **Banco certo para cada dado** — PostgreSQL para relacional + RLS, MongoDB para alto volume e geo.
