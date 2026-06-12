import '@supabase/functions-js/edge-runtime'
import { createClient } from '@supabase/supabase-js'
import { type EnvSource, readEnv } from '../_shared/env.ts'
import { createBaseApp, getCorsHeaders, jsonResponse, textResponse } from '../_shared/http.ts'
import { requireAuthenticatedUser } from '../_shared/auth.ts'
import { sendEmailJsNotification } from '../_shared/emailjs.ts'

const RATE_LIMIT_COUNT = 3
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const TOKEN_EXPIRY_MINUTES = 15

type Deps = {
  createClient?: typeof createClient
  fetchImpl?: typeof fetch
  env?: EnvSource
}

/** Six-digit OTP from CSPRNG (not Math.random). */
export function generateSixDigitCode(): string {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  const code = 100_000 + (bytes[0] % 900_000)
  return String(code)
}

export function createRequestAccountDeletionApp(deps: Deps = {}) {
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
      const emailJsPublicKey = readEnv('EMAILJS_PUBLIC_KEY', env)
      const emailJsPrivateKey = readEnv('EMAILJS_PRIVATE_KEY', env)
      const emailJsDeletionTemplateId = readEnv('EMAILJS_DELETION_TEMPLATE_ID', env)

      if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
        throw new Error('Missing Supabase environment configuration.')
      }
      if (!emailJsServiceId || !emailJsPublicKey || !emailJsPrivateKey || !emailJsDeletionTemplateId) {
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

      const userEmail = user.email?.trim() || ''
      if (!userEmail) {
        return jsonResponse({ error: 'Contul tău nu are un email valid.' }, 400, corsHeaders)
      }

      const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {})

      // Rate limit: max 3 requests per hour
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
      const { count, error: rateError } = await adminClient
        .from('account_deletion_tokens')
        .select('user_id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', windowStart)

      if (rateError) {
        console.error('[request-account-deletion] rate limit check failed:', rateError)
        throw rateError
      }

      if ((count ?? 0) >= RATE_LIMIT_COUNT) {
        return jsonResponse(
          { error: 'Ai solicitat prea multe coduri. Încearcă din nou peste o oră.' },
          429,
          corsHeaders,
        )
      }

      const token = generateSixDigitCode()
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString()

      const { error: upsertError } = await adminClient
        .from('account_deletion_tokens')
        .upsert({
          user_id: user.id,
          token,
          expires_at: expiresAt,
          created_at: new Date().toISOString(),
          failed_attempts: 0,
          locked_until: null,
        })

      if (upsertError) {
        console.error('[request-account-deletion] upsert failed:', upsertError)
        throw upsertError
      }

      const userName =
        typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
          ? user.user_metadata.full_name.trim()
          : 'Elev MathUP'

      let emailSent = false
      try {
        await sendEmailJsNotification({
          serviceId: emailJsServiceId,
          templateId: emailJsDeletionTemplateId,
          publicKey: emailJsPublicKey,
          privateKey: emailJsPrivateKey,
          fetchImpl,
          templateParams: {
            to_email: userEmail,
            email: userEmail,
            user_name: userName,
            user_email: userEmail,
            deletion_code: token,
            expires_minutes: String(TOKEN_EXPIRY_MINUTES),
          },
        })
        emailSent = true
      } catch (emailError) {
        const msg = emailError instanceof Error ? emailError.message : ''
        console.error('[request-account-deletion] email failed:', msg)
        if (msg === 'EMAILJS_NON_BROWSER_DISABLED') {
          console.error(
            '[request-account-deletion] Enable "Allow API requests from non-browser environments" at https://dashboard.emailjs.com/admin/account/security',
          )
        }
      }

      return jsonResponse({ sent: emailSent }, 200, corsHeaders)
    } catch (error) {
      console.error('[request-account-deletion]', error)
      return jsonResponse(
        { error: 'Nu am putut trimite codul de confirmare. Încearcă din nou.' },
        500,
        getCorsHeaders(c),
      )
    }
  })

  app.all('*', (c) => jsonResponse({ error: 'Method not allowed.' }, 405, getCorsHeaders(c)))

  return app
}

export const app = createRequestAccountDeletionApp()
if (import.meta.main) {
  Deno.serve(app.fetch)
}
