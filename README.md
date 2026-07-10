# Sasha's Bakeshop — website

A simple static website for Sasha's Bakeshop microbakery. No build step — plain HTML, CSS, and vanilla JS.

## Pages
- `index.html` — Home
- `preorder.html` — Preorder form
- `about.html` — About / story
- `contact.html` — Contact form + details

The logo (top-left, on every page) links back to Home.

## Run it locally
Just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Reskinning with brand guidelines
Nearly all styling flows from CSS variables at the top of `css/styles.css` (the `:root` block): colors, fonts, radius, shadows, spacing. Update those tokens to apply the brand palette and typography site-wide.

- Logo: replace `assets/logo.svg` (keep the filename, or update the `<img src>` and favicon `<link>` in each page's `<head>`).
- Brand name text sits in the `.brand-name` span in each page's header.

## To do later
- Wire the preorder + contact forms to a real backend or email service (currently they show a placeholder confirmation only — see `js/main.js`).
- Fill in real About copy, hours, location, and social links (marked with `[...]` placeholders).
