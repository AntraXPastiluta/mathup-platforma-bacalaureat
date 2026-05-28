import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'
import Stripe from 'npm:stripe@17.7.0'
import { requireAuthenticatedUser } from '../_shared/auth.ts'
import { type EnvSource, readEnv } from '../_shared/env.ts'
import { createBaseApp, getCorsHeaders, jsonResponse, textResponse } from '../_shared/http.ts'
import { resolveAppUrl } from '../_shared/checkout.ts'

type CheckoutDeps = {
  createClient?: typeof createClient
  stripe?: typeof Stripe
  env?: EnvSource
}

export function createCheckoutSessionApp(deps: CheckoutDeps = {}) {
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
      const requestBody = await c.req.json().catch(() => ({}))
      const appUrl = resolveAppUrl(c.req.raw, requestBody.return_origin, env)

      if (!stripeSecret || !stripePriceId || !supabaseUrl || !supabaseAnonKey) {
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
      const stripe = new StripeCtor(stripeSecret, { apiVersion: '2025-02-24.acacia' })
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: stripePriceId, quantity: 1 }],
        success_url: `${appUrl}/profile?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/profile?checkout=cancelled`,
        customer_email: user.email ?? undefined,
        client_reference_id: user.id,
        subscription_data: {
          metadata: {
            user_id: user.id,
          },
        },
        metadata: {
          user_id: user.id,
        },
      })

      return jsonResponse({ url: session.url }, 200, corsHeaders)
    } catch {
      return jsonResponse({ error: 'Checkout session failed.' }, 500, getCorsHeaders(c))
    }
  })

  app.all('*', (c) => jsonResponse({ error: 'Method not allowed.' }, 405, getCorsHeaders(c)))

  return app
}

export const app = createCheckoutSessionApp()
if (import.meta.main) {
  Deno.serve(app.fetch)
}
