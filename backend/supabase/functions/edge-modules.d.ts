declare module 'jsr:@supabase/functions-js/edge-runtime.d.ts' {
  const edgeRuntime: true
  export default edgeRuntime
}

declare module 'npm:@supabase/supabase-js@2.49.1' {
  export { createClient } from '../../node_modules/@supabase/supabase-js/dist/index.d.mts'
}

declare module 'npm:stripe@17.7.0' {
  import Stripe from '../../node_modules/stripe/types/index.d.ts'
  export default Stripe
}

declare module 'hono' {
  export class Hono<TVariables = Record<string, unknown>> {
    use(...args: any[]): this
    options(...args: any[]): this
    post(...args: any[]): this
    all(...args: any[]): this
    fetch(request: Request): Promise<Response>
  }
}
