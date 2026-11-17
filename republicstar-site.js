/* ═══════════════════════════════════════════════════
   REPUBLICSTAR SITE  –  shared UI for all pages
   Static site: no accounts, no database, no external requests.
   Theme, cookie banner, mobile menu, footer.
═══════════════════════════════════════════════════ */

/* ── Resolve base URL (works from any subfolder) ── */
var _republicstarRawBase = (document.currentScript ? document.currentScript.src.replace(/[^\/]*$/, '') : '');
var _republicstarBase = /^[a-zA-Z0-9\/\.\_\-\%\:\?]+$/.test(_republicstarRawBase) ? _republicstarRawBase : '';

function _republicstarEscapeHTML(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

(function(w){

  /* ── 1. Storage helpers (theme + cookie preference only) ── */
  var PFX = 'republicstar_ck_';
  var ck = {
    set: function(name, value, days){
      var entry = {v: value};
      if (days) entry.e = Date.now() + days * 864e5;
      try { localStorage.setItem(PFX+name, JSON.stringify(entry)); } catch(e){}
    },
    get: function(name){
      try {
        var raw = localStorage.getItem(PFX+name);
        if (!raw) return null;
        var entry = JSON.parse(raw);
        if (entry.e && Date.now() > entry.e) { localStorage.removeItem(PFX+name); return null; }
        return entry.v;
      } catch(e){ return null; }
    }
  };

  /* Clean up data left by the old account system */
  try {
    ['republicstar_session','republicstar_user','republicstar_role'].forEach(function(k){ localStorage.removeItem(PFX+k); });
    ['republicstar_session_start','republicstar_remember','republicstar_redirect'].forEach(function(k){ localStorage.removeItem(k); });
  } catch(e){}

  /* Kept as no-op so older inline page scripts don't break */
  w.republicstarUpdateNav = function(){};

  /* ── 2. Cookie banner ── */
  w.republicstarCookieBanner = function(){
    if (!ck.get('republicstar_cookie_pref')){
      var banner = document.getElementById('cookieBanner');
      if (banner) banner.style.display = 'block';
    }
  };
  w.setCookiePref = function(pref){
    ck.set('republicstar_cookie_pref', pref,                     365);
    ck.set('republicstar_cookie_date', new Date().toISOString(), 365);
    var banner = document.getElementById('cookieBanner');
    if (banner) banner.style.display = 'none';
  };

  /* ── 3. CSS + favicon injection ── */
  function addLink(rel, href, type){
    var l = document.createElement('link');
    l.rel = rel; l.href = href; if (type) l.type = type;
    document.head.appendChild(l);
  }
  addLink('stylesheet', _republicstarBase + 'republicstar-mobile.css');
  addLink('stylesheet', _republicstarBase + 'republicstar-theme.css');
  addLink('icon', _republicstarBase + 'svgs/icone/republica/favicon.svg', 'image/svg+xml');

  /* ── 4. Theme system ── */
  (function(){
    var LS_KEY = 'republicstar_theme';
    var html   = document.documentElement;

    /* Pages in these folders are light by default; everything else is dark */
    function getPageDefaultTheme() {
      return /\/(services|gov)\//.test(window.location.pathname) ? 'light' : 'dark';
    }

    var _lockedTheme = html.getAttribute('data-theme-lock') || null;

    function applyTheme(t) {
      html.setAttribute('data-theme', _lockedTheme || t);
      if (!_lockedTheme) { try { localStorage.setItem(LS_KEY, t); } catch(e){} }
    }

    var stored = null;
    try { stored = localStorage.getItem(LS_KEY); } catch(e){}
    applyTheme(stored === 'light' || stored === 'dark' ? stored : getPageDefaultTheme());

    function _themeIcon() {
      var isDark = html.getAttribute('data-theme') === 'dark';
      return isDark
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }
    w._republicstarThemeIcon = _themeIcon;

    w.republicstarToggleTheme = function() {
      if (_lockedTheme) return;
      applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
      var btn = document.getElementById('republicstarThemeToggle');
      if (btn) btn.innerHTML = _themeIcon();
    };

    document.addEventListener('DOMContentLoaded', function() {
      if (_lockedTheme) return;
      var btn = document.createElement('button');
      btn.id = 'republicstarThemeToggle';
      btn.setAttribute('aria-label', 'Toggle theme');
      btn.innerHTML = _themeIcon();
      btn.addEventListener('click', w.republicstarToggleTheme);
      document.body.appendChild(btn);
    });
  })();

  /* ── 5. Mobile nav — hamburger menu ── */
  w.republicstarMobileNav = function(){
    if (window.innerWidth > 768) return;
    var header = document.querySelector('header');
    var nav    = document.querySelector('header nav');
    if (!header || !nav) return;
    nav.style.display = 'none';
    if (header.querySelector('#_republicstarMobileNavWidget')) return;

    var group = document.createElement('div');
    group.id = '_republicstarMobileNavWidget';
    group.style.cssText = 'display:flex;align-items:center;gap:0.4rem;';
    header.appendChild(group);

    var hamburger = document.createElement('button');
    hamburger.setAttribute('aria-label', 'Open menu');
    hamburger.style.cssText = 'background:none;border:1.5px solid rgba(255,255,255,0.2);cursor:pointer;'
      + 'display:flex;flex-direction:column;justify-content:center;align-items:center;'
      + 'gap:4px;padding:0.4rem;width:34px;height:34px;flex-shrink:0;'
      + 'transition:border-color 0.2s;';

    var bars = [document.createElement('span'), document.createElement('span'), document.createElement('span')];
    bars.forEach(function(b){
      b.style.cssText = 'display:block;width:16px;height:1.5px;transition:transform 0.25s,opacity 0.25s;';
      hamburger.appendChild(b);
    });

    function updateBarColors(){
      var light = document.documentElement.dataset.theme === 'light';
      bars.forEach(function(b){ b.style.background = light ? '#0a0a0a' : '#ffffff'; });
      hamburger.style.borderColor = light ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)';
    }
    updateBarColors();
    new MutationObserver(updateBarColors).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
    group.appendChild(hamburger);

    function setBarsOpen(open){
      if (open) {
        bars[0].style.transform = 'translateY(5.5px) rotate(45deg)';
        bars[1].style.opacity   = '0';
        bars[1].style.transform = 'scaleX(0)';
        bars[2].style.transform = 'translateY(-5.5px) rotate(-45deg)';
        hamburger.style.borderColor = 'rgba(200,16,46,0.5)';
      } else {
        bars[0].style.transform = 'none';
        bars[1].style.opacity   = '1';
        bars[1].style.transform = 'none';
        bars[2].style.transform = 'none';
        updateBarColors();
      }
    }

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;left:0;right:0;top:0;bottom:0;z-index:99999;background:#080808;'
      + 'display:flex;flex-direction:column;overflow-y:auto;'
      + 'opacity:0;pointer-events:none;transition:opacity 0.22s;';

    var overlayHeader = document.createElement('div');
    overlayHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;'
      + 'padding:0 1.5rem;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.07);';
    var overlayLogo = document.createElement('span');
    overlayLogo.style.cssText = 'font-family:var(--font-sub);font-size:0.6rem;letter-spacing:0.18em;'
      + 'text-transform:uppercase;color:rgba(255,255,255,0.3);';
    overlayLogo.textContent = 'United Republic of Stars';
    var overlayClose = document.createElement('button');
    overlayClose.setAttribute('aria-label', 'Close menu');
    overlayClose.style.cssText = 'background:none;border:none;color:rgba(255,255,255,0.5);'
      + 'font-size:1.4rem;cursor:pointer;padding:0.5rem;line-height:1;transition:color 0.15s;';
    overlayClose.textContent = '×';
    overlayHeader.appendChild(overlayLogo);
    overlayHeader.appendChild(overlayClose);
    overlay.appendChild(overlayHeader);

    var linksWrap = document.createElement('div');
    linksWrap.style.cssText = 'flex:1;display:flex;flex-direction:column;padding:1.5rem 2rem 2rem;';
    nav.querySelectorAll('a').forEach(function(a){
      if (a.classList.contains('nav-cta')) return;
      var clone = document.createElement('a');
      clone.href = a.href;
      clone.textContent = a.textContent.trim();
      clone.setAttribute('style', 'color:rgba(255,255,255,0.8) !important;text-decoration:none !important;'
        + 'font-family:var(--font-head);font-size:1.5rem;letter-spacing:0.06em;'
        + 'text-transform:uppercase;padding:0.8rem 0;border-bottom:1px solid rgba(255,255,255,0.06);');
      clone.addEventListener('click', function(){ closeMenu(); });
      linksWrap.appendChild(clone);
    });
    overlay.appendChild(linksWrap);
    document.body.appendChild(overlay);

    function openMenu(){
      var hh = header.offsetHeight;
      overlayHeader.style.height    = hh + 'px';
      overlayHeader.style.minHeight = hh + 'px';
      overlay.style.opacity       = '1';
      overlay.style.pointerEvents = 'auto';
      document.documentElement.style.overflow = 'hidden';
      setBarsOpen(true);
      hamburger.setAttribute('aria-label', 'Close menu');
    }
    function closeMenu(){
      overlay.style.opacity       = '0';
      overlay.style.pointerEvents = 'none';
      document.documentElement.style.overflow = '';
      setBarsOpen(false);
      hamburger.setAttribute('aria-label', 'Open menu');
    }

    hamburger.addEventListener('click', function(){
      if (overlay.style.opacity === '1') closeMenu(); else openMenu();
    });
    overlayClose.addEventListener('click', closeMenu);
  };

  /* ── 6. Full footer injection ──
     Pages with minimal footers get the same full grid footer as the homepage.
     Pages that already have a .footer-grid are left untouched. mobile.html is excluded. */
  w.republicstarInjectFooter = function() {
    var page = window.location.pathname.split('/').pop() || '';
    if (page === 'mobile.html') return;
    var footer = document.querySelector('footer');
    if (!footer) return;
    if (footer.querySelector('.footer-grid')) return;
    var safeB = _republicstarEscapeHTML(_republicstarBase);
    footer.innerHTML =
      '<div class="footer-grid">'
      + '<div class="footer-brand">'
      +   '<img src="' + safeB + 'svgs/icone/republica/1.svg" width="78" style="display:block;" alt="United Republic of Stars — Official Emblem">'
      +   '<p>The Official Portal of the United Republic of Stars. All government information, services and legislation accessible to every citizen.</p>'
      +   '<p style="font-size:0.7rem;color:rgba(255,255,255,0.2);letter-spacing:0.08em;text-transform:uppercase;">&copy; 2026 United Republic of Stars. All Rights Reserved.</p>'
      + '</div>'
      + '<div class="footer-col"><h5>Government</h5><ul>'
      +   '<li><a href="' + safeB + 'gov/government.html">Office of the President</a></li>'
      +   '<li><a href="' + safeB + 'gov/national-assembly.html">National Assembly</a></li>'
      +   '<li><a href="' + safeB + 'gov/supreme-court.html">Supreme Court</a></li>'
      +   '<li><a href="' + safeB + 'gov/ministries.html">Cabinet of Ministers</a></li>'
      +   '<li><a href="' + safeB + 'gov/official-gazette.html">Official Gazette</a></li>'
      + '</ul></div>'
      + '<div class="footer-col"><h5>Citizen Services</h5><ul>'
      +   '<li><a href="' + safeB + 'services/service-digital-id.html">National ID Portal</a></li>'
      +   '<li><a href="' + safeB + 'services/service-taxes.html">Tax Authority</a></li>'
      +   '<li><a href="' + safeB + 'services/service-civil-registration.html">Civil Registry</a></li>'
      +   '<li><a href="' + safeB + 'services/service-health.html">Health Services</a></li>'
      +   '<li><a href="' + safeB + 'services/service-education.html">Education Portal</a></li>'
      + '</ul></div>'
      + '<div class="footer-col"><h5>Information</h5><ul>'
      +   '<li><a href="' + safeB + 'GOVERN_1.HTM">About the Republic</a></li>'
      +   '<li><a href="' + safeB + 'gov/constitution.html">Constitution</a></li>'
      +   '<li><a href="' + safeB + 'gov/laws-decrees.html">Laws &amp; Decrees</a></li>'
      +   '<li><a href="' + safeB + 'gov/open-data.html">Open Data</a></li>'
      +   '<li><a href="' + safeB + 'gov/contact.html">Contact Government</a></li>'
      + '</ul></div>'
      + '</div>'
      + '<div class="footer-bottom">'
      +   '<span>United Republic of Stars &nbsp;&middot;&nbsp; Est. MMXII &nbsp;&middot;&nbsp; Official Government Website</span>'
      +   '<div style="display:flex;gap:1.5rem;">'
      +     '<a href="#">Privacy Policy</a>'
      +     '<a href="#">Accessibility</a>'
      +     '<a href="#">Terms of Use</a>'
      +   '</div>'
      + '</div>';
  };

  /* ── 7. Auto-init on DOM ready ── */
  document.addEventListener('DOMContentLoaded', function(){
    w.republicstarCookieBanner();
    w.republicstarMobileNav();
    w.republicstarInjectFooter();
  });

})(window);
