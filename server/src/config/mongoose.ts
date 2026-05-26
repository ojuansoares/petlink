import mongoose from 'mongoose'
import { env } from './env'

export async function connectMongo() {
  try {
    await mongoose.connect(env.MONGODB_URI)
    console.log('[Mongo] Conectado ao MongoDB Atlas')

    // Sincroniza índices (2dsphere, únicos, etc.) com o banco
    await mongoose.syncIndexes()
    console.log('[Mongo] Índices sincronizados')
  } catch (err) {
    console.error('[Mongo] Erro na conexão:', err)
    process.exit(1)
  }
}
