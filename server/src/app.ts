import express from 'express'
import swaggerUi from 'swagger-ui-express'
import authRoutes from './modules/auth/auth.routes'
import profileRoutes from './modules/profile/profile.routes'
import petsRoutes from './modules/pets/pets.routes'
import uploadsRoutes from './modules/uploads/uploads.routes'
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

export default app
