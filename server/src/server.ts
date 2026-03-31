import { env } from './config/env'
import app from './app'

const host = env.HOST
const port = Number(env.PORT)

app.listen(port, host, () => {
  const displayHost = host === '0.0.0.0' ? 'localhost' : host
  console.log(`API http://${displayHost}:${port}`)
  console.log(`Swagger http://${displayHost}:${port}/api-docs`)
  console.log(`Escutando em ${host}:${port}`)
})
