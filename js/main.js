/* sasha's bakeshop — shared scripts */

// --- Shop config (single source of truth) ---
// TODO: drive ordersOpen from the real drop schedule (Thursday 9am open).
var SB = {
  ordersOpen: true,
  orderMin: 12,      // minimum order total ($)
  deliveryMin: 35,   // minimum order total for delivery ($)
  // Stripe Payment Link for this week's drop (currently TEST mode; swap for the
  // live-mode link when Sasha's Stripe account goes live).
  paymentLink: 'https://buy.stripe.com/test_6oU8wOaEBcgxfE78Ho2ZO00'
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
  sign.textContent = SB.ordersOpen ? 'Open' : 'Sold out';
  sign.setAttribute('aria-label', SB.ordersOpen ? 'Orders are open' : 'Sold out, orders open Thursday');
  brand.after(sign);
})();

// --- Mainstays squiggle marquee (home) ---
// The track (wave + text) slides 600 user units left via CSS transform, then
// loops. 600 = 3 wave periods, and we calibrate letter-spacing so one text
// phrase unit (20 chars, 14 repetitions) is exactly 600 units wide. Both wave
// and text land pixel-identical at the loop point: a perfectly clean cut.
(function () {
  var track = document.getElementById('squiggle-track');
  var tp = document.getElementById('mainstay-tp');
  if (!track || !tp) return;

  var textEl = tp.closest('text');
  var UNITS = 14;
  var TARGET = 600;      // user units per phrase unit
  var CHARS_PER_UNIT = 20;

  function calibrate() {
    try {
      var ls = 5; // starting letter-spacing from CSS
      for (var i = 0; i < 4; i++) {
        var unit = textEl.getComputedTextLength() / UNITS;
        if (Math.abs(unit - TARGET) < 0.05) break;
        ls += (TARGET - unit) / CHARS_PER_UNIT;
        textEl.style.letterSpacing = ls.toFixed(3) + 'px';
      }
    } catch (e) {}
    track.classList.add('is-animating');
  }

  // Wait for the display font so the calibration matches what renders.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(calibrate);
  else calibrate();
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
      ? "this week's bakes are live"
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
