/* sasha's bakeshop — shared scripts */

// --- Shop config (single source of truth) ---
// TODO: drive ordersOpen from the real drop schedule (Thursday 9am open).
var SB = {
  ordersOpen: true,
  orderMin: 12,      // minimum order total ($)
  deliveryMin: 35,   // minimum order total for delivery ($)
  // Stripe Payment Link for this week's drop (currently TEST mode; swap for the
  // live-mode link when Sasha's Stripe account goes live).
  paymentLink: 'https://buy.stripe.com/test_aFacN4285fsJ1Nh4r82ZO01',
  // Ticker announcements. {countdown} is replaced with a live countdown to
  // the next Thursday 9am drop.
  announcementsOpen: [
    'orders are live',
    'pickup saturday 10am to 1pm, se portland',
    'new: whole coffee cakes',
    'the newsletter gets the menu first'
  ],
  announcementsClosed: [
    'sold out for this week',
    'next drop in {countdown}',
    'orders open thursday 9am',
    'the newsletter gets the menu first'
  ],
  // Now spinning: the kitchen soundtrack (design handoff 2c list).
  // TODO: swap in the real playlist URL from Sasha.
  playlistUrl: 'https://open.spotify.com/playlist/sashas-baking-mix',
  playlist: [
    'Sunday Kind of Love · Etta James',
    'Dream a Little Dream · Ella Fitzgerald',
    'La Vie en Rose · Louis Armstrong',
    'Stand by Me · Ben E. King',
    'Be My Baby · The Ronettes'
  ]
};

// Preview trick: append ?preview=closed to any page URL to see the sold-out
// state (signs, favicon, notify-me forms) without changing the real config.
if (/[?&]preview=closed\b/.test(location.search)) SB.ordersOpen = false;

// --- Tab shop sign: favicon flips open/sold-out on every page ---
(function () {
  var link = document.querySelector('link[rel="icon"]');
  if (!link) return;
  var name = SB.ordersOpen ? 'favicon-open.svg' : 'favicon-closed.svg';
  link.href = link.href.replace(/favicon[^\/]*\.svg/, name);
})();

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
  track.innerHTML = seq() + seq(); // duplicated for a seamless -50% loop
  ticker.appendChild(track);
  document.body.insertBefore(ticker, document.body.firstChild);

  function nextDrop() {
    var now = new Date();
    var target = new Date(now);
    target.setHours(9, 0, 0, 0);
    var diff = (4 - now.getDay() + 7) % 7; // Thursday = 4
    if (diff === 0 && now >= target) diff = 7;
    target.setDate(target.getDate() + diff);
    return target;
  }
  function updateCount() {
    var els = track.querySelectorAll('.tick-count');
    if (!els.length) return;
    var ms = nextDrop() - new Date();
    var d = Math.floor(ms / 86400000);
    var h = Math.floor(ms % 86400000 / 3600000);
    var m = Math.floor(ms % 3600000 / 60000);
    var txt = (d ? d + 'd ' : '') + h + 'h ' + ('0' + m).slice(-2) + 'm';
    els.forEach(function (e) { e.textContent = txt; });
  }
  updateCount();
  setInterval(updateCount, 30000);
})();

// --- Mini shop sign next to the brand name in the header (every page) ---
(function () {
  var brand = document.querySelector('.brand');
  if (!brand) return;
  var prefix = /\/(posts|products)\//.test(location.pathname) ? '../' : '';
  var sign = document.createElement('a');
  sign.className = 'mini-sign' + (SB.ordersOpen ? '' : ' is-closed');
  sign.href = prefix + 'preorder.html';
  sign.textContent = SB.ordersOpen ? 'Orders open' : 'Sold out';
  sign.setAttribute('aria-label', SB.ordersOpen ? 'Orders are open' : 'Sold out, orders open Thursday');
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

  var canvas, ctx, scale, advances = [], unit = 600;

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var w = band.clientWidth, h = Math.round(w * VBH / VBW);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    scale = w / VBW * dpr;
    ctx = canvas.getContext('2d');
  }

  function measure() {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
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
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(-250, -10, VBW + 500, VBH + 20);
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

// --- Now spinning: cycles the kitchen soundtrack, sleeve links to the playlist (home) ---
(function () {
  var trackEl = document.getElementById('jukebox-track');
  if (!trackEl || !SB.playlist.length) return;
  var songIndex = 0;
  function render() {
    trackEl.textContent = SB.playlist[songIndex % SB.playlist.length];
  }
  render();
  var btn = document.getElementById('jukebox-shuffle');
  if (btn) btn.addEventListener('click', function () { songIndex++; render(); });
  var link = document.getElementById('playlist-link');
  if (link) link.href = SB.playlistUrl;
})();

// --- "Never miss a bake" newsletter signup ---
// TODO: wire to a real email marketing backend (Mailchimp, Klaviyo).
(function () {
  var forms = document.querySelectorAll('.signup-form');
  forms.forEach(function (form) {
    var button = form.querySelector('button');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var original = button.textContent;
      button.textContent = 'Coming soon!';
      setTimeout(function () { button.textContent = original; }, 2500);
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
        left <= 0 ? 'Sold out for you!' :
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
      : 'Pickup Saturday 10am to 1pm, SE Portland. Delivery over ' + money(SB.deliveryMin) + '.';
    cartTotal.textContent = money(t.total);

    var belowMin = t.count > 0 && t.total < SB.orderMin;
    cartNote.textContent = belowMin
      ? 'Order minimum is ' + money(SB.orderMin) + '. Add ' + money(SB.orderMin - t.total) + ' more.'
      : '';
    checkoutBtn.disabled = t.count === 0 || belowMin || !SB.ordersOpen;
    checkoutBtn.textContent = SB.ordersOpen ? 'Check out' : 'Sold out';
  }

  items.forEach(function (it) {
    it.plusBtn.addEventListener('click', function () {
      if (it.qty < it.stock) { it.qty++; render(); }
    });
    it.minusBtn.addEventListener('click', function () {
      if (it.qty > 0) { it.qty--; render(); }
    });
  });

  checkoutBtn.addEventListener('click', function () {
    var t = totals();
    if (t.count === 0 || t.total < SB.orderMin || !SB.ordersOpen) return;
    // Payment happens on Stripe's hosted page; quantities are confirmed there.
    window.location.href = SB.paymentLink;
  });

  render();
})();
