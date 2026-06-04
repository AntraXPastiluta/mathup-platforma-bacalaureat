import assert from 'node:assert/strict'
import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildCorsHeaders } from './_shared/http.ts'
import { createCheckoutSessionApp } from './create-checkout-session/index.ts'
import { createCancelPremiumSubscriptionApp } from './cancel-premium-subscription/index.ts'
import { createStripeWebhookApp } from './stripe-webhook/index.ts'
import { createSyncPremiumCheckoutApp } from './sync-premium-checkout/index.ts'
import { createExportUserDataApp } from './export-user-data/index.ts'
import { createRequestAccountDeletionApp, generateSixDigitCode } from './request-account-deletion/index.ts'
import { createConfirmAccountDeletionApp, tokensEqual } from './confirm-account-deletion/index.ts'
import { createSubmitSupportRequestApp } from './submit-support-request/index.ts'

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
  EMAILJS_PUBLIC_KEY: 'public',
  EMAILJS_PRIVATE_KEY: 'private',
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
    rpc: (fn: string) => {
      if (fn === 'reserve_gdpr_export_slot') {
        if (state.recentExports >= 3) {
          return Promise.resolve({ data: false, error: null })
        }
        state.recentExports += 1
        state.logged = true
        return Promise.resolve({ data: true, error: null })
      }
      return Promise.resolve({ data: null, error: { message: `unknown rpc: ${fn}` } })
    },
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

      if (table === 'user_study_roadmaps') {
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

Deno.test('cors helper allows the production Vercel origin', () => {
  const headers = buildCorsHeaders(new Request('https://example.test', {
    headers: { Origin: 'https://mathup-platforma-bacalaureat.vercel.app' },
  }))
  assert.equal(
    headers['Access-Control-Allow-Origin'],
    'https://mathup-platforma-bacalaureat.vercel.app',
  )
})

Deno.test('cors helper rejects unknown origins', () => {
  const headers = buildCorsHeaders(new Request('https://example.test', {
    headers: { Origin: 'https://evil.example.com' },
  }))
  assert.equal(headers['Access-Control-Allow-Origin'], undefined)
})

Deno.test('cors helper echoes the requested headers from preflight', () => {
  const headers = buildCorsHeaders(new Request('https://example.test', {
    headers: {
      Origin: 'https://mathup-platforma-bacalaureat.vercel.app',
      'Access-Control-Request-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version',
    },
  }))
  assert.equal(
    headers['Access-Control-Allow-Headers'],
    'authorization, apikey, content-type, x-client-info, x-supabase-api-version',
  )
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

Deno.test('generateSixDigitCode returns a six-digit string from secure RNG', () => {
  const code = generateSixDigitCode()
  assert.match(code, /^\d{6}$/)
  const parsed = Number.parseInt(code, 10)
  assert.ok(parsed >= 100_000 && parsed <= 999_999)
})

Deno.test('tokensEqual uses constant-time comparison', () => {
  assert.equal(tokensEqual('123456', '123456'), true)
  assert.equal(tokensEqual('123456', '123457'), false)
  assert.equal(tokensEqual('123456', '12345'), false)
})

Deno.test('confirm-account-deletion locks out after repeated wrong codes', async () => {
  const tokenState = {
    token: '654321',
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    failed_attempts: 4,
    locked_until: null as string | null,
  }
  const updates: Record<string, unknown>[] = []

  const adminClient = asSupabaseClient({
    from: (table: string) => {
      assert.equal(table, 'account_deletion_tokens')
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: { ...tokenState }, error: null }),
          }),
        }),
        update: (payload: Record<string, unknown>) => ({
          eq: () => {
            updates.push(payload)
            if (typeof payload.failed_attempts === 'number') {
              tokenState.failed_attempts = payload.failed_attempts
            }
            if (payload.locked_until) {
              tokenState.locked_until = String(payload.locked_until)
            }
            return Promise.resolve({ error: null })
          },
        }),
      }
    },
  })

  const app = createConfirmAccountDeletionApp({
    env: testEnv,
    createClient: (_url: string, key: string) => {
      if (key === 'anon_test_123') {
        return makeAuthClient({ id: 'user_del', email: 'del@test.com' })
      }
      return adminClient
    },
  })

  const response = await app.fetch(new Request('http://localhost', {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:5173',
      Authorization: 'Bearer token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code: '000000' }),
  }))

  assert.equal(response.status, 429)
  const payload = await response.json()
  assert.match(payload.error, /Prea multe încercări/)
  assert.equal(tokenState.failed_attempts, 5)
  assert.ok(tokenState.locked_until)
  assert.equal(updates.length, 1)
})

Deno.test('confirm-account-deletion rejects when account is locked', async () => {
  const app = createConfirmAccountDeletionApp({
    env: testEnv,
    createClient: (_url: string, key: string) => {
      if (key === 'anon_test_123') {
        return makeAuthClient({ id: 'user_locked', email: 'locked@test.com' })
      }
      return asSupabaseClient({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: {
                  token: '654321',
                  expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                  failed_attempts: 5,
                  locked_until: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
                },
                error: null,
              }),
            }),
          }),
        }),
      })
    },
  })

  const response = await app.fetch(new Request('http://localhost', {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:5173',
      Authorization: 'Bearer token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code: '654321' }),
  }))

  assert.equal(response.status, 429)
})

Deno.test('submit-support-request creates ticket and seed message', async () => {
  const inserts: { table: string; payload: Record<string, unknown> }[] = []

  const adminClient = asSupabaseClient({
    from: (table: string) => {
      if (table === 'support_requests') {
        return {
          select: () => ({
            eq: () => ({
              gte: () => Promise.resolve({ count: 0, error: null }),
            }),
          }),
          insert: (payload: Record<string, unknown>) => ({
            select: () => ({
              single: () => {
                inserts.push({ table, payload })
                return Promise.resolve({
                  data: {
                    id: 'ticket_123',
                    subject: payload.subject,
                    status: 'open',
                    category: payload.category,
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                })
              },
            }),
          }),
        }
      }
      if (table === 'support_request_messages') {
        return {
          insert: (payload: Record<string, unknown>) => {
            inserts.push({ table, payload })
            return Promise.resolve({ error: null })
          },
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
  })

  const app = createSubmitSupportRequestApp({
    env: testEnv,
    createClient: (_url: string, key: string) => {
      if (key === 'anon_test_123') {
        return makeAuthClient({
          id: 'user_support',
          email: 'student@test.com',
          user_metadata: { full_name: 'Elev Test' },
        })
      }
      return adminClient
    },
  })

  const response = await app.fetch(new Request('http://localhost', {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:5173',
      Authorization: 'Bearer token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      category: 'tehnic',
      subject: 'Nu pot accesa lecția',
      message: 'Am o eroare când deschid lecția de algebră.',
    }),
  }))

  assert.equal(response.status, 201)
  const payload = await response.json()
  assert.equal(payload.ticket?.id, 'ticket_123')
  assert.equal(inserts.length, 2)
  assert.equal(inserts[0].table, 'support_requests')
  assert.equal(inserts[1].table, 'support_request_messages')
  assert.equal(inserts[1].payload.author_role, 'user')
})

Deno.test('submit-support-request rejects invalid category', async () => {
  const app = createSubmitSupportRequestApp({
    env: testEnv,
    createClient: (_url: string, key: string) => {
      if (key === 'anon_test_123') {
        return makeAuthClient({ id: 'user_support', email: 'student@test.com' })
      }
      return asSupabaseClient({ from: () => ({}) })
    },
  })

  const response = await app.fetch(new Request('http://localhost', {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:5173',
      Authorization: 'Bearer token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      category: 'invalid',
      subject: 'Test',
      message: 'Mesaj suficient de lung pentru validare.',
    }),
  }))

  assert.equal(response.status, 400)
})
