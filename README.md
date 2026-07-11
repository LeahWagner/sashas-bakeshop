# Sasha's Bakeshop — website

Website for Sasha's Bakeshop, a licensed home microbakery in SE Portland, OR. Plain HTML/CSS/vanilla JS, no build step. Implements the brand design handoff (playful hand-cut letterpress).

## Pages
- `index.html` — Home: hero, mainstays marquee, menu cards, signup, how it works
- `preorder.html` — This week's bakes: quantity steppers, live stock labels, cart bar with order minimum, flip OPEN/CLOSED sign
- `checkout.html` — Order flow: contact details, pickup or delivery (with delivery minimum), order summary; places the order via the visitor's email app for now
- `about.html` — Sasha's story
- `contact.html` — Contact cards + "drop a note" form (opens visitor's email app)
- `journal.html` + `posts/` — Blog for SEO and newsletter content; copy `posts/hello-from-the-oven.html` as the template for new posts

The logo (top-left, every page) links back to Home.

## Shop config
Top of `js/main.js`: `SB.ordersOpen` (drives the flip sign + open/closed favicon), `SB.orderMin`, `SB.deliveryMin`. Cart hands off to checkout via localStorage.

## Run it locally
```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Brand
Design tokens live in the `:root` block of `css/styles.css`:
- Cream `#faf3e3`, surface `#fffdf6`, ink `#33302a`, red-orange `#d14b2b` (primary), mustard `#e6a832`, olive `#6f7d4a`, plum `#9a6fa0`
- Display: Hot House Bold (`assets/hothouse-bold.ttf`, owner-licensed), uppercase w/ letter-spacing; logo stays lowercase
- Body: Work Sans (Google Fonts)
- Copy rule (owner mandate): **no em dashes anywhere**

## Placeholder slots (awaiting assets from owner)
- Dog logo stamp in nav (artist is drawing) — currently a styled circle (`.stamp`)
- Hero block print (dogs + baguette) — `.hero-panel` on Home
- Photos: hazelnut coffee cake, black sesame rolls, Sasha + dogs (x2)
- Favicon (`assets/favicon.svg`) — swap for dog logo when ready

## Not wired up yet (frontend stubs, marked TODO in `js/main.js`)
- **Online payment** — orders currently arrive by email; payment settled at pickup/delivery. Next step: Stripe Checkout + a small backend (Supabase/Firebase) for real inventory.
- **"Never miss a bake" signup** — needs an SMS/email marketing backend (Mailchimp, Klaviyo, Postscript).
- Stock counts, orders-open status, and minimums are hardcoded in `preorder.html` / `js/main.js` (`SB` config).
