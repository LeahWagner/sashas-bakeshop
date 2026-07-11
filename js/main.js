/* sasha's bakeshop — shared scripts */

// --- Shop config (single source of truth) ---
// TODO: drive ordersOpen from the real drop schedule (Thursday 9am open).
// Minimums are placeholder values; Sasha, set these to whatever you want.
var SB = {
  ordersOpen: true,
  orderMin: 12,      // minimum order total, any fulfillment ($)
  deliveryMin: 35,   // minimum order total for delivery ($)
  // Stripe Payment Link for this week's drop (currently TEST mode; swap for the
  // live-mode link when Sasha's Stripe account goes live).
  paymentLink: 'https://buy.stripe.com/test_6oU8wOaEBcgxfE78Ho2ZO00'
};

// --- Tab shop sign: favicon flips open/closed on every page ---
(function () {
  var link = document.querySelector('link[rel="icon"]');
  if (!link) return;
  var name = SB.ordersOpen ? 'favicon-open.svg' : 'favicon-closed.svg';
  link.href = link.href.replace(/favicon[^\/]*\.svg/, name);
})();

// --- Mainstays squiggle marquee (home) ---
// Text-on-path flows leftward, seamless loop by wrapping one phrase repetition.
(function () {
  var tp = document.getElementById('mainstay-tp');
  if (!tp) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var textEl = tp.closest('text');
  var unitChars = 20; // "The mainstays␣␣␣✶␣␣␣"
  var unit = 400;
  function measure() {
    try { unit = textEl.getSubStringLength(0, unitChars); } catch (e) {}
  }
  measure();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  var off = 0;
  var last = performance.now();
  function step(now) {
    off -= (now - last) * 0.045;
    last = now;
    if (off <= -unit) off += unit;
    tp.setAttribute('startOffset', off);
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
})();

// --- "Never miss a bake" newsletter signup ---
// TODO: wire to a real SMS/email marketing backend (Mailchimp, Klaviyo, Postscript).
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

// --- Preorder: flip sign, steppers, stock labels, minimums, cart handoff ---
(function () {
  var grid = document.querySelector('.order-grid');
  if (!grid) return;

  var sign = document.getElementById('status-sign');
  if (sign) {
    sign.classList.toggle('is-closed', !SB.ordersOpen);
    sign.querySelector('.flip-sign-word').textContent = SB.ordersOpen ? 'Open' : 'Closed';
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
      name: card.querySelector('h3').textContent,
      priceLabel: card.querySelector('.order-price').textContent,
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
    checkoutBtn.textContent = SB.ordersOpen ? 'Check out' : 'Orders closed';
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
    var cart = items
      .filter(function (it) { return it.qty > 0; })
      .map(function (it) {
        return { name: it.name, priceLabel: it.priceLabel, price: it.price, qty: it.qty };
      });
    localStorage.setItem('sb-cart', JSON.stringify(cart));
    // Card payment happens on Stripe's hosted page (quantities are confirmed there).
    // The email-order path lives at checkout.html, linked from the fine print.
    window.location.href = SB.paymentLink;
  });

  render();
})();

// --- Checkout page ---
(function () {
  var page = document.getElementById('checkout-page');
  if (!page) return;

  var cart = [];
  try { cart = JSON.parse(localStorage.getItem('sb-cart') || '[]'); } catch (e) {}

  var emptyEl = document.getElementById('checkout-empty');
  var gridEl = document.querySelector('.checkout-grid');
  if (!cart.length) {
    emptyEl.classList.remove('hidden');
    gridEl.classList.add('hidden');
    return;
  }

  function money(n) {
    return '$' + n.toFixed(2).replace(/\.00$/, '');
  }

  var total = cart.reduce(function (sum, it) { return sum + it.price * it.qty; }, 0);
  var lines = document.getElementById('summary-lines');
  cart.forEach(function (it) {
    var row = document.createElement('div');
    row.className = 'summary-line';
    var label = document.createElement('span');
    label.textContent = it.qty + ' × ' + it.name;
    var amt = document.createElement('span');
    amt.textContent = money(it.price * it.qty);
    row.appendChild(label);
    row.appendChild(amt);
    lines.appendChild(row);
  });
  document.getElementById('summary-total').textContent = money(total);

  var addressWrap = document.getElementById('address-wrap');
  var notice = document.getElementById('form-notice');
  var placeBtn = document.getElementById('place-order');

  function fulfillment() {
    var checked = document.querySelector('input[name="fulfillment"]:checked');
    return checked ? checked.value : 'pickup';
  }

  function validateFulfillment() {
    var isDelivery = fulfillment() === 'delivery';
    addressWrap.classList.toggle('hidden', !isDelivery);
    if (isDelivery && total < SB.deliveryMin) {
      notice.textContent = 'Delivery needs a ' + money(SB.deliveryMin) + ' minimum. Your box is ' +
        money(total) + '. Add more treats or switch to pickup.';
      placeBtn.setAttribute('disabled', '');
    } else {
      notice.textContent = '';
      placeBtn.removeAttribute('disabled');
    }
  }

  document.querySelectorAll('input[name="fulfillment"]').forEach(function (radio) {
    radio.addEventListener('change', validateFulfillment);
  });
  validateFulfillment();

  document.getElementById('checkout-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('co-name').value.trim();
    var email = document.getElementById('co-email').value.trim();
    var phone = document.getElementById('co-phone').value.trim();
    var address = document.getElementById('co-address').value.trim();
    var notes = document.getElementById('co-notes').value.trim();
    var isDelivery = fulfillment() === 'delivery';
    if (isDelivery && !address) {
      notice.textContent = 'Add a delivery address (SE Portland).';
      return;
    }

    // TODO: replace mailto with a real order backend + Stripe checkout.
    var body = 'ORDER\n' + cart.map(function (it) {
      return it.qty + ' x ' + it.name + ' (' + money(it.price * it.qty) + ')';
    }).join('\n') +
    '\nTotal: ' + money(total) +
    '\n\nFulfillment: ' + (isDelivery ? 'Delivery to: ' + address : 'Porch pickup, Saturday 9am to noon') +
    '\nName: ' + name +
    '\nEmail: ' + email +
    (phone ? '\nPhone: ' + phone : '') +
    (notes ? '\nNotes: ' + notes : '');

    window.location.href = 'mailto:info@sashasbakeshop.com?subject=' +
      encodeURIComponent('Preorder: ' + name) + '&body=' + encodeURIComponent(body);

    document.getElementById('checkout-main').classList.add('hidden');
    document.getElementById('order-confirm').classList.remove('hidden');
  });
})();
