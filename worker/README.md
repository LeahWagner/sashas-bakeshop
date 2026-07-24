# sasha's bakeshop — checkout Worker

A Cloudflare Worker that turns the site cart into a Stripe Checkout Session with
exact quantities (and free-over-$50 delivery). Prices live in `src/index.js`, so
the browser can't change what it's charged. The Stripe secret key is stored as a
Worker secret, never in this repo.

## One-time deploy

Run these from inside the `worker/` folder. You need a (free) Cloudflare account.

```sh
cd worker

# 1. Sign in to Cloudflare (opens a browser)
npx wrangler login

# 2. Add your LIVE Stripe secret key (paste sk_live_… when prompted).
#    This is stored encrypted in Cloudflare — it never touches the repo.
npx wrangler secret put STRIPE_SECRET_KEY

# 3. Deploy
npx wrangler deploy
```

Step 3 prints a URL like:

    https://sashas-checkout.<your-subdomain>.workers.dev

Send that URL back and it gets wired into the site (`SB.checkoutEndpoint`).

## Redeploy after a price/copy change

Edit `src/index.js`, then:

```sh
npx wrangler deploy
```

## What to change if prices or the delivery rule move

In `src/index.js`:

- `CATALOG` — item ids, names, and amounts (in **cents**: `1800` = $18).
- `FREE_DELIVERY_OVER` — the free-delivery threshold (cents).
- `DELIVERY_FEE` — the flat delivery fee under the threshold (cents).

The item ids (`tahini-cookies`, `coffee-cake`, `weekend-box`) must match the
`data-id` attributes on the cards in `early-access.html`.

## Test

```sh
curl -X POST https://sashas-checkout.<your-subdomain>.workers.dev \
  -H 'Content-Type: application/json' \
  -d '{"fulfillment":"delivery","items":[{"id":"weekend-box","qty":2}]}'
```

A working response is `{"url":"https://checkout.stripe.com/..."}`.
