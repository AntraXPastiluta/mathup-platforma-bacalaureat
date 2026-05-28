import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'
import { type EnvSource, readEnv } from '../_shared/env.ts'
import { createBaseApp, getCorsHeaders, jsonResponse, textResponse } from '../_shared/http.ts'
import { requireAuthenticatedUser } from '../_shared/auth.ts'
import {
  CATEGORY_LABELS,
  RATE_LIMIT_COUNT,
  RATE_LIMIT_WINDOW_MS,
  SupportPayload,
  sendEmailJsNotification,
  validatePayload,
} from '../_shared/support.ts'

type SupportDeps = {
  createClient?: typeof createClient
  fetchImpl?: typeof fetch
  env?: EnvSource
}

function parseJsonBody(payload: unknown): SupportPayload {
  if (!payload || typeof payload !== 'object') return {}
  return payload as SupportPayload
}

export function createSubmitSupportRequestApp(deps: SupportDeps = {}) {
  const createSupabaseClient = deps.createClient ?? createClient
  const fetchImpl = deps.fetchImpl ?? fetch
  const env = deps.env
  const app = createBaseApp()

  app.options('*', (c) => textResponse('ok', 200, getCorsHeaders(c)))

  app.post('*', async (c) => {
    try {
      const corsHeaders = getCorsHeaders(c)
      const supabaseUrl = readEnv('SUPABASE_URL', env)
      const supabaseAnonKey = readEnv('SUPABASE_ANON_KEY', env)
      const serviceRoleKey = readEnv('SERVICE_ROLE_KEY', env) ?? readEnv('SUPABASE_SERVICE_ROLE_KEY', env)
      const emailJsServiceId = readEnv('EMAILJS_SERVICE_ID', env)
      const emailJsTemplateId = readEnv('EMAILJS_TEMPLATE_ID', env)
      const emailJsPublicKey = readEnv('EMAILJS_PUBLIC_KEY', env)
      const emailJsPrivateKey = readEnv('EMAILJS_PRIVATE_KEY', env)
      const supportNotifyEmail = readEnv('SUPPORT_NOTIFY_EMAIL', env) ?? ''

      if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
        throw new Error('Missing Supabase environment configuration.')
      }
      if (!emailJsServiceId || !emailJsTemplateId || !emailJsPublicKey || !emailJsPrivateKey) {
        throw new Error('Missing EmailJS environment configuration.')
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

      const requestBody = parseJsonBody(await c.req.json().catch(() => ({})))
      const validated = validatePayload(requestBody)
      if ('error' in validated) {
        return jsonResponse({ error: validated.error }, 400, corsHeaders)
      }

      const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {})
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()

      const { count, error: rateError } = await adminClient
        .from('support_requests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', windowStart)

      if (rateError) {
        console.error('[submit-support-request] rate limit check failed:', rateError)
        throw rateError
      }

      if ((count ?? 0) >= RATE_LIMIT_COUNT) {
        return jsonResponse(
          { error: 'Ai trimis prea multe mesaje. Încearcă din nou peste o oră.' },
          429,
          corsHeaders,
        )
      }

      const userEmail = user.email?.trim() || ''
      if (!userEmail) {
        return jsonResponse({ error: 'Contul tău nu are un email valid.' }, 400, corsHeaders)
      }

      const userName =
        typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name.trim()
          : ''

      const { data: inserted, error: insertError } = await adminClient
        .from('support_requests')
        .insert({
          user_id: user.id,
          user_email: userEmail,
          user_name: userName || null,
          category: validated.data.category,
          subject: validated.data.subject,
          message: validated.data.message,
          status: 'open',
        })
        .select('id, created_at')
        .single()

      if (insertError || !inserted?.id) {
        console.error('[submit-support-request] insert failed:', insertError)
        throw insertError ?? new Error('Insert failed')
      }

      const categoryLabel = CATEGORY_LABELS[validated.data.category] ?? validated.data.category
      const emailSubject = `[MathUP Suport] ${validated.data.subject}`
      const emailBody = [
        'Mesaj nou de suport MathUP',
        '',
        `ID cerere: ${inserted.id}`,
        `Data: ${inserted.created_at}`,
        `Utilizator: ${userName || '(fără nume)'}`,
        `Email: ${userEmail}`,
        `User ID: ${user.id}`,
        `Categorie: ${categoryLabel}`,
        `Subiect: ${validated.data.subject}`,
        '',
        'Mesaj:',
        validated.data.message,
      ].join('\n')

      const displayName = userName || 'Elev MathUP'
      const createdAt = String(inserted.created_at)
      let emailDelivered = false
      try {
        await sendEmailJsNotification({
          serviceId: emailJsServiceId,
          templateId: emailJsTemplateId,
          publicKey: emailJsPublicKey,
          privateKey: emailJsPrivateKey,
          fetchImpl,
          templateParams: {
            to_email: supportNotifyEmail,
            reply_to: userEmail,
            from_name: displayName,
            from_email: userEmail,
            email_subject: emailSubject,
            email_body: emailBody,
            request_id: inserted.id,
            created_at: createdAt,
            user_name: displayName,
            user_email: userEmail,
            user_id: user.id,
            category: validated.data.category,
            category_label: categoryLabel,
            subject: validated.data.subject,
            message: validated.data.message,
            name: displayName,
            email: userEmail,
            title: validated.data.subject,
            time: createdAt,
          },
        })
        emailDelivered = true
      } catch (emailError) {
        const emailMessage = emailError instanceof Error ? emailError.message : ''
        console.error('[submit-support-request] email notification failed:', emailMessage)
        if (emailMessage === 'EMAILJS_NON_BROWSER_DISABLED') {
          console.error(
            '[submit-support-request] Enable "Allow API requests from non-browser environments" at https://dashboard.emailjs.com/admin/account/security',
          )
        }
      }

      return jsonResponse({ id: inserted.id, email_delivered: emailDelivered }, 200, corsHeaders)
    } catch (error) {
      console.error('[submit-support-request]', error)
      return jsonResponse({ error: 'Nu am putut trimite mesajul. Încearcă din nou.' }, 500, getCorsHeaders(c))
    }
  })

  app.all('*', (c) => jsonResponse({ error: 'Method not allowed.' }, 405, getCorsHeaders(c)))

  return app
}

export const app = createSubmitSupportRequestApp()
if (import.meta.main) {
  Deno.serve(app.fetch)
}
