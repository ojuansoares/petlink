import express from 'express'
import swaggerUi from 'swagger-ui-express'
import authRoutes from './modules/auth/auth.routes'
import profileRoutes from './modules/profile/profile.routes'
import petsRoutes from './modules/pets/pets.routes'
import uploadsRoutes from './modules/uploads/uploads.routes'
import postsRoutes from './modules/posts/posts.routes'
import followsRoutes from './modules/follows/follows.routes'
import notificationsRoutes from './modules/notifications/notifications.routes'
import locationsRoutes from './modules/locations/locations.routes'
import walksRoutes from './modules/walks/walks.routes'
import commentsRoutes from './modules/comments/comments.routes'
import likesRoutes from './modules/likes/likes.routes'
import { swaggerSpec } from './config/swagger'

const app = express()
app.use(express.json())

app.use((req, res, next) => {
  const startedAt = Date.now()

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`
    )
  })

  next()
})

app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() })
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.use('/auth', authRoutes)
app.use('/profile', profileRoutes)
app.use('/pets', petsRoutes)
app.use('/uploads', uploadsRoutes)
app.use('/posts', postsRoutes)
app.use('/follows', followsRoutes)
app.use('/notifications', notificationsRoutes)
app.use('/locations', locationsRoutes)
app.use('/walks', walksRoutes)
app.use('/posts', commentsRoutes)
app.use('/posts', likesRoutes)

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERRO GLOBAL SEVIDOR]:', err)
  res.status(err.statusCode ?? 500).json({ 
    error: err.message || 'Erro interno inesperado', 
    code: err.code 
  })
})

export default app
