import '@supabase/functions-js/edge-runtime'
import { createClient } from '@supabase/supabase-js'
import { type EnvSource, readEnv } from '../_shared/env.ts'
import { createBaseApp, getCorsHeaders, jsonResponse, textResponse } from '../_shared/http.ts'
import { requireAuthenticatedUser } from '../_shared/auth.ts'

type Deps = {
  createClient?: typeof createClient
  env?: EnvSource
}

function parseCode(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const raw = (body as Record<string, unknown>).code
  if (typeof raw !== 'string') return null
  return raw.trim()
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
        .select('token, expires_at')
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

      if (new Date(tokenRow.expires_at) < new Date()) {
        return jsonResponse(
          { error: 'Codul a expirat. Solicită un cod nou.' },
          400,
          corsHeaders,
        )
      }

      if (tokenRow.token !== code) {
        return jsonResponse({ error: 'Codul introdus este incorect.' }, 400, corsHeaders)
      }

      // Delete the token row first (best-effort; account deletion cascades anyway)
      await adminClient
        .from('account_deletion_tokens')
        .delete()
        .eq('user_id', user.id)

      // Permanently delete the auth user (cascades to all user data via FK on delete cascade)
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
