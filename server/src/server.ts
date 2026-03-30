import { env } from './config/env'
import app from './app'

const port = Number(env.PORT)

app.listen(port, () => {
  console.log(`API http://localhost:${port}`)
  console.log(`Swagger http://localhost:${port}/api-docs`)
})
