/* ALPHADEK Instruments — mobile menu, footer year, "replay intro" link. */
(function () {
  var toggle = document.querySelector('.nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.querySelectorAll('.nav a').forEach(function (a) {
      a.addEventListener('click', function () { document.body.classList.remove('nav-open'); toggle.setAttribute('aria-expanded', 'false'); });
    });
    addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) { document.body.classList.remove('nav-open'); toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); }
    });
  }
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
  var replay = document.querySelector('[data-replay-intro]');
  if (replay) replay.addEventListener('click', function () { location.href = replay.getAttribute('data-replay-intro') + '?intro'; });
})();
