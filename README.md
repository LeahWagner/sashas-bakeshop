# Sasha's Bakeshop — website

Website for Sasha's Bakeshop, a licensed home microbakery in SE Portland, OR. Plain HTML/CSS/vanilla JS, no build step. Implements the brand design handoff (playful hand-cut letterpress).

## Pages
- `index.html` — Home: hero, mainstays marquee, menu cards, signup, how it works
- `preorder.html` — This week's bakes: quantity steppers, live stock labels, cart bar
- `about.html` — Sasha's story
- `contact.html` — Contact cards + "drop a note" form (opens visitor's email app)

The logo (top-left, every page) links back to Home.

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
- **Preorder checkout** — cart works client-side; checkout button is a demo stub. Plan: Hotplate link or custom Stripe checkout (see conversation notes).
- **"Never miss a bake" signup** — needs an SMS/email marketing backend (Mailchimp, Klaviyo, Postscript).
- Preorder stock counts + orders-open status are hardcoded in `preorder.html` / `js/main.js`.
