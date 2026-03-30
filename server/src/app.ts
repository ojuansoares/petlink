import express from 'express'
import swaggerUi from 'swagger-ui-express'
import authRoutes from './modules/auth/auth.routes'
import { swaggerSpec } from './config/swagger'

const app = express()
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() })
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.use('/auth', authRoutes)
// app.use('/pets', petsRoutes)

export default app
