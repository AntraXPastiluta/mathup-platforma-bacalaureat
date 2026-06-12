/// <reference path="../edge-modules.d.ts" />
import '@supabase/functions-js/edge-runtime'
import { createClient } from '@supabase/supabase-js'
import { type EnvSource, readEnv } from '../_shared/env.ts'
import { createBaseApp, getCorsHeaders, jsonResponse, textResponse } from '../_shared/http.ts'
import { requireAuthenticatedUser } from '../_shared/auth.ts'

const ALLOWED_CATEGORIES = new Set([
  'cont',
  'plati',
  'continut',
  'tehnic',
  'altele',
])

const MAX_SUBJECT_LEN = 200
const MAX_BODY_LEN = 4000
const MAX_NAME_LEN = 120
const MAX_TICKETS_PER_HOUR = 5

type SubmitDeps = {
  createClient?: typeof createClient
  env?: EnvSource
}

function trimText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLen)
}

export function createSubmitSupportRequestApp(deps: SubmitDeps = {}) {
  const createSupabaseClient = deps.createClient ?? createClient
  const env = deps.env
  const app = createBaseApp()

  app.options('*', (c) => textResponse('ok', 200, getCorsHeaders(c)))

  app.post('*', async (c) => {
    try {
      const corsHeaders = getCorsHeaders(c)
      const supabaseUrl = readEnv('SUPABASE_URL', env)
      const supabaseAnonKey = readEnv('SUPABASE_ANON_KEY', env)
      const serviceRoleKey = readEnv('SERVICE_ROLE_KEY', env) ?? readEnv('SUPABASE_SERVICE_ROLE_KEY', env) ?? ''

      if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
        throw new Error('Missing Supabase environment configuration.')
      }

      const authResult = await requireAuthenticatedUser({
        req: c.req.raw,
        corsHeaders,
        supabaseUrl,
        supabaseAnonKey,
        createClient: createSupabaseClient,
        unauthorizedMessage: 'Trebuie să fii autentificat pentru a trimite o solicitare.',
      })

      if (authResult instanceof Response) return authResult
      const { user } = authResult

      let body: Record<string, unknown>
      try {
        body = await c.req.json()
      } catch {
        return jsonResponse({ error: 'Corpul cererii trebuie să fie JSON valid.' }, 400, corsHeaders)
      }

      const category = trimText(body.category, 32).toLowerCase()
      const subject = trimText(body.subject, MAX_SUBJECT_LEN)
      const message = trimText(body.message, MAX_BODY_LEN)

      if (!ALLOWED_CATEGORIES.has(category)) {
        return jsonResponse({ error: 'Categoria selectată nu este validă.' }, 400, corsHeaders)
      }
      if (!subject) {
        return jsonResponse({ error: 'Subiectul este obligatoriu.' }, 400, corsHeaders)
      }
      if (!message || message.length < 10) {
        return jsonResponse({ error: 'Mesajul trebuie să aibă cel puțin 10 caractere.' }, 400, corsHeaders)
      }

      const admin = createSupabaseClient(supabaseUrl, serviceRoleKey, {})
      const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString()

      const { count, error: countError } = await admin
        .from('support_requests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', windowStart)

      if (countError) throw countError
      if ((count ?? 0) >= MAX_TICKETS_PER_HOUR) {
        return jsonResponse(
          { error: 'Ai atins limita de solicitări pe oră. Încearcă din nou mai târziu.' },
          429,
          corsHeaders,
        )
      }

      const userEmail = (user.email ?? '').trim().toLowerCase()
      const meta = user.user_metadata ?? {}
      const displayName = trimText(
        typeof meta.full_name === 'string'
          ? meta.full_name
          : typeof meta.name === 'string'
            ? meta.name
            : '',
        MAX_NAME_LEN,
      ) || null

      const { data: ticket, error: ticketError } = await admin
        .from('support_requests')
        .insert({
          user_id: user.id,
          user_email: userEmail || 'unknown@mathup.local',
          user_name: displayName,
          category,
          subject,
          message,
          status: 'open',
        })
        .select('id, subject, status, category, created_at')
        .single()

      if (ticketError) throw ticketError

      const { error: messageError } = await admin.from('support_request_messages').insert({
        ticket_id: ticket.id,
        author_user_id: user.id,
        author_role: 'user',
        body: message,
      })

      if (messageError) {
        // Inserts aren't transactional: roll back the ticket so we don't leave a
        // message-less ticket that still counts against the hourly rate limit.
        await admin.from('support_requests').delete().eq('id', ticket.id)
        throw messageError
      }

      return jsonResponse({ ticket }, 201, corsHeaders)
    } catch (error) {
      console.error('[submit-support-request]', error)
      return jsonResponse({ error: 'Nu am putut trimite solicitarea. Încearcă din nou.' }, 500, getCorsHeaders(c))
    }
  })

  app.all('*', (c) => jsonResponse({ error: 'Method not allowed.' }, 405, getCorsHeaders(c)))

  return app
}

export const app = createSubmitSupportRequestApp()
if (import.meta.main) {
  Deno.serve(app.fetch)
}
