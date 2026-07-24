// sasha's bakeshop — checkout Worker
//
// Creates a Stripe Checkout Session with the EXACT quantities from the site
// cart, so a mixed box carries through to Stripe (unlike a Payment Link).
//
// Prices live here on the server, keyed by item id, so the browser can never
// change what it's charged. The site only sends {id, qty} + pickup/delivery.
//
// Secret: set STRIPE_SECRET_KEY with `wrangler secret put STRIPE_SECRET_KEY`
// (the live sk_live_… key). It is read from env at runtime and never shipped.

const CATALOG = {
  'tahini-cookies': { name: 'Half dozen tahini chocolate chip cookies', amount: 1800 },
  'coffee-cake':    { name: 'Hazelnut streusel coffee cake (9" round)',  amount: 2800 },
  'weekend-box':    { name: 'The weekend box',                           amount: 4200 },
};

const FREE_DELIVERY_OVER = 5000; // cents — free delivery at/above $50
const DELIVERY_FEE       = 500;  // cents — $5 delivery under the threshold
const MAX_QTY            = 20;   // per-line sanity cap

const SITE = 'https://sashasbakeshop.com';
const ALLOWED_ORIGINS = [
  'https://sashasbakeshop.com',
  'https://www.sashasbakeshop.com',
  'http://localhost:8765', // local preview
];

function cors(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export default {
  async fetch(request, env) {
    const headers = cors(request.headers.get('Origin') || '');

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, headers);
    if (!env.STRIPE_SECRET_KEY) return json({ error: 'Server not configured' }, 500, headers);

    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Invalid request' }, 400, headers); }

    const items = Array.isArray(body.items) ? body.items : [];
    const fulfillment = body.fulfillment === 'delivery' ? 'delivery' : 'pickup';

    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', `${SITE}/thanks?session_id={CHECKOUT_SESSION_ID}`);
    params.set('cancel_url', `${SITE}/early-access`);
    params.set('phone_number_collection[enabled]', 'true');
    params.set('metadata[fulfillment]', fulfillment);
    params.set('metadata[source]', 'early-access');

    // Build validated line items from the server-side catalog.
    let subtotal = 0, i = 0;
    for (const it of items) {
      const entry = it && CATALOG[it.id];
      let qty = parseInt(it && it.qty, 10);
      if (!entry || !Number.isFinite(qty) || qty < 1) continue;
      if (qty > MAX_QTY) qty = MAX_QTY;
      subtotal += entry.amount * qty;
      params.set(`line_items[${i}][price_data][currency]`, 'usd');
      params.set(`line_items[${i}][price_data][product_data][name]`, entry.name);
      params.set(`line_items[${i}][price_data][unit_amount]`, String(entry.amount));
      params.set(`line_items[${i}][quantity]`, String(qty));
      i++;
    }
    if (i === 0) return json({ error: 'Your box is empty' }, 400, headers);

    if (fulfillment === 'delivery') {
      const fee = subtotal >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE;
      params.set('shipping_address_collection[allowed_countries][0]', 'US');
      params.set('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
      params.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]', String(fee));
      params.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'usd');
      params.set('shipping_options[0][shipping_rate_data][display_name]', fee === 0 ? 'Delivery (free over $50)' : 'Delivery');
    }
    // pickup: no address, no shipping.

    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return json({ error: (data.error && data.error.message) || 'Payment error' }, 502, headers);
    }
    return json({ url: data.url }, 200, headers);
  },
};
