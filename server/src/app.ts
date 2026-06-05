import express from 'express'
import swaggerUi from 'swagger-ui-express'
import * as Sentry from '@sentry/node'
import { AppError } from './shared/AppError'
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
import commentLikesRoutes from './modules/commentLikes/commentLikes.routes'
import likesRoutes from './modules/likes/likes.routes'
import feedingRoutes from './modules/feeding/feeding.routes'
import consultationsRoutes from './modules/consultations/consultations.routes'
import remindersRoutes from './modules/reminders/reminders.routes'
import groupsRoutes from './modules/groups/groups.routes'
import gamificationRoutes from './modules/gamification/gamification.routes'
import vaccinationCardRoutes from './modules/vaccinationCard/vaccinationCard.routes'
import placesRoutes from './modules/places/places.routes'
import { swaggerSpec } from './config/swagger'

const app = express()
app.use(express.json())

// Sentry request handler middleware
Sentry.setupExpressErrorHandler(app)

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
app.use('/posts', commentLikesRoutes)
app.use('/posts', likesRoutes)
app.use('/pets', feedingRoutes)
app.use('/consultations', consultationsRoutes)
app.use('/reminders', remindersRoutes)
app.use('/groups', groupsRoutes)
app.use('/gamification', gamificationRoutes)
app.use('/pets', vaccinationCardRoutes)
app.use('/places', placesRoutes)

app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof AppError) {
    console.error(`[${req.method} ${req.path}] AppError ${err.statusCode}: ${err.message}`)
    res.status(err.statusCode).json({ error: err.message, code: err.code })
    return
  }

  Sentry.captureException(err)
  console.error(`[${req.method} ${req.path}] ERRO INESPERADO:`, err)
  res.status(500).json({ error: 'Erro interno inesperado' })
})

export default app
