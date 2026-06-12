import '@supabase/functions-js/edge-runtime'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { requireAuthenticatedUser } from '../_shared/auth.ts'
import { type EnvSource, readEnv } from '../_shared/env.ts'
import { createBaseApp, getCorsHeaders, jsonResponse, textResponse } from '../_shared/http.ts'
import { syncCheckoutSession } from '../_shared/stripe-webhook.ts'
import { STRIPE_API_VERSION } from '../_shared/stripe.ts'

type SyncCheckoutDeps = {
  createClient?: typeof createClient
  stripe?: typeof Stripe
  env?: EnvSource
}

export function createSyncPremiumCheckoutApp(deps: SyncCheckoutDeps = {}) {
  const createSupabaseClient = deps.createClient ?? createClient
  const StripeCtor = deps.stripe ?? Stripe
  const env = deps.env
  const app = createBaseApp()

  app.options('*', (c) => textResponse('ok', 200, getCorsHeaders(c)))

  app.post('*', async (c) => {
    try {
      const corsHeaders = getCorsHeaders(c)
      const stripeSecret = readEnv('STRIPE_SECRET_KEY', env)
      const stripePriceId = readEnv('STRIPE_PRICE_ID', env)
      const supabaseUrl = readEnv('SUPABASE_URL', env)
      const supabaseAnonKey = readEnv('SUPABASE_ANON_KEY', env)
      const serviceRoleKey =
        readEnv('SERVICE_ROLE_KEY', env) ?? readEnv('SUPABASE_SERVICE_ROLE_KEY', env) ?? ''

      if (!stripeSecret || !stripePriceId || !supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
        throw new Error('Missing Stripe or Supabase environment configuration.')
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
      const requestBody = await c.req.json().catch(() => ({}))
      const sessionId = typeof requestBody.session_id === 'string' ? requestBody.session_id.trim() : ''

      if (!sessionId) {
        return jsonResponse({ error: 'Missing checkout session id.' }, 400, corsHeaders)
      }

      const stripe = new StripeCtor(stripeSecret, { apiVersion: STRIPE_API_VERSION })
      const session = await stripe.checkout.sessions.retrieve(sessionId)

      if (session.mode !== 'subscription') {
        return jsonResponse({ error: 'Invalid checkout session type.' }, 400, corsHeaders)
      }

      if (session.status !== 'complete') {
        return jsonResponse({ error: 'Checkout session is not complete yet.' }, 409, corsHeaders)
      }

      const sessionUserId = session.metadata?.user_id ?? session.client_reference_id
      if (!sessionUserId || sessionUserId !== user.id) {
        return jsonResponse({ error: 'Checkout session does not belong to this account.' }, 403, corsHeaders)
      }

      await syncCheckoutSession({
        stripePriceId,
        supabaseUrl,
        serviceRoleKey,
        createClientImpl: createSupabaseClient,
        stripe,
        session,
      })

      const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {})
      const { data: entitlement, error } = await adminClient
        .from('premium_entitlements')
        .select('status,expires_at,purchased_at,stripe_subscription_id,cancel_at_period_end')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error

      return jsonResponse({ entitlement }, 200, corsHeaders)
    } catch (error) {
      console.error('sync-premium-checkout failed:', error)
      return jsonResponse({ error: 'Premium activation failed.' }, 500, getCorsHeaders(c))
    }
  })

  app.all('*', (c) => jsonResponse({ error: 'Method not allowed.' }, 405, getCorsHeaders(c)))

  return app
}

export const app = createSyncPremiumCheckoutApp()
if (import.meta.main) {
  Deno.serve(app.fetch)
}
