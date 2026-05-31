import '@supabase/functions-js/edge-runtime'
import { createClient } from '@supabase/supabase-js'
import { type EnvSource, readEnv } from '../_shared/env.ts'
import { requireAuthenticatedUser } from '../_shared/auth.ts'
import {
  buildUserDataExport,
  EXPORT_RATE_LIMIT_COUNT,
  EXPORT_RATE_LIMIT_WINDOW_MS,
  countRecentExportRequests,
  logExportRequest,
  reserveGdprExportSlot,
} from '../_shared/gdprExport.ts'
import { createBaseApp, getCorsHeaders, jsonResponse, textResponse } from '../_shared/http.ts'

type ExportDeps = {
  createClient?: typeof createClient
  env?: EnvSource
}

export function createExportUserDataApp(deps: ExportDeps = {}) {
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
        unauthorizedMessage: 'Trebuie să fii autentificat pentru a exporta datele.',
      })

      if (authResult instanceof Response) return authResult
      const { user } = authResult

      const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {})
      const windowStart = new Date(Date.now() - EXPORT_RATE_LIMIT_WINDOW_MS).toISOString()

      let reserved = false
      try {
        reserved = await reserveGdprExportSlot(adminClient, user.id)
      } catch (reserveError) {
        console.warn('[export-user-data] reserve_gdpr_export_slot unavailable, using count fallback', reserveError)
        const recentCount = await countRecentExportRequests(adminClient, user.id, windowStart)
        if (recentCount >= EXPORT_RATE_LIMIT_COUNT) {
          return jsonResponse(
            {
              error:
                'Ai atins limita de 3 exporturi în ultimele 24 de ore. Încearcă din nou mâine sau contactează DPO.',
            },
            429,
            corsHeaders,
          )
        }
        await logExportRequest(adminClient, user.id)
        reserved = true
      }

      if (!reserved) {
        return jsonResponse(
          {
            error:
              'Ai atins limita de 3 exporturi în ultimele 24 de ore. Încearcă din nou mâine sau contactează DPO.',
          },
          429,
          corsHeaders,
        )
      }

      const exportPayload = await buildUserDataExport(adminClient, user)

      return jsonResponse(exportPayload as Record<string, unknown>, 200, corsHeaders)
    } catch (error) {
      console.error('[export-user-data]', error)
      return jsonResponse(
        { error: 'Nu am putut genera exportul datelor. Încearcă din nou.' },
        500,
        getCorsHeaders(c),
      )
    }
  })

  app.all('*', (c) => jsonResponse({ error: 'Method not allowed.' }, 405, getCorsHeaders(c)))

  return app
}

export const app = createExportUserDataApp()
if (import.meta.main) {
  Deno.serve(app.fetch)
}
