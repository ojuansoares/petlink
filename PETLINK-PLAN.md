# PetLink — Plano de Desenvolvimento

## Status atual

Tudo que está abaixo já está **construído e funcional** no app + servidor:

### Backend (Express + Supabase)
- [x] Auth: registro, login, Google, Facebook, refresh, logout
- [x] Profile: GET/PUT/DELETE próprio, GET público
- [x] Pets: CRUD completo + listagem
- [x] Posts: CRUD, feed (recomendados/seguindo), pin/unpin
- [x] Follows: seguir/deixar de seguir, checar, listar seguidores/seguindo
- [x] Upload: imagens via Cloudinary

### Mobile (Expo + React Native)
- [x] Auth: login, registro, Google, Facebook, biometria
- [x] Password reset (via server bridge com recovery_code)
- [x] Home screen
- [x] Pets: CRUD, vacinas (multi-dose), consultas, peso, calendário
- [x] Feed: recomendados/seguindo, paginação, pull-to-refresh, offline
- [x] Profile: editar avatar, stats, grid de posts, criar post
- [x] Perfil público: seguir/deixar de seguir, pets públicos
- [x] Offline DB: WatermelonDB com schema, migrations, repositórios
- [x] Sincronização: syncPets da API
- [x] Navegação completa (Root, Auth, Tabs)
- [x] Tema escuro/claro automático
- [x] Onboarding

---

## Fases

### Fase 1 — Fundação (urgente)

O que já deveria estar funcionando mas tem buraco.

| # | Tarefa | Por quê |
|---|--------|---------|
| 1 | **Criar servidor de notificações** (`/notifications`) | O app já tem o slice Redux, mas a rota não existe → 404 |
| 2 | **Criar servidor de localizações** (`/locations`) | O app tem `locationsSlices.ts` mas sem backend |
| 3 | **Criar servidor de walks** (`/walks`) | O app tem `walksSlices.ts` mas sem backend |
| 4 | **Implementar `NotificationService.ts`** (mobile) | Arquivo vazio — precisa de expo-notifications + Expo Push |
| 5 | **Implementar `LocationService.ts`** (mobile) | Arquivo vazio — geolocalização + geofence |
| 6 | **Preencher `src/api/api.ts`** (barrel file vazio) | Sem ele imports estão quebrados ou faltando |

---

### Fase 2 — Push Notifications (prioridade média)

Notificar o usuário sem ele precisar ficar abrindo o app.

| # | Tarefa | Detalhes |
|---|--------|----------|
| 7 | **expo-notifications no mobile** | Pedir permissão, obter `ExponentPushToken`, enviar pro servidor |
| 8 | **Endpoint `POST /notifications/register-token`** | Servidor salva o push token do usuário |
| 9 | **Agendador de lembretes (servidor)** | Cron que checa vacinas vencendo, vermífugos, consultas próximas |
| 10 | **Disparo via Expo Push API** | Servidor chama `https://exp.host/--/api/v2/push/send` |
| 11 | **Notificações sociais** | Alguém seguiu, curtiu, comentou (quando tiver comentários) |
| 12 | **Configurar FCM no EAS** | Único pré-requisito pro APK buildado receber push |

---

### Fase 3 — Social & Engajamento

O app já tem follow e feed, mas faltam peças.

| # | Tarefa | Detalhes |
|---|--------|----------|
| 13 | **Comentários em posts** | CRUD de comentários (servidor + mobile) |
| 14 | **Curtir posts** | Like/unlike com contagem |
| 15 | **Notificar interações** | Seguir, curtir, comentar disparam push |
| 16 | **Compartilhar perfil/pet** | Deep link público `petlink://profile/:id` |
| 17 | **Badges e conquistas** | Já existe estrutura no servidor, conectar no perfil |

---

### Fase 4 — Qualidade & Confiabilidade

Sem isso o app sempre vai parecer "quebrado" em produção.

| # | Tarefa | Detalhes |
|---|--------|----------|
| 18 | **Testes** | Testes de API (servidor) + testes de integração no mobile |
| 19 | **Error tracking** | Sentry ou similar no app + servidor |
| 20 | **CI/CD** | GitHub Actions: lint, typecheck, testes no PR |
| 21 | **Analytics** | Eventos básicos (login, registro, criou pet, etc.) |
| 22 | **Tratamento de erros consistente** | Toast + fallback offline em todas as telas |
| 23 | **Performance** | Virtualização de listas, lazy loading de imagens |

---

### Fase 5 — Plus (quando o básico estiver sólido)

| # | Tarefa | Detalhes |
|---|--------|----------|
| 24 | **Walks — passeios com pet** | GPS tracking, histórico, distância, duração |
| 25 | **Geofence — alerta de área** | Notificar se o pet saiu de uma área segura |
| 26 | **Agenda compartilhada** | Vacinas, consultas, medicação num calendário unificado |
| 27 | **Modo veterinário** | Perfil especial para clínicas com acesso a histórico |
| 28 | **Marketplace** | (bem futuro) Conexão com serviços pet |

---

## Princípios

1. **KISS** — cada feature resolve um problema real. Se não for usar, não faz.
2. **Testar no APK** — Expo Go é só pra desenvolvimento rápido. O que importa é o APK buildado.
3. **Servidor primeiro** — toda feature nova começa com a rota, depois o app. Nunca o contrário.
4. **Offline first** — o app precisa funcionar sem internet. O sync é assíncrono.
5. **Notificações são a prioridade real** — é o que faz o usuário voltar. Sem notificação, o app morre.
