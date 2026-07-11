/* Sasha's Bakeshop — shared scripts */

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

// --- "Never miss a bake" signup (home) ---
// TODO: wire to a real SMS/email marketing backend (Mailchimp, Klaviyo, Postscript).
(function () {
  var form = document.querySelector('.signup-form');
  if (!form) return;
  var button = form.querySelector('button');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var original = button.textContent;
    button.textContent = 'Coming soon!';
    setTimeout(function () { button.textContent = original; }, 2500);
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

// --- Preorder: quantity steppers, stock labels, cart totals ---
// Stock caps are per-item; checkout is a stub until real ordering is wired up.
(function () {
  var grid = document.querySelector('.order-grid');
  if (!grid) return;

  var ORDERS_OPEN = true; // TODO: drive from real drop schedule
  var chip = document.getElementById('status-chip');
  if (chip) chip.textContent = ORDERS_OPEN ? '✶ Orders open' : 'Opens Thursday 9am';

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.order-card'));
  var cartLabel = document.getElementById('cart-label');
  var cartSub = document.getElementById('cart-sub');
  var cartTotal = document.getElementById('cart-total');
  var checkoutBtn = document.getElementById('checkout');
  var checkedOut = false;

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

  function render() {
    var count = 0;
    var total = 0;
    items.forEach(function (it) {
      var left = it.stock - it.qty;
      it.qtyEl.textContent = it.qty;
      it.stockEl.textContent =
        left <= 0 ? 'Sold out for you!' :
        left <= 4 ? 'Only ' + left + ' left!' :
        left + ' left';
      it.stockEl.classList.toggle('is-low', left <= 4);
      count += it.qty;
      total += it.qty * it.price;
    });
    cartLabel.textContent = count === 0
      ? 'Your box is empty'
      : 'Your box · ' + count + (count === 1 ? ' treat' : ' treats');
    cartSub.textContent = count === 0
      ? 'Add something little (or a lot).'
      : 'Pickup Saturday 9am to noon, SE Portland.';
    cartTotal.textContent = '$' + total.toFixed(2).replace(/\.00$/, '');
    checkoutBtn.textContent = checkedOut ? 'Yum! (demo)' : 'Check out';
  }

  items.forEach(function (it) {
    it.plusBtn.addEventListener('click', function () {
      if (it.qty < it.stock) { it.qty++; checkedOut = false; render(); }
    });
    it.minusBtn.addEventListener('click', function () {
      if (it.qty > 0) { it.qty--; checkedOut = false; render(); }
    });
  });

  checkoutBtn.addEventListener('click', function () {
    // TODO: replace stub with real checkout (Hotplate link or custom cart).
    var count = items.reduce(function (a, it) { return a + it.qty; }, 0);
    if (count > 0) { checkedOut = true; render(); }
  });

  render();
})();
