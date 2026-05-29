declare module '@supabase/functions-js/edge-runtime' {
  const edgeRuntime: true
  export default edgeRuntime
}

type SupabaseError = { message: string } | null

type QueryResponse = {
  data: any
  error: SupabaseError
  count?: number | null
}

type FilterBuilder = PromiseLike<QueryResponse> & {
  eq: (column: string, value: string) => FilterBuilder
  gte: (column: string, value: string) => FilterBuilder
  order: (column: string, options: { ascending: boolean }) => FilterBuilder
  maybeSingle: () => Promise<QueryResponse>
}

type MutationBuilder = PromiseLike<QueryResponse> & {
  eq: (column: string, value: string) => MutationBuilder
  select: (columns: string) => MutationBuilder
  single: () => Promise<QueryResponse>
}

type TableClient = {
  select: (columns: string, options?: { count?: string; head?: boolean }) => FilterBuilder
  insert: (row: Record<string, unknown> | Array<Record<string, unknown>>) => MutationBuilder
  upsert: (
    row: Record<string, unknown> | Array<Record<string, unknown>>,
    options?: { onConflict?: string },
  ) => Promise<{ error: SupabaseError }>
  update: (values: Record<string, unknown>) => MutationBuilder
  delete: () => MutationBuilder
}

declare module '@supabase/supabase-js' {
  export type SupabaseClient = {
    auth: {
      getUser: () => Promise<{
        data: { user: Record<string, unknown> | null }
        error: SupabaseError
      }>
      admin: {
        deleteUser: (userId: string) => Promise<{ error: SupabaseError }>
      }
    }
    from: (table: string) => TableClient
  }

  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: Record<string, unknown>,
  ): SupabaseClient
}

declare module 'stripe' {
  class Stripe {
    constructor(...args: unknown[])
    checkout: {
      sessions: {
        create: (payload: Record<string, unknown>) => Promise<Stripe.Checkout.Session>
        retrieve: (
          sessionId: string,
          options?: { expand?: string[] },
        ) => Promise<Stripe.Checkout.Session>
      }
    }
    subscriptions: {
      retrieve: (subscriptionId: string) => Promise<Stripe.Subscription>
      update: (
        subscriptionId: string,
        payload: Record<string, unknown>,
      ) => Promise<Stripe.Subscription>
    }
    webhooks: {
      constructEventAsync: (
        body: string,
        signature: string,
        secret: string,
      ) => Promise<Stripe.Event>
    }
  }

  namespace Stripe {
    type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | string
    type ExpandableId = string | { id?: string | null } | null

    interface SubscriptionItem {
      price?: { id?: string | null } | null
    }

    interface Subscription {
      id: string
      status: SubscriptionStatus
      cancel_at_period_end: boolean
      current_period_end?: number | null
      currency?: string | null
      metadata?: Record<string, string> | null
      customer?: ExpandableId
      items?: { data?: SubscriptionItem[] } | null
    }

    namespace Checkout {
      interface Session {
        id: string
        url?: string | null
        mode?: string | null
        status?: string | null
        metadata?: Record<string, string> | null
        client_reference_id?: string | null
        subscription?: Subscription | string | null
        payment_intent?: string | { id?: string | null } | null
        customer?: ExpandableId
        amount_total?: number | null
        currency?: string | null
      }
    }

    interface Invoice {
      subscription?: string | { id?: string | null } | null
    }

    interface Charge {
      payment_intent?: string | null
      amount_refunded?: number | null
      currency?: string | null
    }

    interface Event {
      type: string
      data: {
        object: unknown
      }
    }
  }

  export default Stripe
}

declare module 'hono' {
  export type Context<T = Record<string, unknown>> = {
    req: {
      raw: Request
      json: <TBody = any>() => Promise<TBody>
      header: (name: string) => string | undefined
    }
    set: (key: string, value: unknown) => void
    get: (key: string) => unknown
    header: (key: string, value: string) => void
  } & T

  export class Hono<T = Record<string, unknown>> {
    use(...args: unknown[]): this
    options(path: string, handler: (c: Context<T>) => Response | Promise<Response>): this
    post(path: string, handler: (c: Context<T>) => Response | Promise<Response>): this
    all(path: string, handler: (c: Context<T>) => Response | Promise<Response>): this
    fetch(request: Request): Promise<Response>
  }
}
