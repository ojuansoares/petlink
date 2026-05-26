import { env } from './config/env'
import { connectMongo } from './config/mongoose'
import app from './app'
import { startPushScheduler } from './modules/push/push.scheduler'

const host = env.HOST
const port = Number(env.PORT)

async function start() {
  await connectMongo()
  startPushScheduler()

  app.listen(port, host, () => {
    const displayHost = host === '0.0.0.0' ? 'localhost' : host
    console.log(`API http://${displayHost}:${port}`)
    console.log(`Swagger http://${displayHost}:${port}/api-docs`)
    console.log(`Escutando em ${host}:${port}`)
  })
}

start()
