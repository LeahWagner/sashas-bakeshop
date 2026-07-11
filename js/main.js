/* sasha's bakeshop — shared scripts */

// --- Shop config (single source of truth) ---
// TODO: drive ordersOpen from the real drop schedule (Thursday 9am open).
var SB = {
  ordersOpen: true,
  orderMin: 12,      // minimum order total ($)
  deliveryMin: 35,   // minimum order total for delivery ($)
  // Stripe Payment Link for this week's drop (currently TEST mode; swap for the
  // live-mode link when Sasha's Stripe account goes live).
  paymentLink: 'https://buy.stripe.com/test_aFacN4285fsJ1Nh4r82ZO01'
};

// --- Tab shop sign: favicon flips open/sold-out on every page ---
(function () {
  var link = document.querySelector('link[rel="icon"]');
  if (!link) return;
  var name = SB.ordersOpen ? 'favicon-open.svg' : 'favicon-closed.svg';
  link.href = link.href.replace(/favicon[^\/]*\.svg/, name);
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
// The wave stays put; the text flows along it via startOffset. The text is
// exactly 14 identical phrase units, so one unit = total length / 14 and the
// wrap point is exact (no visible reset).
(function () {
  var tp = document.getElementById('mainstay-tp');
  if (!tp) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var textEl = tp.closest('text');
  var UNITS = 6;
  var unit = 600;
  var off = 0;

  function measure() {
    try {
      var total = textEl.getComputedTextLength();
      if (total > 0) unit = total / UNITS;
    } catch (e) {}
  }
  measure();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      measure();
      off = -((-off) % unit); // stay seamless after the real font swaps in
    });
  }

  // Safari lays out text-on-path slower than Blink; halve its update rate.
  var isSafari = /Safari/.test(navigator.userAgent) && !/Chrom/.test(navigator.userAgent);
  var minFrameMs = isSafari ? 30 : 0;

  var last = performance.now();
  var lastPaint = 0;
  function step(now) {
    off -= (now - last) * 0.045;
    last = now;
    while (off <= -unit) off += unit;
    if (now - lastPaint >= minFrameMs) {
      tp.setAttribute('startOffset', off);
      lastPaint = now;
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
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

  var sign = document.getElementById('status-sign');
  if (sign) {
    sign.classList.toggle('is-closed', !SB.ordersOpen);
    sign.querySelector('.flip-sign-word').textContent = SB.ordersOpen ? 'Open' : 'Sold out';
    sign.querySelector('.flip-sign-sub').textContent = SB.ordersOpen
      ? 'orders are open'
      : 'orders open Thursday 9am';
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
      : 'Pickup Saturday 9am to noon, SE Portland. Delivery over ' + money(SB.deliveryMin) + '.';
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
