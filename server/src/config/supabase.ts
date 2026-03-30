import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'

const serverOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
} as const

/** Service role: admin (createUser), Postgres no BFF (ignora RLS). */
export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  serverOptions
)

/** Anon: login por senha e refresh de sessão no servidor. */
export const supabaseAuth: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  serverOptions
)
