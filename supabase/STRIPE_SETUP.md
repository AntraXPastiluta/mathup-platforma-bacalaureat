# Stripe setup for ScholarBAC Premium

ScholarBAC Premium is a one-time Stripe Checkout purchase that unlocks roadmaps, downloads, quizzes, and non-default programs until the configured BAC season end date.

## Stripe Dashboard

1. Confirm the product `ScholarBAC Premium` and one-time RON price.
2. Copy the Price ID into `STRIPE_PRICE_ID`.
3. Create a webhook endpoint for the deployed `stripe-webhook` Edge Function URL.
4. Subscribe to `checkout.session.completed` and `charge.refunded`.
5. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

## Supabase Edge Function secrets

Set these secrets for both `create-checkout-session` and `stripe-webhook`:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET` (webhook function only)
- `SUPABASE_SERVICE_ROLE_KEY` (webhook function only)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (checkout function only)
- `APP_URL`
- `PREMIUM_SEASON_END` (optional ISO date)

## Deploy

```bash
npx supabase link --project-ref dhphstiemdzfglncqyev
npx supabase db push
npx supabase functions deploy create-checkout-session --no-verify-jwt
npx supabase functions deploy stripe-webhook --no-verify-jwt
```

For local webhook testing, use the Stripe CLI:

```bash
stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook
```
