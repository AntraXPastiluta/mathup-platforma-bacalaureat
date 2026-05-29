/// <reference path="../edge-modules.d.ts" />
import '@supabase/functions-js/edge-runtime'
import { createClient } from '@supabase/supabase-js'
import { type EnvSource, readEnv } from '../_shared/env.ts'
import { createBaseApp, getCorsHeaders, jsonResponse, textResponse } from '../_shared/http.ts'
import { requireAuthenticatedUser } from '../_shared/auth.ts'
import {
  CHAT_RATE_LIMIT_COUNT,
  CHAT_RATE_LIMIT_WINDOW_MS,
  type SupportMessagePayload,
  validateMessagePayload,
} from '../_shared/support.ts'

type SendMessageDeps = {
  createClient?: typeof createClient
  env?: EnvSource
}

function parseJsonBody(payload: unknown): SupportMessagePayload {
  if (!payload || typeof payload !== 'object') return {}
  return payload as SupportMessagePayload
}

export function createSendSupportMessageApp(deps: SendMessageDeps = {}) {
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
      const { supabase, user } = authResult

      const validated = validateMessagePayload(parseJsonBody(await c.req.json().catch(() => ({}))))
      if ('error' in validated) {
        return jsonResponse({ error: validated.error }, 400, corsHeaders)
      }

      const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {})
      const { data: ticket, error: ticketError } = await adminClient
        .from('support_requests')
        .select('id, user_id, assigned_admin_id, status')
        .eq('id', validated.data.ticketId)
        .maybeSingle()

      if (ticketError) {
        console.error('[send-support-message] ticket lookup failed:', ticketError)
        throw ticketError
      }
      if (!ticket) {
        return jsonResponse({ error: 'Ticketul nu a fost găsit.' }, 404, corsHeaders)
      }
      if (ticket.status === 'closed') {
        return jsonResponse({ error: 'Conversația este închisă.' }, 409, corsHeaders)
      }

      const isOwner = ticket.user_id === user.id
      let authorRole: 'user' | 'admin'

      if (isOwner) {
        authorRole = 'user'

        const windowStart = new Date(Date.now() - CHAT_RATE_LIMIT_WINDOW_MS).toISOString()
        const { count, error: rateError } = await adminClient
          .from('support_request_messages')
          .select('id', { count: 'exact', head: true })
          .eq('author_user_id', user.id)
          .eq('author_role', 'user')
          .gte('created_at', windowStart)

        if (rateError) {
          console.error('[send-support-message] rate limit check failed:', rateError)
          throw rateError
        }
        if ((count ?? 0) >= CHAT_RATE_LIMIT_COUNT) {
          return jsonResponse(
            { error: 'Ai trimis prea multe mesaje. Încearcă din nou peste o oră.' },
            429,
            corsHeaders,
          )
        }
      } else {
        const { data: isAdmin, error: adminCheckError } = await supabase.rpc('is_curriculum_admin')
        if (adminCheckError) {
          console.error('[send-support-message] admin check failed:', adminCheckError)
          throw adminCheckError
        }
        if (!isAdmin) {
          return jsonResponse({ error: 'Nu ai acces la acest ticket.' }, 403, corsHeaders)
        }
        if (ticket.assigned_admin_id !== user.id) {
          return jsonResponse(
            { error: 'Doar administratorul care a preluat ticketul poate răspunde.' },
            403,
            corsHeaders,
          )
        }
        authorRole = 'admin'
      }

      const { data: inserted, error: insertError } = await adminClient
        .from('support_request_messages')
        .insert({
          ticket_id: ticket.id,
          author_user_id: user.id,
          author_role: authorRole,
          body: validated.data.body,
        })
        .select('id, ticket_id, author_user_id, author_role, body, created_at')
        .single()

      if (insertError || !inserted?.id) {
        console.error('[send-support-message] insert failed:', insertError)
        throw insertError ?? new Error('Insert failed')
      }

      // A reply from the assigned admin moves an untouched ticket into progress.
      if (authorRole === 'admin' && ticket.status === 'open') {
        await adminClient
          .from('support_requests')
          .update({ status: 'in_progress' })
          .eq('id', ticket.id)
      }

      return jsonResponse({ message: inserted }, 200, corsHeaders)
    } catch (error) {
      console.error('[send-support-message]', error)
      return jsonResponse({ error: 'Nu am putut trimite mesajul. Încearcă din nou.' }, 500, getCorsHeaders(c))
    }
  })

  app.all('*', (c) => jsonResponse({ error: 'Method not allowed.' }, 405, getCorsHeaders(c)))

  return app
}

export const app = createSendSupportMessageApp()
if (import.meta.main) {
  Deno.serve(app.fetch)
}
