# PetLink — Plano de Desenvolvimento

## Stack de banco de dados

| Banco | Função | Tabelas/Collections |
|-------|--------|---------------------|
| **Supabase (PostgreSQL)** | Dados estruturados com integridade referencial + RLS | profiles, pets, vaccines, weight_records, consultations, consultations_attachments, medication_reminders, feeding_plans, feeding_logs, walks, follows, calendar_events, groups, group_members, group_posts, notifications, push_tokens |
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
| H1 | **Dashboard do pet ativo**: foto, nome, espécie, peso atual, próxima vacina — puxado do Redux (pets + health) | Alta |
| H2 | **Lembretes reais**: buscar do backend (`GET /reminders` ou similar) com base no pet ativo — vacinas vencendo, medicação, consultas | Alta |
| H3 | **Quick actions**: botões de ação rápida — "Criar post", "Iniciar passeio", "Registrar peso", "Agendar consulta" | Alta |
| H4 | **Resumo da semana**: stats do pet ativo — passeios essa semana, passos (se disponível), peso | Média |
| H5 | **Feed de atividades recentes**: últimas curtidas, comentários, seguidores novos — feed de notificações/social resumido | Média |
| H6 | **Banner dinâmico**: dica do dia variável (clima, estação, data comemorativa pet) via backend ou lógica local | Baixa |
| H7 | **Empty state inteligente**: se o usuário não tem pet, mostra CTA pra cadastrar. Se tem mas sem dados, mostra onboarding gentil | Alta |
| H8 | **Responsividade**: adaptar layout para diferentes tamanhos de tela (ScrollView com seções flexíveis, sem hardcoded heights) | Alta |

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

## Backend (Express)

### Novas funcionalidades
- [x] Feed day-grouped + random-within-day: posts ordenados por dia (hoje, ontem, anteontem…), dentro de cada dia ordem aleatória a cada reload. Aplica-se a ambos os feeds: Recomendado e Seguindo.
- [x] Navegação para perfil público via CommentSheet/LikesSheet: requestAnimationFrame após onClose() para evitar race condition nos contadores.

### Migrations (Supabase)
- [x] schema.sql — schema original (auth, profiles, pets, vacinas, consultas, etc.)
- [x] `migrations/002_push_tokens.sql` — push_tokens + índices extras
- [x] Rodar `002_push_tokens.sql` no dashboard do Supabase
- [x] Tabela `posts` removida do Supabase (migrado para MongoDB)

---

## Arquivos alterados nesta sessão

### Servidor
| Arquivo | Mudança |
|---------|---------|
| `src/modules/posts/posts.service.ts` | Adicionado `groupAndShuffleByDay`: agrupa posts por dia e shuffle dentro do dia (Fisher-Yates). Aplicado em getFeed e getFollowed. |
| `src/modules/posts/posts.repository.ts` | Removido `$sample` (random per-request) e `getDailyOffset`. Feed volta a usar sort `createdAt: -1`. |
| `src/modules/posts/posts.controller.ts` | Removido parâmetro `random` da query. |

### Mobile
| Arquivo | Mudança |
|---------|---------|
| `src/components/ui/CommentSheet.tsx` | `handleUserPress` com `requestAnimationFrame` após `onClose()` para evitar race condition na navegação. Keyboard via `addListener` + `marginBottom`. |
| `src/components/ui/LikesSheet.tsx` | `handleUserPress` com `requestAnimationFrame`. `loadingListByPostId` no slice para distinguir loading de empty. |
| `src/screens/PublicProfileScreen.tsx` | RefreshControl adicionado (recarrega perfil, posts, pets, follow status). |
| `src/screens/ProfileFeedScreen.tsx` | Ícones like/comentário `size={26}`, `gap: 16`, `gap: 6` (consistente com FeedPostItem). |
| `src/store/slices/postsSlice.ts` | Removido `random=true` das URLs de feed. |

---

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
| 26 | Remover tabela `posts` do Supabase (após validar) | ⏳ |

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
| 43 | Criar `push.scheduler.ts` | ✅ | Cron diário 08:00 — vacinas vencendo (`notified=false`) + medicações ativas |
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

#### 3.3 — FCM / EAS Build

| # | Tarefa | Status | Detalhes |
|---|--------|--------|----------|
| 51 | Criar conta Firebase + configurar FCM | ❌ | Console Firebase → Cloud Messaging |
| 52 | Baixar `google-services.json` e `GoogleService-Info.plist` | ❌ | Colocar em `mobile/` |
| 53 | Configurar EAS Build para FCM | ❌ | `eas.json` + credentials |
| 54 | Testar push em produção (APK + EAS) | ❌ | Validar recebimento em background/foreground/quiesce |

---

### Fase 4 — Social & Engajamento

| # | Tarefa | Status |
|---|--------|--------|
| 44 | Compartilhar perfil/pet (deep link) | ❌ |
| 45 | Badges e conquistas | ❌ |
| 46 | Grupos (UI) | ❌ |

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

### Fase 6 — Plus

| # | Tarefa |
|---|--------|
| 53 | Geofence — alerta de área segura |
| 54 | Agenda compartilhada |
| 55 | Modo veterinário |
| 56 | Marketplace (futuro) |

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
| `GET` | `/logs?date=YYYY-MM-DD` | Logs de check do dia |
| `POST` | `/logs/check/:logId` | Marcar refeição como concluída |

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

#### Status
| # | Tarefa | Status |
|---|--------|--------|
| F1 | Migration SQL (feeding_plans + feeding_logs) | ✅ |
| F2 | Módulo `feeding/` server (CRUD plano + check logs) | ✅ |
| F3 | Mobile: FeedingScreen (criação do plano + check diário) | ✅ |
| F4 | Mobile: animação de conclusão (modal colorido) | ✅ |
| F5 | Notificação push de lembrete de refeição | ⏳ (pendente) |

---

## Próximos passos (prioritário)

### Fase atual — Fase 3 (FCM / EAS Build)

**Fase 3 — FCM / EAS Build (itens 51 a 54)**
1. Configurar FCM no Firebase Console
2. Baixar google-services.json / GoogleService-Info.plist
3. Configurar EAS Build

**Home Screen (H1 a H8 — adiado)**
4. Voltar depois da Fase 3

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
6. Após o build, `getExpoPushTokenAsync()` passa a funcionar e o token é registrado automaticamente no servidor via `registerPushTokenOnServer()` em `App.tsx:359`

**Resultado:** push notifications do servidor passam a funcionar (lembretes de alimentação, posts, vacinas).

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

## Princípios

1. **KISS** — cada feature resolve um problema real.
2. **Servidor primeiro** — toda feature nova começa com a rota, depois o app.
3. **Offline first** — app funciona sem internet.
4. **Banco certo para cada dado** — PostgreSQL para relacional + RLS, MongoDB para alto volume e geo.
