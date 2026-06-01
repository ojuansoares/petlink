import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'
import { env } from './env'

let firebaseApp: admin.app.App | null = null

export function getFirebaseApp(): admin.app.App {
  if (firebaseApp) return firebaseApp

  if (!env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH não configurado')
  }

  const resolvedPath = path.resolve(env.FIREBASE_SERVICE_ACCOUNT_PATH)

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Arquivo de service account não encontrado: ${resolvedPath}`)
  }

  const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'))

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })

  console.log('[Firebase] Admin SDK inicializado com certificado')

  return firebaseApp
}

export function isFirebaseEnabled(): boolean {
  if (!env.FIREBASE_SERVICE_ACCOUNT_PATH) return false
  try {
    return fs.existsSync(path.resolve(env.FIREBASE_SERVICE_ACCOUNT_PATH))
  } catch {
    return false
  }
}
