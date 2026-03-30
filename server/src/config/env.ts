import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  /** Necessária para signInWithPassword / refreshSession no BFF. */
  SUPABASE_ANON_KEY: z.string().min(1),
  /** Opcional: validação local de JWT (middleware usa getUser no Supabase). */
  SUPABASE_JWT_SECRET: z.string().optional(),
  PORT: z.string().default('3000'),
})

export const env = envSchema.parse(process.env)
