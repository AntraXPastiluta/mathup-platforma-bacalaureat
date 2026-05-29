import assert from 'node:assert/strict'
import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildCorsHeaders } from './_shared/http.ts'
import { createCheckoutSessionApp } from './create-checkout-session/index.ts'
import { createCancelPremiumSubscriptionApp } from './cancel-premium-subscription/index.ts'
import { createSubmitSupportRequestApp } from './submit-support-request/index.ts'
import { createStripeWebhookApp } from './stripe-webhook/index.ts'
import { createSyncPremiumCheckoutApp } from './sync-premium-checkout/index.ts'
import { createExportUserDataApp } from './export-user-data/index.ts'

type StripeConstructor = typeof Stripe

type TestAuthUser = {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown>
}

function asStripeConstructor<T>(value: T): StripeConstructor {
  return value as unknown as StripeConstructor
}

function asSupabaseClient<T>(value: T): SupabaseClient {
  return value as unknown as SupabaseClient
}

function makeAuthClient(user: TestAuthUser) {
  return asSupabaseClient({
    auth: {
      getUser: () => Promise.resolve({ data: { user }, error: null }),
    },
  })
}
const testEnv = {
  APP_URL: 'http://localhost:5173',
  STRIPE_SECRET_KEY: 'sk_test_123',
  STRIPE_PRICE_ID: 'price_test_123',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon_test_123',
  SERVICE_ROLE_KEY: 'service_test_123',
  EMAILJS_SERVICE_ID: 'service',
  EMAILJS_TEMPLATE_ID: 'template',
  EMAILJS_AUTOREPLY_TEMPLATE_ID: 'autoreply_template',
  EMAILJS_PUBLIC_KEY: 'public',
  EMAILJS_PRIVATE_KEY: 'private',
  SUPPORT_NOTIFY_EMAIL: 'support@example.com',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
}

function makeCheckoutStripe() {
  const state: { payload?: unknown } = {}
  class FakeStripe {
    checkout = {
      sessions: {
        create: (payload: unknown) => {
          state.payload = payload
          return Promise.resolve({ url: 'https://checkout.example/session' })
        },
      },
    }
    constructor(public secret: string, public options: unknown) {}
  }

  return { FakeStripe, state }
}

function makeSyncStripe() {
  class FakeStripe {
    checkout = {
      sessions: {
        retrieve: (sessionId: string) => Promise.resolve({
          id: sessionId,
          mode: 'subscription',
          status: 'complete',
          metadata: { user_id: 'user_123' },
          client_reference_id: 'user_123',
          subscription: {
            id: 'sub_123',
            status: 'active',
            cancel_at_period_end: false,
            current_period_end: 1_900_000_000,
            currency: 'ron',
            items: { data: [{ price: { id: 'price_test_123' } }] },
          },
          payment_intent: 'pi_123',
          customer: 'cus_123',
          amount_total: 4900,
          currency: 'ron',
        }),
      },
    }
    subscriptions = {
      retrieve: () => Promise.resolve({
        id: 'sub_123',
        status: 'active',
        cancel_at_period_end: false,
        current_period_end: 1_900_000_000,
        currency: 'ron',
        items: { data: [{ price: { id: 'price_test_123' } }] },
      }),
    }
    constructor(public secret: string, public options: unknown) {}
  }

  return { FakeStripe }
}

function makePremiumEntitlementDb() {
  return asSupabaseClient({
    from: (table: string) => {
      if (table === 'premium_entitlements') {
        return {
          upsert: () => Promise.resolve({ error: null }),
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: {
                  status: 'active',
                  expires_at: '2026-07-10T21:59:59.000Z',
                  purchased_at: '2026-05-28T12:00:00.000Z',
                  stripe_subscription_id: 'sub_123',
                  cancel_at_period_end: false,
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'premium_orders') {
        return {
          upsert: () => Promise.resolve({ error: null }),
        }
      }
      throw new Error(`Unexpected table ${table}`)
    },
  })
}

function makeCancelStripe() {
  const state: { updates: unknown[] } = { updates: [] }
  class FakeStripe {
    subscriptions = {
      retrieve: () => Promise.resolve({
        id: 'sub_123',
        cancel_at_period_end: false,
        current_period_end: 1_900_000_000,
      }),
      update: (_id: string, payload: unknown) => {
        state.updates.push(payload)
        return Promise.resolve({
          id: 'sub_123',
          cancel_at_period_end: true,
          current_period_end: 1_900_000_000,
        })
      },
    }
    constructor(public secret: string, public options: unknown) {}
  }

  return { FakeStripe, state }
}

const exportTestUser = {
  id: 'user_123',
  email: 'student@example.com',
  created_at: '2026-01-01T00:00:00.000Z',
  last_sign_in_at: '2026-05-28T12:00:00.000Z',
  user_metadata: {
    full_name: 'Test User',
    profile: 'mate_info',
    legal_docs_version: '2026-05-29',
    terms_accepted_at: '2026-01-02T00:00:00.000Z',
    privacy_accepted_at: '2026-01-02T00:00:00.000Z',
  },
}

function makeExportDb(options: { recentExports?: number } = {}) {
  const state: { logged?: boolean; recentExports: number } = {
    recentExports: options.recentExports ?? 0,
  }

  const emptyList = () => Promise.resolve({ data: [], error: null })
  const emptySingle = () => Promise.resolve({ data: null, error: null })

  const client = asSupabaseClient({
    from: (table: string) => {
      if (table === 'gdpr_export_logs') {
        return {
          select: () => ({
            eq: () => ({
              gte: () => Promise.resolve({ count: state.recentExports, error: null }),
            }),
          }),
          insert: () => {
            state.logged = true
            return Promise.resolve({ error: null })
          },
        }
      }

      if (table === 'premium_entitlements') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: emptySingle,
            }),
          }),
        }
      }

      if (table === 'user_study_roadmaps' || table === 'support_requests') {
        return {
          select: () => ({
            eq: () => ({
              order: () => emptyList(),
            }),
          }),
        }
      }

      return {
        select: () => ({
          eq: () => emptyList(),
        }),
      }
    },
  })

  return { client, state }
}

function makeSupportDb() {
  const state: { inserted?: unknown } = {}
  return {
    client: asSupabaseClient({
      auth: {
        getUser: () => Promise.resolve({
          data: {
            user: {
              id: 'user_123',
              email: 'student@example.com',
              user_metadata: { full_name: 'Test User' },
            },
          },
          error: null,
        }),
      },
      from: (table: string) => {
        if (table !== 'support_requests') throw new Error(`Unexpected table ${table}`)
        return {
          select: () => ({
            eq: () => ({
              gte: () => Promise.resolve({ count: 0, error: null }),
            }),
          }),
          insert: (row: unknown) => ({
            select: () => ({
              single: () => {
                state.inserted = row
                return Promise.resolve({
                  data: { id: 'req_123', created_at: '2026-05-28T00:00:00.000Z' },
                  error: null,
                })
              },
            }),
          }),
        }
      },
    }),
    state,
  }
}

function makeWebhookStripe() {
  const state: { rawBody?: string; signature?: string; eventType?: string } = {}
  class FakeStripe {
    webhooks = {
      constructEventAsync: (body: string, signature: string) => {
        state.rawBody = body
        state.signature = signature
        return Promise.resolve({
          type: 'charge.refunded',
          data: {
            object: {
              payment_intent: 'pi_123',
              amount_refunded: 2500,
              currency: 'ron',
            },
          },
        })
      },
    }
    subscriptions = {
      retrieve: () => Promise.resolve({}),
    }
    constructor(public secret: string, public options: unknown) {}
  }

  return { FakeStripe, state }
}

Deno.test('cors helper keeps allowed origins', () => {
  const headers = buildCorsHeaders(new Request('https://example.test', {
    headers: { Origin: 'http://localhost:5173' },
  }))
  assert.equal(headers['Access-Control-Allow-Origin'], 'http://localhost:5173')
})

Deno.test('create-checkout-session returns a checkout URL', async () => {
  const { FakeStripe, state } = makeCheckoutStripe()
  const app = createCheckoutSessionApp({
    createClient: () => makeAuthClient({ id: 'user_123', email: 'student@example.com' }),
    stripe: asStripeConstructor(FakeStripe),
    env: testEnv,
  })

  const response = await app.fetch(new Request('http://localhost', {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:5173',
      Authorization: 'Bearer token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ return_origin: 'http://localhost:5173' }),
  }))

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'http://localhost:5173')
  assert.deepEqual(await response.json(), { url: 'https://checkout.example/session' })
  assert.equal((state.payload as Record<string, unknown> | undefined)?.success_url, 'http://localhost:5173/profile?checkout=success&session_id={CHECKOUT_SESSION_ID}')
})

Deno.test('sync-premium-checkout activates entitlement for completed session', async () => {
  const { FakeStripe } = makeSyncStripe()
  const app = createSyncPremiumCheckoutApp({
    createClient: (_url: string, key: string) => {
      if (key === 'anon_test_123') {
        return makeAuthClient({ id: 'user_123', email: 'student@example.com' })
      }
      return makePremiumEntitlementDb()
    },
    stripe: asStripeConstructor(FakeStripe),
    env: testEnv,
  })

  const response = await app.fetch(new Request('http://localhost', {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:5173',
      Authorization: 'Bearer token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ session_id: 'cs_test_123' }),
  }))

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(payload.entitlement?.status, 'active')
})

Deno.test('cancel-premium-subscription returns 404 when no entitlement exists', async () => {
  const { FakeStripe } = makeCancelStripe()
  const app = createCancelPremiumSubscriptionApp({
    env: testEnv,
    createClient: (_url: string, key: string) => {
      if (key === 'anon_test_123') {
        return makeAuthClient({ id: 'user_123', email: 'student@example.com' })
      }
      return asSupabaseClient({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      })
    },
    stripe: asStripeConstructor(FakeStripe),
  })

  const response = await app.fetch(new Request('http://localhost', {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:5173',
      Authorization: 'Bearer token',
    },
  }))

  assert.equal(response.status, 404)
  const payload = await response.json()
  assert.equal(payload.error, 'Nu există un abonament Premium activ de anulat.')
})

Deno.test('submit-support-request returns the saved request id', async () => {
  const { client } = makeSupportDb()
  const emailCalls: Array<{ template_id: string; template_params: Record<string, string> }> = []
  const app = createSubmitSupportRequestApp({
    createClient: () => client,
    fetchImpl: (_url, init) => {
      const requestInit = init as { body?: unknown } | undefined
      const body = JSON.parse(String(requestInit?.body ?? '{}'))
      emailCalls.push({ template_id: body.template_id, template_params: body.template_params })
      return Promise.resolve(new Response('', { status: 200 }))
    },
    env: testEnv,
  })

  const response = await app.fetch(new Request('http://localhost', {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:5173',
      Authorization: 'Bearer token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ category: 'billing', subject: 'Hello', message: 'Support request body' }),
  }))

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.deepEqual(payload, {
    id: 'req_123',
    autoreply_delivered: true,
  })
  assert.equal(emailCalls.length, 1)
  assert.equal(emailCalls[0].template_id, 'autoreply_template')
  assert.equal(emailCalls[0].template_params.to_email, 'student@example.com')
  assert.equal(emailCalls[0].template_params.email, 'student@example.com')
  assert.equal(emailCalls[0].template_params.subject, 'Hello')
  assert.equal(emailCalls[0].template_params.category_label, 'Facturare')
})

Deno.test('export-user-data returns 401 without authorization', async () => {
  const app = createExportUserDataApp({ env: testEnv })

  const response = await app.fetch(new Request('http://localhost', {
    method: 'POST',
    headers: { Origin: 'http://localhost:5173' },
  }))

  assert.equal(response.status, 401)
})

Deno.test('export-user-data returns structured export payload', async () => {
  const { client, state } = makeExportDb()
  const app = createExportUserDataApp({
    env: testEnv,
    createClient: (_url: string, key: string) => {
      if (key === 'anon_test_123') {
        return makeAuthClient(exportTestUser)
      }
      return client
    },
  })

  const response = await app.fetch(new Request('http://localhost', {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:5173',
      Authorization: 'Bearer token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  }))

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(payload.export_version, '1')
  assert.equal(payload.account.email, 'student@example.com')
  assert.equal(payload.profile.full_name, 'Test User')
  assert.equal(payload.meta.platform, 'MathUP')
  assert.equal('password' in payload, false)
  assert.equal('encrypted_password' in payload, false)
  assert.equal(state.logged, true)
})

Deno.test('export-user-data returns 429 when rate limit exceeded', async () => {
  const { client } = makeExportDb({ recentExports: 3 })
  const app = createExportUserDataApp({
    env: testEnv,
    createClient: (_url: string, key: string) => {
      if (key === 'anon_test_123') {
        return makeAuthClient(exportTestUser)
      }
      return client
    },
  })

  const response = await app.fetch(new Request('http://localhost', {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:5173',
      Authorization: 'Bearer token',
    },
  }))

  assert.equal(response.status, 429)
  const payload = await response.json()
  assert.match(payload.error, /3 exporturi/)
})

Deno.test('stripe-webhook accepts raw bodies and returns ok', async () => {
  const { FakeStripe, state } = makeWebhookStripe()
  const app = createStripeWebhookApp({
    stripe: asStripeConstructor(FakeStripe),
    env: testEnv,
    createClient: (_url: string, _key: string) => asSupabaseClient({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({
              data: {
                user_id: 'user_123',
                stripe_checkout_session_id: 'cs_123',
                stripe_subscription_id: 'sub_123',
                stripe_customer_id: 'cus_123',
              },
              error: null,
            }),
          }),
        }),
        upsert: () => Promise.resolve({ error: null }),
      }),
    }),
  })

  const rawBody = '{"id":"evt_123","object":"event"}'
  const response = await app.fetch(new Request('http://localhost', {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:5173',
      'stripe-signature': 'sig_123',
      'Content-Type': 'application/json',
    },
    body: rawBody,
  }))

  assert.equal(response.status, 200)
  assert.equal(await response.text(), 'ok')
  assert.equal(state.rawBody, rawBody)
  assert.equal(state.signature, 'sig_123')
})
