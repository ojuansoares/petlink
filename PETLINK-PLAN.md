# PetLink — Plano de Desenvolvimento

## Stack de banco de dados

| Banco | Função | Tabelas/Collections |
|-------|--------|---------------------|
| **Supabase (PostgreSQL)** | Dados estruturados com integridade referencial + RLS | profiles, pets, vaccines, weight_records, consultations, consultations_attachments, medication_reminders, walks, follows, calendar_events, groups, group_members, group_posts, notifications, push_tokens |
| **MongoDB Atlas** | Dados de alto volume, schema flexível, geoespacial | posts, comments, likes, locations (2dsphere), reviews, checkins |

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
│   ├── Location.ts        # índice 2dsphere
│   ├── Review.ts
│   └── Checkin.ts
├── modules/
│   ├── auth/             # Supabase
│   ├── profile/          # Supabase
│   ├── pets/             # Supabase
│   ├── posts/            # MongoDB ✅ (enriquecido c/ Supabase p/ profiles/pets)
│   ├── comments/         # MongoDB ✅
│   ├── likes/            # MongoDB ✅
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
- [x] 6 modelos: Post, Comment, Like, Location (2dsphere), Review, Checkin
- [x] Locations: nearby (`$near`), search, create, checkin, reviews (`/locations`, MongoDB)
- [x] Comments: list, create, delete (`/posts/:postId/comments`, MongoDB)
- [x] Likes: toggle, status (`/posts/:postId/like`, MongoDB)

#### ✅ Concluído (Phase 2)
- [x] Posts: módulo `posts/` reescrito para Mongoose `Post` com enriquecimento de profiles/pets via Supabase
- [x] Script de migração executado: 11 posts migrados do Supabase → MongoDB
- [x] Rotas de posts mantêm mesma interface (`/posts`, `/posts/feed`, `/posts/followed`, etc.)

### Mobile (Expo + React Native)
- [x] Auth: login, registro, Google, Facebook, biometria
- [x] Home, Pets CRUD, vacinas, consultas, peso, calendário
- [x] Feed (recomendados/seguindo), paginação, offline
- [x] Profile, perfil público, seguir/deixar de seguir
- [x] WatermelonDB offline, sincronização
- [x] Navegação completa, tema escuro/claro, onboarding
- [x] NotificationService (expo-notifications + Expo Push)
- [x] LocationService (geolocalização, watch, reverse geocode)
- [x] Password reset com server bridge (`recovery_code`)

### Migrations (Supabase)
- [x] schema.sql — schema original (auth, profiles, pets, vacinas, consultas, etc.)
- [x] `migrations/002_push_tokens.sql` — push_tokens + índices extras
- [ ] Rodar `002_push_tokens.sql` no dashboard do Supabase

---

## Arquivos novos nesta sessão

### Servidor
| Arquivo | Função |
|---------|--------|
| `src/config/mongoose.ts` | Conexão MongoDB Atlas |
| `src/models/Post.ts` | Mongoose Post (com toJSON) |
| `src/models/Comment.ts` | Mongoose Comment |
| `src/models/Like.ts` | Mongoose Like (unique compound postId+userId) |
| `src/models/Location.ts` | Mongoose Location (índice 2dsphere) |
| `src/models/Review.ts` | Mongoose Review (unique locationId+authorId) |
| `src/models/Checkin.ts` | Mongoose Checkin |
| `src/shared/mapId.ts` | Helper _id → id para lean() |
| `src/modules/locations/locations.repository.ts` | Reescrevido p/ MongoDB ($near) |
| `src/modules/comments/` | Módulo novo (routes, controller, service, repository) |
| `src/modules/likes/` | Módulo novo (routes, controller, service, repository) |
| `migrations/002_push_tokens.sql` | Substitui o antigo (remove locations do PG) |

### Mobile
| Arquivo | Função |
|---------|--------|
| `src/services/NotificationService.ts` | Preenchido (expo-notifications) |
| `src/services/LocationService.ts` | Preenchido (geolocalização) |

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

### Fase 2 — MongoDB Atlas ⏳ (em andamento)

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
| 24 | Feed aleatório → `$sample`, feed seguidos → aggregation | ✅ |
| 25 | Script `src/scripts/migrate-posts-to-mongo.ts` | ✅ (11 posts migrados) |
| 26 | Remover tabela `posts` do Supabase (após validar) | ⏳ |

#### 2.5 — Mobile: validar slices
| # | Tarefa | Status |
|---|--------|--------|
| 27 | Validar `locationsSlices.ts` (formato de resposta) | ✅ (resposta mantém lat/lng via cálculo no repositório) |
| 28 | Validar `postsSlice.ts` (API inalterada) | ✅ |
| 29 | Adicionar slice de comments (se quiser estado local) | ⏳ (opcional) |
| 30 | Adicionar slice de likes (se quiser estado local) | ⏳ (opcional) |

---

### Fase 3 — Push Notifications

| # | Tarefa | Status |
|---|--------|--------|
| 31 | `POST /notifications/register-token` | ✅ |
| 32 | Agendador de lembretes (cron) | ❌ |
| 33 | Disparo via Expo Push API | ❌ |
| 34 | Notificações sociais (curtir, comentar, seguir) | ❌ |
| 35 | Configurar FCM no EAS Build | ❌ |

---

### Fase 4 — Social & Engajamento

| # | Tarefa | Status |
|---|--------|--------|
| 36 | Compartilhar perfil/pet (deep link) | ❌ |
| 37 | Badges e conquistas | ❌ |
| 38 | Grupos (UI) | ❌ |

---

### Fase 5 — Qualidade & Confiabilidade

| # | Tarefa |
|---|--------|
| 39 | Testes unitários (Jest) |
| 40 | Error tracking (Sentry) |
| 41 | CI/CD (GitHub Actions) |
| 42 | Analytics |
| 43 | Tratamento de erros consistente |
| 44 | Performance (virtualização, lazy loading) |

---

### Fase 6 — Plus

| # | Tarefa |
|---|--------|
| 45 | Geofence — alerta de área segura |
| 46 | Agenda compartilhada |
| 47 | Modo veterinário |
| 48 | Marketplace (futuro) |

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

## Próximos passos (prioritário)

1. **Testar o servidor** — restartar com `npm run dev` e testar rotas de posts, locations, comments, likes
2. **Testar o mobile** — `npx expo start -c` e validar se feed/locations/comments funcionam
3. **Remover tabela `posts` do Supabase** (opcional, após validar a migração)
4. **Partir para Fase 3** — Push Notifications (cron + Expo Push API + FCM)

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
