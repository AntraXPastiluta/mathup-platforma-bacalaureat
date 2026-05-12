/// <reference path="../edge-modules.d.ts" />
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'
import Stripe from 'npm:stripe@17.7.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function subscriptionPeriodEndIso(subscription: Stripe.Subscription) {
  const periodEnd = subscription.current_period_end
  if (!periodEnd) {
    throw new Error('Subscription missing current period end.')
  }
  return new Date(periodEnd * 1000).toISOString()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? ''

    if (!stripeSecret || !supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw new Error('Missing Stripe or Supabase environment configuration.')
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const { data: entitlement, error: entitlementError } = await admin
      .from('premium_entitlements')
      .select('status,stripe_subscription_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (entitlementError) throw entitlementError
    if (!entitlement?.stripe_subscription_id) {
      return new Response(JSON.stringify({ error: 'Nu există un abonament Premium activ de anulat.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: '2025-02-24.acacia' })
    const subscription = await stripe.subscriptions.retrieve(entitlement.stripe_subscription_id)
    const expiresAt = subscriptionPeriodEndIso(subscription)

    if (subscription.cancel_at_period_end) {
      await admin
        .from('premium_entitlements')
        .update({
          cancel_at_period_end: true,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      return new Response(JSON.stringify({
        cancel_at_period_end: true,
        expires_at: expiresAt,
        message: 'Abonamentul este deja programat pentru anulare.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    })
    const updatedExpiresAt = subscriptionPeriodEndIso(updatedSubscription)

    await admin
      .from('premium_entitlements')
      .update({
        cancel_at_period_end: true,
        expires_at: updatedExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    return new Response(JSON.stringify({
      cancel_at_period_end: true,
      expires_at: updatedExpiresAt,
      message: 'Abonamentul Premium se anulează la sfârșitul perioadei curente.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Subscription cancellation failed.'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
