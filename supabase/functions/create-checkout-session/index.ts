import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'
import Stripe from 'npm:stripe@17.7.0'
import { buildCorsHeaders } from '../_shared/cors'

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
    const stripePriceId = Deno.env.get('STRIPE_PRICE_ID')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const requestBody = await req.json().catch(() => ({}))
    const appUrl = resolveAppUrl(req, requestBody.return_origin)

    if (!stripeSecret || !stripePriceId || !supabaseUrl || !supabaseAnonKey) {
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

    const stripe = new Stripe(stripeSecret, { apiVersion: '2025-02-24.acacia' })
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${appUrl}/profile?checkout=success`,
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

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Checkout session failed.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, '')
}

function isAllowedReturnOrigin(origin: string) {
  const normalized = normalizeOrigin(origin)
  if (normalized === 'http://localhost:5173') return true
  if (/^https:\/\/scholar-bac\.vercel\.app$/.test(normalized)) return true
  if (/^https:\/\/scholar-bac-[a-z0-9-]+-[\w-]+\.vercel\.app$/.test(normalized)) return true

  const configured = Deno.env.get('APP_URL')
  if (configured && normalized === normalizeOrigin(configured)) return true

  return false
}

function resolveAppUrl(req: Request, returnOrigin: unknown) {
  const configured = normalizeOrigin(Deno.env.get('APP_URL') ?? 'http://localhost:5173')
  const candidates = [
    typeof returnOrigin === 'string' ? returnOrigin : null,
    req.headers.get('Origin'),
  ]

  for (const candidate of candidates) {
    if (!candidate) continue
    const normalized = normalizeOrigin(candidate)
    if (isAllowedReturnOrigin(normalized)) return normalized
  }

  return configured
}
