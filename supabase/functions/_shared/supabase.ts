import { createClient, type SupabaseClient } from './deps.ts'
import type { Database } from './database.types.ts'
import { requireEnv } from './env.ts'
import { HttpError } from './http.ts'

export type Db = SupabaseClient<Database>

/** Client acting as the calling user: every query goes through RLS. */
export function userClient(req: Request): Db {
  const authorization = req.headers.get('Authorization')
  if (!authorization) throw new HttpError(401, 'unauthorized', 'Accesso richiesto')
  return createClient<Database>(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Service-role client: bypasses RLS. Use only for server-owned tables (e.g. ai_usage). */
export function adminClient(): Db {
  return createClient<Database>(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function requireUserId(db: Db): Promise<string> {
  const { data, error } = await db.auth.getUser()
  if (error || !data.user) throw new HttpError(401, 'unauthorized', 'Sessione scaduta, accedi di nuovo')
  return data.user.id
}
