# Sasha's Bakeshop — website

Website for Sasha's Bakeshop, a licensed home microbakery in SE Portland, OR. Plain HTML/CSS/vanilla JS, no build step. Implements the brand design handoff (playful hand-cut letterpress).

## Pages
- `index.html` — Home: hero photo carousel, mainstays marquee, clickable menu cards, signup, how it works
- `preorder.html` — This week's bakes: quantity steppers, live stock labels, cart bar with order minimum, woodcut OPEN/SOLD OUT flip sign; checkout goes to the Stripe Payment Link (all orders prepaid)
- `products/` — One page per bake with ingredients/allergens dropdown (DRAFT lists, Sasha must confirm) and a Snag CTA that flips to a notify-me email form when orders close
- `about.html` — Sasha's story (dog disclaimer footnote included)
- `contact.html` — Contact cards + "drop a note" form (opens visitor's email app)
- `faq.html` — Accordion FAQ (ordering, pickup, minimums, allergens, dogs, policies)
- `privacy.html` — Plain-language privacy policy, linked from the footer legal row
- `journal.html` + `posts/` — Blog for SEO and newsletter content; copy `posts/welcome-to-sashas-bakeshop.html` as the template for new posts

The logo (top-left, every page) links back to Home. A mini open/sold-out sign is injected next to it by `js/main.js`, and the favicon flips to match.

## Shop config
Top of `js/main.js`: `SB.ordersOpen` (drives the flip sign + open/closed favicon), `SB.orderMin`, `SB.deliveryMin`, `SB.paymentLink` (Stripe Payment Link for the weekly drop).

## Stripe (sandbox for now)
Account: Sasha's Bakeshop sandbox (`acct_1Trpw1D8gu8vcOCx`). Created via API:
- Products + prices: Bibingka cookies $4.50, Tahini chocolate chunk $4, Hazelnut coffee cake slice $6, Whole hazelnut coffee cake $32, Black sesame rolls (set of 4) $14 — each carries `metadata.slug` and `metadata.weekly_stock`
- Weekly-drop Payment Link (`plink_1TrtihD8gu8vcOCx3Pm0SUJR`): all five items (incl. whole coffee cake) with adjustable quantities capped at weekly stock, pickup/delivery dropdown, delivery-address + notes fields, phone collection, minimums in the submit text, custom confirmation message. Old link `plink_1Trq6T...` deactivated.

"Check out" sends the customer to the Payment Link; quantities are confirmed on Stripe's page. The email-order path (`checkout.html`, pay at pickup) remains as fallback, linked from the preorder fine print.

**Going live checklist:** activate the real Stripe account, recreate products + payment link in live mode (or use the dashboard's "copy to live mode"), then swap `SB.paymentLink`. Test with card 4242 4242 4242 4242 in sandbox first.

## Hosting
Live at **https://sashasbakeshop.com** — GitHub Pages from this repo (`main` branch root), deploys on every push. DNS is on Cloudflare: apex A records to GitHub (`185.199.108.153`, `185.199.109.153`) and `www` CNAME to `leahwagner.github.io`, all **DNS only** (grey cloud — keep it grey or GitHub's cert renewal breaks). HTTPS enforced, cert auto-renews.

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

## Handy tricks
- Append `?preview=closed` to any page URL to preview the sold-out state (signs, favicon, notify-me forms) without changing config.
- The announcement ticker, countdown, and jukebox playlist all live in the `SB` config at the top of `js/main.js`.
- Marquee text is drawn on a canvas overlay (smooth in Safari); the SVG text underneath is the no-JS/reduced-motion fallback.
