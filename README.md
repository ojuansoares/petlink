<div align="center">

<img src="mobile/src/assets/icon.png" alt="PetLink Logo" width="96" />

# PetLink

**Gestão de saúde animal e rede social para tutores de pets**

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
| **Social** | Feed com posts e check-ins, seguir tutores, curtidas e comentários, grupos por raça ou região |
| **Mapa** | Locais pet-friendly com avaliações, busca por categoria, geofencing para eventos próximos |
| **App** | Dark mode automático via sensor de luz, modo offline com sincronização, backup no Google Drive, login com biometria |

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
│       │   └── slices/  # auth, pets, posts, locations, walks, ui
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
posts      → feed social (fotos, check-ins, dicas)
comments   → comentários nos posts
likes      → curtidas
locations  → locais pet-friendly com índice geoespacial 2dsphere
reviews    → avaliações de locais
checkins   → check-ins em locais
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
