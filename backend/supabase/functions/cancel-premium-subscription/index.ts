/// <reference path="../edge-modules.d.ts" />
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'
import Stripe from 'npm:stripe@17.7.0'
import { type EnvSource, readEnv } from '../_shared/env.ts'
import { createBaseApp, getCorsHeaders, jsonResponse, textResponse } from '../_shared/http.ts'
import { requireAuthenticatedUser } from '../_shared/auth.ts'
import { subscriptionPeriodEndIso } from '../_shared/premium.ts'

type CancelDeps = {
  createClient?: typeof createClient
  stripe?: typeof Stripe
  env?: EnvSource
}

export function createCancelPremiumSubscriptionApp(deps: CancelDeps = {}) {
  const createSupabaseClient = deps.createClient ?? createClient
  const StripeCtor = deps.stripe ?? Stripe
  const env = deps.env
  const app = createBaseApp()

  app.options('*', (c) => textResponse('ok', 200, getCorsHeaders(c)))

  app.post('*', async (c) => {
    try {
      const corsHeaders = getCorsHeaders(c)
      const stripeSecret = readEnv('STRIPE_SECRET_KEY', env)
      const supabaseUrl = readEnv('SUPABASE_URL', env)
      const supabaseAnonKey = readEnv('SUPABASE_ANON_KEY', env)
      const serviceRoleKey = readEnv('SERVICE_ROLE_KEY', env) ?? ''

      if (!stripeSecret || !supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
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

      const admin = createSupabaseClient(supabaseUrl, serviceRoleKey, {})
      const { data: entitlement, error: entitlementError } = await admin
        .from('premium_entitlements')
        .select('status,stripe_subscription_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (entitlementError) throw entitlementError
      if (!entitlement?.stripe_subscription_id) {
        return jsonResponse({ error: 'Nu există un abonament Premium activ de anulat.' }, 404, corsHeaders)
      }

      const stripe = new StripeCtor(stripeSecret, { apiVersion: '2025-02-24.acacia' })
      const subscription = await stripe.subscriptions.retrieve(entitlement.stripe_subscription_id)
      const expiresAt = subscriptionPeriodEndIso(subscription, env)

      if (subscription.cancel_at_period_end) {
        await admin
          .from('premium_entitlements')
          .update({
            cancel_at_period_end: true,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)

        return jsonResponse({
          cancel_at_period_end: true,
          expires_at: expiresAt,
          message: 'Abonamentul este deja programat pentru anulare.',
        }, 200, corsHeaders)
      }

      const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      })
      const updatedExpiresAt = subscriptionPeriodEndIso(updatedSubscription, env)

      await admin
        .from('premium_entitlements')
        .update({
          cancel_at_period_end: true,
          expires_at: updatedExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      return jsonResponse({
        cancel_at_period_end: true,
        expires_at: updatedExpiresAt,
        message: 'Abonamentul Premium se anulează la sfârșitul perioadei curente.',
      }, 200, corsHeaders)
    } catch {
      return jsonResponse({ error: 'Subscription cancellation failed.' }, 500, getCorsHeaders(c))
    }
  })

  app.all('*', (c) => jsonResponse({ error: 'Method not allowed.' }, 405, getCorsHeaders(c)))

  return app
}

export const app = createCancelPremiumSubscriptionApp()
if (import.meta.main) {
  Deno.serve(app.fetch)
}
