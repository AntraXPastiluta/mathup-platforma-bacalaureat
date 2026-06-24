import '@supabase/functions-js/edge-runtime'
import { timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { type EnvSource, readEnv } from '../_shared/env.ts'
import { createBaseApp, getCorsHeaders, jsonResponse, textResponse } from '../_shared/http.ts'
import { requireAuthenticatedUser } from '../_shared/auth.ts'
import { hashDeletionToken } from '../_shared/deletionToken.ts'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

type Deps = {
  createClient?: typeof createClient
  env?: EnvSource
}

type TokenRow = {
  token: string
  expires_at: string
  failed_attempts: number
  locked_until: string | null
}

function parseCode(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const raw = (body as Record<string, unknown>).code
  if (typeof raw !== 'string') return null
  return raw.trim()
}

/** Constant-time compare for OTP strings of equal length. */
export function tokensEqual(expected: string, provided: string): boolean {
  const enc = new TextEncoder()
  const a = enc.encode(expected)
  const b = enc.encode(provided)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function createConfirmAccountDeletionApp(deps: Deps = {}) {
  const createSupabaseClient = deps.createClient ?? createClient
  const env = deps.env
  const app = createBaseApp()

  app.options('*', (c) => textResponse('ok', 200, getCorsHeaders(c)))

  app.post('*', async (c) => {
    try {
      const corsHeaders = getCorsHeaders(c)
      const supabaseUrl = readEnv('SUPABASE_URL', env)
      const supabaseAnonKey = readEnv('SUPABASE_ANON_KEY', env)
      const serviceRoleKey = readEnv('SERVICE_ROLE_KEY', env) ?? readEnv('SUPABASE_SERVICE_ROLE_KEY', env)

      if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
        throw new Error('Missing Supabase environment configuration.')
      }

      const authResult = await requireAuthenticatedUser({
        req: c.req.raw,
        corsHeaders,
        supabaseUrl,
        supabaseAnonKey,
        createClient: createSupabaseClient,
      })

      if (authResult instanceof Response) return authResult
      const { user } = authResult

      const body = await c.req.json().catch(() => ({}))
      const code = parseCode(body)

      if (!code) {
        return jsonResponse({ error: 'Codul de confirmare lipsește.' }, 400, corsHeaders)
      }

      const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {})

      const { data: tokenRow, error: fetchError } = await adminClient
        .from('account_deletion_tokens')
        .select('token, expires_at, failed_attempts, locked_until')
        .eq('user_id', user.id)
        .maybeSingle()

      if (fetchError) {
        console.error('[confirm-account-deletion] fetch token failed:', fetchError)
        throw fetchError
      }

      if (!tokenRow) {
        return jsonResponse(
          { error: 'Nu există un cod de confirmare activ. Solicită un cod nou.' },
          400,
          corsHeaders,
        )
      }

      const row = tokenRow as TokenRow

      if (row.locked_until && new Date(row.locked_until) > new Date()) {
        return jsonResponse(
          { error: 'Prea multe încercări greșite. Solicită un cod nou peste câteva minute.' },
          429,
          corsHeaders,
        )
      }

      if (new Date(row.expires_at) < new Date()) {
        return jsonResponse(
          { error: 'Codul a expirat. Solicită un cod nou.' },
          400,
          corsHeaders,
        )
      }

      // `row.token` este hash-ul stocat; comparăm cu hash-ul codului introdus (timp constant).
      const providedHash = await hashDeletionToken(code, user.id)
      if (!tokensEqual(row.token, providedHash)) {
        const nextAttempts = (row.failed_attempts ?? 0) + 1
        const lockoutUpdate: Record<string, unknown> = { failed_attempts: nextAttempts }

        if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
          lockoutUpdate.locked_until = new Date(
            Date.now() + LOCKOUT_MINUTES * 60 * 1000,
          ).toISOString()
        }

        await adminClient
          .from('account_deletion_tokens')
          .update(lockoutUpdate)
          .eq('user_id', user.id)

        if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
          return jsonResponse(
            { error: 'Prea multe încercări greșite. Solicită un cod nou peste câteva minute.' },
            429,
            corsHeaders,
          )
        }

        return jsonResponse({ error: 'Codul introdus este incorect.' }, 400, corsHeaders)
      }

      await adminClient
        .from('account_deletion_tokens')
        .delete()
        .eq('user_id', user.id)

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)

      if (deleteError) {
        console.error('[confirm-account-deletion] deleteUser failed:', deleteError)
        throw deleteError
      }

      return jsonResponse({ deleted: true }, 200, corsHeaders)
    } catch (error) {
      console.error('[confirm-account-deletion]', error)
      return jsonResponse(
        { error: 'Nu am putut șterge contul. Încearcă din nou sau contactează suportul.' },
        500,
        getCorsHeaders(c),
      )
    }
  })

  app.all('*', (c) => jsonResponse({ error: 'Method not allowed.' }, 405, getCorsHeaders(c)))

  return app
}

export const app = createConfirmAccountDeletionApp()
if (import.meta.main) {
  Deno.serve(app.fetch)
}
