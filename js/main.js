/* sasha's bakeshop - shared scripts */

// --- Shop config (single source of truth) ---
// TODO: drive ordersOpen from the real drop schedule (Thursday 9am open).
var SB = {
  // Pre-launch: the shop isn't live yet. The site stays browsable, but ordering
  // is off and everything counts down to launch. Flip to true on launch day.
  ordersOpen: false,
  // First drop drives the launch countdown in the ticker + signs.
  launchDate: new Date(2026, 7, 20, 9, 0, 0), // Aug 20, 2026 (Thu), 9am (month is 0-indexed)
  orderMin: 12,      // minimum order total ($)
  freeDeliveryOver: 50, // free delivery at/above this total ($); below it a delivery fee applies at checkout
  // Stripe Payment Link (LIVE). Shared by the preorder cart and the early-access
  // page; buyers confirm quantities on Stripe's hosted page. Note: preorder stays
  // gated (ordersOpen:false) until launch, so only early-access checks out today.
  paymentLink: 'https://buy.stripe.com/aFabJ07rCbSvbxt1sm2VG01',
  // Option B checkout: Cloudflare Worker that builds a Stripe Checkout Session
  // with exact cart quantities + delivery. Used on the early-access page when
  // set; empty string falls back to the Payment Link above so nothing breaks.
  checkoutEndpoint: 'https://sashas-checkout.sasharoach02.workers.dev',
  // Ticker announcements. {countdown} is replaced with a live countdown:
  // to launch while pre-launch, then to the next Thursday 9am drop.
  announcementsOpen: [
    'orders are live',
    'pickup saturday 10am to 1pm, se portland',
    'new: whole coffee cakes',
    'the newsletter gets the menu first'
  ],
  announcementsClosed: [
    'grand opening thursday august 20',
    'launching in {countdown}',
    'preorders open august 20',
    'the newsletter gets the menu first'
  ]
};

// Preview trick: append ?preview=closed to any page URL to see the sold-out
// state (signs, favicon, notify-me forms) without changing the real config.
if (/[?&]preview=closed\b/.test(location.search)) SB.ordersOpen = false;

// Early-access pages (private, unlisted direct link) open ordering ahead of the
// public launch. Scoped to pages that opt in with <body data-early>, so nothing
// else on the site is affected. Runs before the ticker/sign/preorder logic below
// so the whole page reads as "open" for the invited buyer.
if (document.body && document.body.hasAttribute('data-early')) SB.ordersOpen = true;

// --- Announcement ticker above the header (every page) ---
(function () {
  var msgs = SB.ordersOpen ? SB.announcementsOpen : SB.announcementsClosed;
  if (!msgs || !msgs.length) return;

  var ticker = document.createElement('div');
  ticker.className = 'ticker';
  ticker.setAttribute('aria-hidden', 'true');
  var track = document.createElement('div');
  track.className = 'ticker-track';
  function seq() {
    return msgs.map(function (m) {
      return '<span class="msg">' +
        m.replace('{countdown}', '<span class="tick-count"></span>') +
        '</span><span class="msg">✶</span>';
    }).join('');
  }
  ticker.appendChild(track);
  document.body.insertBefore(ticker, document.body.firstChild);

  // The -50% loop only reads as seamless if each half is at least as wide as
  // the viewport, otherwise a blank gap sweeps through once per cycle. Repeat
  // the sequence until a half covers the screen, then set the duration from
  // the measured width so it scrolls at the same speed at every size.
  var PX_PER_SEC = 40; // scroll rate, held constant across viewport sizes
  var slow = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var unitHTML = seq(), lastW = -1;

  function layout() {
    var w = window.innerWidth;
    if (w === lastW) return;
    lastW = w;
    track.style.animation = 'none';
    track.innerHTML = unitHTML;
    updateCount(); // the countdown text is part of the width being measured
    var one = track.scrollWidth;
    if (!one) return;
    var reps = Math.max(1, Math.ceil(w / one));
    track.innerHTML = unitHTML.repeat(reps * 2); // two halves for the -50% loop
    updateCount();
    if (!slow) track.style.animation = 'ticker-scroll ' + (one * reps / PX_PER_SEC) + 's linear infinite';
  }

  function nextDrop() {
    var now = new Date();
    var target = new Date(now);
    target.setHours(9, 0, 0, 0);
    var diff = (4 - now.getDay() + 7) % 7; // Thursday = 4
    if (diff === 0 && now >= target) diff = 7;
    target.setDate(target.getDate() + diff);
    return target;
  }
  function countdownTarget() {
    // Before launch, count down to opening day; after, to the next Thursday drop.
    if (SB.launchDate && SB.launchDate > new Date()) return SB.launchDate;
    return nextDrop();
  }
  function updateCount() {
    var els = track.querySelectorAll('.tick-count');
    if (!els.length) return;
    var ms = countdownTarget() - new Date();
    var d = Math.floor(ms / 86400000);
    var h = Math.floor(ms % 86400000 / 3600000);
    var m = Math.floor(ms % 3600000 / 60000);
    var txt = (d ? d + 'd ' : '') + h + 'h ' + ('0' + m).slice(-2) + 'm';
    els.forEach(function (e) { e.textContent = txt; });
  }
  layout();
  window.addEventListener('resize', layout);
  // Hot House swaps in after first paint and changes the measured width.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { lastW = -1; layout(); });
  }
  setInterval(updateCount, 30000);
})();

// --- Mini shop sign next to the brand name in the header (every page) ---
(function () {
  var brand = document.querySelector('.brand');
  if (!brand) return;
  // Early-access pages are self-contained; no mini-sign linking back into the
  // public shop (it would also mislabel the private page as publicly "open").
  if (document.body && document.body.hasAttribute('data-early')) return;
  var prefix = /\/(posts|products)\//.test(location.pathname) ? '../' : '';
  var preLaunch = SB.launchDate && SB.launchDate > new Date();
  var sign = document.createElement('a');
  sign.className = 'mini-sign' + (SB.ordersOpen ? '' : ' is-closed');
  sign.href = prefix + 'preorder.html';
  sign.textContent = SB.ordersOpen ? 'Orders open' : (preLaunch ? 'Opening soon' : 'Sold out');
  sign.setAttribute('aria-label', SB.ordersOpen ? 'Orders are open' : (preLaunch ? 'Opening soon, grand opening August 20' : 'Sold out, orders open Thursday'));
  brand.after(sign);
})();

// --- Mainstays squiggle marquee (home) ---
// The wave is the static SVG; the flowing text is drawn on a canvas overlay,
// glyph by glyph along the same curve. No DOM text layout per frame, so it is
// equally smooth in Safari and Chrome. The static SVG text remains as the
// no-JS / reduced-motion fallback.
(function () {
  var band = document.querySelector('.squiggle-band');
  if (!band) return;
  var svg = band.querySelector('svg');
  var svgText = svg && svg.querySelector('text');
  if (!svg || !svgText) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var VBW = 1600, VBH = 130;
  var PHRASE = 'THE MAINSTAYS   ✶   '; // 20 chars
  var FONT = '700 26px "Hot House", cursive';
  var LS = 5;          // letter-spacing, matches the SVG styling
  var SPEED = 0.045;   // user units per ms
  var DY = 10.75;      // baseline offset that centers glyphs on the stroke

  // The same wave as the SVG path: quadratic segments, period 200,
  // control points alternating y=20 / y=110 around the y=65 centerline.
  var PTS = [], TOT = 0;
  (function () {
    var px = null, py = null;
    for (var k = 0; k < 11; k++) {
      var ax = -200 + 200 * k, cx = ax + 100, bx = ax + 200;
      var cy = (k % 2 === 0) ? 20 : 110;
      for (var i = (k === 0 ? 0 : 1); i <= 40; i++) {
        var t = i / 40, u = 1 - t;
        var x = u * u * ax + 2 * t * u * cx + t * t * bx;
        var y = u * u * 65 + 2 * t * u * cy + t * t * 65;
        if (px !== null) TOT += Math.hypot(x - px, y - py);
        PTS.push({ s: TOT, x: x, y: y });
        px = x; py = y;
      }
    }
  })();
  function posAt(s) {
    if (s < 0) s = 0;
    if (s > TOT) s = TOT;
    var lo = 0, hi = PTS.length - 1;
    while (hi - lo > 1) {
      var mid = (lo + hi) >> 1;
      if (PTS[mid].s <= s) lo = mid; else hi = mid;
    }
    var a = PTS[lo], b = PTS[hi];
    var f = (b.s - a.s) ? (s - a.s) / (b.s - a.s) : 0;
    return {
      x: a.x + (b.x - a.x) * f,
      y: a.y + (b.y - a.y) * f,
      ang: Math.atan2(b.y - a.y, b.x - a.x)
    };
  }

  var canvas, ctx, scale, ox = 0, oy = 0, advances = [], unit = 600;

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    // The band's height comes from CSS now, so mirror the SVG's
    // preserveAspectRatio="xMidYMid slice": cover the box and center it.
    var w = band.clientWidth, h = band.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    scale = Math.max(w / VBW, h / VBH) * dpr;
    ox = (w * dpr - VBW * scale) / 2;
    oy = (h * dpr - VBH * scale) / 2;
    ctx = canvas.getContext('2d');
  }

  function measure() {
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    ctx.font = FONT;
    advances = [];
    unit = 0;
    for (var i = 0; i < PHRASE.length; i++) {
      var a = ctx.measureText(PHRASE[i]).width + LS;
      advances.push(a);
      unit += a;
    }
  }

  var off = 0, last = 0;
  function frame(now) {
    if (last) off -= (now - last) * SPEED;
    last = now;
    while (off <= -unit) off += unit;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    ctx.font = FONT;
    ctx.fillStyle = '#33302a';
    ctx.textAlign = 'center';
    var s = off, i = 0;
    while (s < TOT) {
      var adv = advances[i % advances.length];
      if (s + adv > 0) {
        var p = posAt(s + adv / 2);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.ang);
        ctx.fillText(PHRASE[i % PHRASE.length], 0, DY);
        ctx.restore();
      }
      s += adv;
      i++;
    }
    requestAnimationFrame(frame);
  }

  function begin() {
    canvas = document.createElement('canvas');
    canvas.className = 'squiggle-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    band.style.position = 'relative';
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.pointerEvents = 'none';
    band.appendChild(canvas);
    svgText.style.display = 'none';
    resize();
    measure();
    window.addEventListener('resize', function () { resize(); });
    requestAnimationFrame(frame);
  }

  if (document.fonts && document.fonts.load) {
    document.fonts.load(FONT).then(begin, begin);
  } else {
    begin();
  }
})();

// --- Hero photo carousel (home): crossfade every 10s ---
(function () {
  var carousel = document.querySelector('.hero-carousel');
  if (!carousel) return;
  var slides = carousel.querySelectorAll('img');
  if (slides.length < 2) return;
  var i = 0;
  setInterval(function () {
    slides[i].classList.remove('is-active');
    i = (i + 1) % slides.length;
    slides[i].classList.add('is-active');
  }, 10000);
})();

// --- Email signup + product notify forms -> Brevo (every .signup-form) ---
// The forms keep their own styling but POST natively into a hidden iframe, so
// the visitor stays on the page. EMAIL, the email_address_check honeypot, and
// locale are the fields Brevo's embed expects; the serve URL is the list token.
(function () {
  var forms = document.querySelectorAll('.signup-form');
  if (!forms.length) return;
  var BREVO = 'https://3023a9d9.sibforms.com/serve/MUIFAONlAZf281M_vSokMPkwn6g383SbWA5kDdflsLIiGS39IzIUO3IbfEx4o6Y0KskpkTSwXn87Rbp9Yl1IFWUhkBS353qAlvmPWPQsJekDp1mOZuzCR05uCYZmJSQ9hjRrQgAbFETXLt7mc_7rAU3auj2ec0EHYgEvDh4rngWz3HtrMvW7QT1uBXq3f9vrRdYbghOjkCE2sMkDrg==';

  // One hidden sink catches Brevo's response so the page never navigates away.
  var sink = document.createElement('iframe');
  sink.name = 'brevo-sink';
  sink.setAttribute('aria-hidden', 'true');
  sink.style.display = 'none';
  document.body.appendChild(sink);

  function ensureHidden(form, name, value) {
    if (form.querySelector('[name="' + name + '"]')) return;
    var i = document.createElement('input');
    i.type = 'hidden'; i.name = name; i.value = value;
    form.appendChild(i);
  }

  forms.forEach(function (form) {
    form.action = BREVO;
    form.method = 'POST';
    form.target = 'brevo-sink';
    var email = form.querySelector('input[type="email"], input[type="text"]');
    if (email) { email.name = 'EMAIL'; email.type = 'email'; email.required = true; }
    ensureHidden(form, 'email_address_check', ''); // Brevo honeypot; must stay empty
    ensureHidden(form, 'locale', 'en');

    var button = form.querySelector('button');
    form.addEventListener('submit', function () {
      // Native (valid-only) submit proceeds into the iframe; confirm and lock it
      // (single opt-in, so no "check your inbox" step). Stays put until reload.
      if (!button || button.dataset.busy) return;
      button.dataset.busy = '1';
      button.textContent = "Thanks, you're on the list!";
      button.disabled = true;
    });
  });
})();

// --- Product pages: swap the Snag CTA for a notify-me form when orders are closed ---
// TODO: wire the notify form to the same email marketing backend as the newsletter.
(function () {
  var cta = document.querySelector('.product-cta');
  if (!cta) return;
  var notify = document.querySelector('.notify-wrap');
  if (SB.ordersOpen) {
    if (notify) notify.classList.add('hidden');
  } else {
    cta.classList.add('hidden');
    if (notify) notify.classList.remove('hidden');
  }
})();

// --- Contact "drop a note" form: opens the visitor's email app ---
(function () {
  var button = document.getElementById('send-note');
  if (!button) return;
  button.addEventListener('click', function () {
    var name = (document.getElementById('note-name') || {}).value || '';
    var email = (document.getElementById('note-email') || {}).value || '';
    var msg = (document.getElementById('note-message') || {}).value || '';
    var body = encodeURIComponent(msg + '\n\n- ' + name + (email ? ' (' + email + ')' : ''));
    window.location.href = 'mailto:info@sashasbakeshop.com?subject=' +
      encodeURIComponent('Hello from the website!') + '&body=' + body;
    button.textContent = 'Opening your email app…';
    setTimeout(function () { button.textContent = 'Send'; }, 3000);
  });
})();

// --- Preorder: flip sign, steppers, stock labels, minimums, Stripe handoff ---
(function () {
  var grid = document.querySelector('.order-grid');
  if (!grid) return;

  // Taped-paper sign: starts on OPEN; when sold out it card-flips over
  // shortly after landing so visitors catch the flip.
  var sign = document.getElementById('status-sign');
  if (sign && !SB.ordersOpen) {
    setTimeout(function () { sign.classList.add('is-flipped'); }, 700);
  }

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.order-card'));
  var cartLabel = document.getElementById('cart-label');
  var cartSub = document.getElementById('cart-sub');
  var cartNote = document.getElementById('cart-note');
  var cartTotal = document.getElementById('cart-total');
  var checkoutBtn = document.getElementById('checkout');

  var items = cards.map(function (card) {
    return {
      id: card.dataset.id,
      price: parseFloat(card.dataset.price),
      stock: parseInt(card.dataset.stock, 10),
      qty: 0,
      stockEl: card.querySelector('.stock-label'),
      qtyEl: card.querySelector('.qty'),
      minusBtn: card.querySelector('.minus'),
      plusBtn: card.querySelector('.plus')
    };
  });

  function totals() {
    return items.reduce(function (acc, it) {
      acc.count += it.qty;
      acc.total += it.qty * it.price;
      return acc;
    }, { count: 0, total: 0 });
  }

  function money(n) {
    return '$' + n.toFixed(2).replace(/\.00$/, '');
  }

  function render() {
    items.forEach(function (it) {
      var left = it.stock - it.qty;
      it.qtyEl.textContent = it.qty;
      it.stockEl.textContent =
        left <= 0 ? 'Sold out.' :
        left <= 4 ? 'Only ' + left + ' left!' :
        left + ' left';
      it.stockEl.classList.toggle('is-low', left <= 4);
    });
    var t = totals();
    cartLabel.textContent = t.count === 0
      ? 'Your box is empty'
      : 'Your box · ' + t.count + (t.count === 1 ? ' treat' : ' treats');
    cartSub.textContent = t.count === 0
      ? 'Add something little (or a lot).'
      : 'Pickup Saturday 10am to 1pm, SE Portland. Free delivery over ' + money(SB.freeDeliveryOver) + ', otherwise a fee.';
    cartTotal.textContent = money(t.total);

    var belowMin = t.count > 0 && t.total < SB.orderMin;
    cartNote.textContent = belowMin
      ? 'Order minimum is ' + money(SB.orderMin) + '. Add ' + money(SB.orderMin - t.total) + ' more.'
      : '';
    checkoutBtn.disabled = t.count === 0 || belowMin || !SB.ordersOpen;
    checkoutBtn.textContent = SB.ordersOpen ? 'Check out'
      : (SB.launchDate && SB.launchDate > new Date()) ? 'Opening Aug 20' : 'Sold out';
  }

  items.forEach(function (it) {
    it.plusBtn.addEventListener('click', function () {
      if (it.qty < it.stock) { it.qty++; render(); }
    });
    it.minusBtn.addEventListener('click', function () {
      if (it.qty > 0) { it.qty--; render(); }
    });
  });

  // The early-access page carries exact quantities through the Worker; every
  // other page still hands off to the Payment Link (quantities confirmed there).
  var useWorker = SB.checkoutEndpoint && document.body && document.body.hasAttribute('data-early');

  function fulfillmentChoice() {
    var sel = document.querySelector('input[name="fulfillment"]:checked');
    return sel ? sel.value : 'pickup';
  }

  checkoutBtn.addEventListener('click', function () {
    var t = totals();
    if (t.count === 0 || t.total < SB.orderMin || !SB.ordersOpen) return;

    if (useWorker) {
      var payload = {
        fulfillment: fulfillmentChoice(),
        items: items.filter(function (it) { return it.qty > 0; })
          .map(function (it) { return { id: it.id, qty: it.qty }; })
      };
      var prev = checkoutBtn.textContent;
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = 'Taking you to checkout…';
      if (cartNote) cartNote.textContent = '';
      fetch(SB.checkoutEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (d && d.url) { window.location.href = d.url; return; } // navigates away
        throw new Error((d && d.error) || 'Checkout failed');
      }).catch(function (err) {
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = prev;
        if (cartNote) cartNote.textContent = 'Sorry, checkout had a hiccup. Please try again.';
        if (window.console) console.error('Checkout error:', err);
      });
      return;
    }

    // Fallback: Stripe Payment Link; quantities are confirmed on Stripe.
    window.location.href = SB.paymentLink;
  });

  render();
})();
