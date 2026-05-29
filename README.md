<div align="center">

<img src="mobile/src/assets/icon.png" alt="PetLink Logo" width="48" style="vertical-align: middle; margin-right: 12px" /> <span style="font-size: 2em; font-weight: 800;">PetLink</span>

**Gestão de saúde animal e rede social para tutores de pets**

<img src="https://github.com/user-attachments/assets/2249db09-db89-49b2-98dd-2617bf27188f" width="200" alt="PetLink Screenshot 1" /> <img src="https://github.com/user-attachments/assets/7edddeb3-355a-4e46-8274-eb5e91970cb1" width="200" alt="PetLink Screenshot 2" /> <img src="https://github.com/user-attachments/assets/bc0147a5-ba92-40e2-85eb-2e8153ca6bc8" width="200" alt="PetLink Screenshot 3" />

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![React Native](https://img.shields.io/badge/React_Native-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://reactnative.dev/) [![Expo](https://img.shields.io/badge/Expo-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev/) [![Redux](https://img.shields.io/badge/Redux_Toolkit-764ABC?style=flat-square&logo=redux&logoColor=white)](https://redux-toolkit.js.org/) [![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/) [![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/) [![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/) [![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/) [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/) [![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=flat-square&logo=cloudinary&logoColor=white)](https://cloudinary.com/) [![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/) [![Axios](https://img.shields.io/badge/Axios-5A29E4?style=flat-square&logo=axios&logoColor=white)](https://axios-http.com/)

</div>

---

## Sobre o projeto

PetLink é um aplicativo mobile completo para tutores de animais de estimação. Combina ferramentas de gestão de saúde — vacinas, consultas, medicação, peso — com funcionalidades de rede social, monitoramento de passeios via GPS e mapa de locais pet-friendly.

Desenvolvido como projeto acadêmico de conclusão de semestre, aplicando uma stack moderna full-stack com foco em boas práticas de arquitetura.

---

## Funcionalidades

| Área | Funcionalidades |
|---|---|
| **Perfil & Pets** | Cadastro de tutor, múltiplos pets por conta, galeria de fotos |
| **Saúde** | Vacinas e vermífugos com alertas de dose, histórico de peso com gráfico, consultas veterinárias com anexos, lembretes de medicação |
| **Atividade** | Monitoramento de passeios com GPS em background, contagem de passos via acelerômetro, estatísticas semanais |
| **Social** | Feed com posts e check-ins, seguir tutores, curtidas e comentários (com edição, pin, perfil enrich), grupos por raça ou região |
| **Mapa** | Locais pet-friendly com avaliações, busca por categoria, geofencing para eventos próximos |
| **App** | Dark mode automático via sensor de luz, modo offline com sincronização, backup no Google Drive, login com biometria, ConfirmModal customizado |

---

## Arquitetura

```
petlink/
├── mobile/          # React Native (Expo)
│   └── src/
│       ├── api/         # Axios + interceptors JWT
│       ├── components/  # UI (Button, Card, Input, Avatar...)
│       ├── database/    # WatermelonDB — offline/sync
│       ├── hooks/       # useTheme, useAuth...
│       ├── navigation/  # RootNavigator, AppTabs, AuthStack
│       ├── screens/     # Home, Pets, Feed, Profile...
│       ├── services/    # Biometria, GPS, sensores, notificações
│       ├── store/       # Redux Toolkit
│       │   └── slices/  # auth, pets, posts, locations, walks, ui, comments, likes, commentLikes
│       └── theme/       # Tokens de design (light/dark)
│
└── server/          # Node.js + Express (BFF)
    └── src/
        ├── config/      # Supabase, Mongoose, Cloudinary
        ├── middlewares/ # Auth JWT, upload, error handler
        ├── modules/     # auth, pets, posts, walks, locations...
        │   └── [módulo]/
        │       ├── controller
        │       ├── service
        │       ├── repository
        │       └── routes
        ├── models/      # Mongoose schemas (MongoDB)
        └── shared/      # AppError, response helpers
```

**Fluxo de dados:**
```
App (Redux) → Axios (JWT) → Node.js BFF → Supabase (PostgreSQL)
                                        → MongoDB Atlas (feed/locais)
                                        → Cloudinary (imagens)
```

---

## Banco de dados

### PostgreSQL via Supabase

Dados estruturados com integridade referencial, Row Level Security (RLS) ativado em todas as tabelas.

```
profiles          → perfil público do tutor (estende auth.users)
pets              → cadastro de pets (N por tutor)
vaccines          → vacinas e vermífugos por pet
weight_records    → histórico de peso por pet
consultations     → consultas veterinárias
  consultation_attachments → anexos (receitas, exames)
medication_reminders → lembretes de medicação
walks             → passeios com rota GPS (jsonb)
follows           → relação N:N entre tutores
calendar_events   → eventos de saúde (banho, retorno)
groups            → grupos por raça ou região
  group_members   → membros dos grupos
  group_posts     → posts nos grupos
notifications     → log de notificações enviadas
```

**Views prontas:**
- `upcoming_vaccines` — vacinas vencendo nos próximos 30 dias
- `walk_stats_weekly` — estatísticas de passeios por semana
- `pet_dashboard` — resumo completo do pet para o dashboard

### MongoDB Atlas

Dados de alto volume e schema flexível.

```
posts         → feed social (fotos, check-ins, dicas)
comments      → comentários nos posts (com isPinned, likesCount)
likes         → curtidas nos posts
comment_likes → curtidas em comentários
locations     → locais pet-friendly com índice geoespacial 2dsphere
reviews       → avaliações de locais
checkins      → check-ins em locais
```

### Arquitetura do banco

```mermaid
erDiagram
  profiles ||--o{ pets : "owns"
  profiles ||--o{ walks : "logs"
  profiles ||--o{ notifications : "receives"
  profiles ||--o{ follows : "follows"
  pets ||--o{ vaccines : "has"
  pets ||--o{ weight_records : "tracks"
  pets ||--o{ consultations : "has"
  pets ||--o{ medication_reminders : "has"
  pets ||--o{ walks : "in"
  pets ||--o{ calendar_events : "for"
  consultations ||--o{ consultation_attachments : "has"
  groups ||--o{ group_members : "has"
  groups ||--o{ group_posts : "contains"
```


---

## Stack técnica

### Mobile
- **React Native** com Expo SDK 55
- **TypeScript** em todo o projeto
- **Redux Toolkit** — gerenciamento de estado global
- **WatermelonDB** — persistência offline e sincronização
- **NativeWind** — design system baseado em Tailwind
- **React Navigation** — stack + bottom tabs
- **expo-blur / expo-linear-gradient** — efeitos visuais
- **react-native-reanimated** — animações fluidas

### Backend
- **Node.js + Express** — API RESTful (BFF)
- **Supabase** — PostgreSQL + Auth (JWT + refresh token)
- **MongoDB Atlas + Mongoose** — dados do feed e locais
- **Cloudinary** — armazenamento de imagens
- **Firebase Cloud Messaging** — push notifications remotas
- **Zod** — validação de variáveis de ambiente

---

## Entregas e Requisitos

### 🎯 Sprint 1: Onboarding, Perfil e Pets

#### Requisitos Funcionais (RF)

| Código | Requisito |
|---|---|
| RF30 | Onboarding interativo com telas iniciais e guia para o primeiro cadastro. |
| RF01 | Cadastro de tutor com perfil (nome, e-mail, senha e localização) no PostgreSQL (Supabase). |
| RF03 | Login com biometria após o primeiro login bem-sucedido. |
| RF02 | Cadastro do primeiro pet com nome, espécie, raça, data de nascimento, peso, foto e observações. |
| RF27 | Suporte a múltiplos pets por tutor desde o início. |
| RF04 | Dashboard base do pet selecionado com alternância entre pets. |
| RF29 | Modo offline para visualização básica dos dados do pet via WatermelonDB. |

#### Requisitos Não Funcionais (RNF)

| Código | Requisito |
|---|---|
| RNF01 e RNF02 | Setup React Native + TypeScript, API Node.js/Express (Auth e Pets) e PostgreSQL (Supabase). |
| JWT/Refresh | Backend com accessToken e refreshToken; frontend com Redux Persist + SecureStore para renovação automática. |
| RNF06 | Persistência local com WatermelonDB para suportar modo offline. |
| RNF04 | Upload de imagens via Cloudinary, armazenando apenas URL no banco. |
| RNF01 | Estado global com authSlice e petSlice no Redux Toolkit. |
| RNF10 | Versionamento no GitHub e EAS Build para APK de teste com suporte às libs nativas. |


### 🎨 Sprint 2: Saúde, Gráficos e Rede Social

#### Requisitos Funcionais (RF)

| Código | Requisito |
|---|---|
| RF05 | Cadastro de vacinas e vermífugos. |
| RF08 | Registro de consultas veterinárias. |
| RF17 | Lembretes de medicação com notificações. |
| RF06 | Calendário de saúde integrado aos eventos. |
| RF07 | Histórico de peso com visualização em gráficos. |
| RF11 | Feed social com postagens dos tutores seguidos. |
| RF12 | Postagem de fotos do pet com legenda e local. |
| RF13 | Sistema de seguir/deixar de seguir (N:N). |
| RF18 | Galeria de fotos do pet. |
| RF23 | Modo escuro automático com sensor de luz. |
| RF25 | Grupos de raça ou região. |

#### Requisitos Não Funcionais (RNF)

| Código | Requisito |
|---|---|
| RNF01 | Novos slices Redux para posts e saúde. |
| RNF02 | MongoDB Atlas para feed, posts e comentários. |
| RNF04 | Upload de imagens via API para Cloudinary (armazenando URL). |
| RNF07 | Otimização do feed com FlatList, paginação e cache de imagens. |


### 📍 Sprint 3: GPS, Sensores e Finalização

#### Requisitos Funcionais (RF)

| Código | Requisito |
|---|---|
| RF14 | Monitoramento de passeios com GPS em background. |
| RF15 | Estatísticas de passeios (distância, tempo médio e rotas frequentes). |
| RF22 | Notificações de eventos próximos com geofencing. |
| RF16 | Contagem de passos com acelerômetro. |
| RF09 | Mapa de locais pet-friendly. |
| RF20 | Busca de locais por categoria, avaliação e distância. |
| RF21 | Avaliação de locais com estrelas e dicas. |
| RF10 | Check-in em locais com compartilhamento no feed. |
| RF19 | Geração e compartilhamento de carteirinha de vacinação em PDF. |
| RF24 | Exportação do histórico de saúde em JSON/CSV. |
| RF26 | Alertas de temperatura com API de clima. |
| RF28 | Backup em nuvem no Google Drive. |

#### Requisitos Não Funcionais (RNF)

| Código | Requisito |
|---|---|
| RNF03 | Geolocalização e monitoramento em background com bibliotecas especializadas. |
| RNF09 | Testes unitários (Jest) para regras críticas. |
| RNF10 | CI/CD com GitHub Actions e monitoramento de erros com Sentry. |


---

## Instalação

### Pré-requisitos

- Node.js 18+
- Expo Go instalado no celular (iOS / Android)
- Conta no [Supabase](https://supabase.com) (gratuito)
- Conta no [MongoDB Atlas](https://www.mongodb.com/atlas) (gratuito)

### 1. Clone o repositório

```bash
git clone https://github.com/ojuansoares/petlink.git
cd petlink
```

### 2. Configure o backend

```bash
cd server
npm install
```

Crie o arquivo `.env`:

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
SUPABASE_JWT_SECRET=seu_jwt_secret
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/petlink
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
PORT=3000
```

Execute o schema no Supabase — abra o SQL Editor do seu projeto e cole o conteúdo de `server/schema.sql`.

Inicie o servidor:

```bash
npm run dev
```

### 3. Configure o mobile

```bash
cd mobile
npm install
```

Crie o arquivo `.env`:

```env
EXPO_PUBLIC_API_URL=http://SEU_IP_LOCAL:3000
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
```

Descubra seu IP local:

```bash
# Windows
ipconfig

# Mac/Linux
ifconfig
```

Inicie o app:

```bash
npx expo start -c
```

Escaneie o QR Code com o Expo Go no celular. O celular e o computador precisam estar na mesma rede Wi-Fi.

### 4. Configure o Supabase

No painel do Supabase → **Authentication → URL Configuration**:

- **Site URL:** `exp://SEU_IP:8081`
- **Redirect URLs:**
  ```
  exp://SEU_IP:8081
  exp://SEU_IP:8081/--/auth/callback
  petlink://auth/callback
  ```

---

## Variáveis de ambiente

| Variável | Onde usar | Descrição |
|---|---|---|
| `SUPABASE_URL` | server | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Chave de admin (nunca expor no app) |
| `SUPABASE_JWT_SECRET` | server | Secret para verificar tokens |
| `MONGODB_URI` | server | Connection string do MongoDB Atlas |
| `EXPO_PUBLIC_API_URL` | mobile | URL do backend Node.js |
| `EXPO_PUBLIC_SUPABASE_URL` | mobile | URL pública do Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | mobile | Chave anon pública do Supabase |

---

<div align="center">

Feito por [Juan Soares](https://github.com/ojuansoares) · FATEC · 2026

</div>
