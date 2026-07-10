/* Sasha's Bakeshop — shared scripts */

// --- Mobile nav toggle ---
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
})();

// --- Simple client-side form handling (placeholder; wire to a backend later) ---
(function () {
  var forms = document.querySelectorAll('form[data-form]');
  forms.forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = form.querySelector('.form-status');
      // TODO: replace with real submission (email service / order backend).
      if (status) {
        status.textContent = "Thanks! Your message has been noted — we'll be in touch soon.";
        status.style.color = 'var(--color-accent)';
      }
      form.reset();
    });
  });
})();
