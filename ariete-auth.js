/* ═══════════════════════════════════════════════════
   ARIETE AUTH  –  shared across all pages
   Storage: localStorage with expiry wrapper
═══════════════════════════════════════════════════ */
(function(w){

  /* ── 1. Storage helpers ── */
  var PFX = 'ariete_ck_';
  var ck = {
    set: function(name, value, days, sessionOnly){
      var entry = {v: value};
      if (!sessionOnly && days) entry.e = Date.now() + days * 864e5;
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
    },
    del: function(name){ try { localStorage.removeItem(PFX+name); } catch(e){} }
  };
  w.arieteCookie = ck;

  /* ── 2. Session API ── */
  var ADMIN_ID   = 'ilcreatore';
  var ADMIN_PASS = '12345678';

  var session = {
    ADMIN_ID:   ADMIN_ID,
    ADMIN_PASS: ADMIN_PASS,

    get: function(){
      var s = ck.get('ariete_session');
      var u = ck.get('ariete_user');
      var r = ck.get('ariete_role');
      if (!s || !u) return null;
      return {session: s, user: u, role: r || 'citizen'};
    },

    set: function(userId, role, rememberDays){
      var days   = rememberDays || 0;
      var isSess = (days === 0);
      ck.set('ariete_session', '1',    days, isSess);
      ck.set('ariete_user',    userId, days, isSess);
      ck.set('ariete_role',    role,   days, isSess);
      localStorage.setItem('ariete_session_start', Date.now().toString());
    },

    clear: function(){
      ck.del('ariete_session');
      ck.del('ariete_user');
      ck.del('ariete_role');
      localStorage.removeItem('ariete_session_start');
      localStorage.removeItem('ariete_remember');
    },

    isAdmin: function(){
      var s = session.get();
      return s && s.user === ADMIN_ID;
    },

    requireLogin: function(){
      if (!session.get()){
        localStorage.setItem('ariete_redirect', window.location.href);
        window.location.replace('citizen-login.html');
        return false;
      }
      return true;
    },

    requireAdmin: function(){
      var s = session.get();
      if (!s || s.user !== ADMIN_ID){ window.location.replace('citizen-login.html'); return false; }
      return true;
    },

    logout: function(){
      session.clear();
      window.location.href = 'citizen-login.html';
    }
  };
  w.arieteSession = session;

  /* ── 3. Nav dropdown ── */
  w.arieteUpdateNav = function(){
    var s   = session.get();
    var cta = document.querySelector('.nav-cta');
    if (!cta) return;

    if (!s) {
      cta.textContent = 'Citizen Login';
      cta.href        = 'citizen-login.html';
      cta.onclick     = null;
      return;
    }

    var isAdmin = (s.user === ADMIN_ID);
    var label   = isAdmin ? 'ADMIN' : s.user.substring(0, 10).toUpperCase();

    /* wrapper */
    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;display:inline-block;';

    /* trigger button */
    var btn = document.createElement('button');
    btn.style.cssText = 'background:var(--red);color:#fff;border:none;font-family:var(--font-sub);font-size:0.65rem;letter-spacing:0.15em;text-transform:uppercase;padding:0.5rem 1.1rem;cursor:pointer;display:flex;align-items:center;gap:0.45rem;';
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>'
                  + label
                  + ' <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';
    btn.onclick = function(e){ e.preventDefault(); };

    /* dropdown menu */
    var menu = document.createElement('div');
    menu.id = 'arieteProfileMenu';
    menu.style.cssText = 'display:none;position:absolute;right:0;top:calc(100% + 6px);'
      + 'background:#141414;border:1px solid rgba(255,255,255,0.1);border-top:2px solid #c8102e;'
      + 'min-width:190px;z-index:9999;box-shadow:0 8px 28px rgba(0,0,0,0.6);'
      + 'opacity:0;transform:translateY(-8px);'
      + 'transition:opacity 0.25s ease,transform 0.25s ease;pointer-events:none;';

    /* helper */
    function menuItem(icon, text, href, action, danger){
      var el = document.createElement(href ? 'a' : 'button');
      if (href) el.href = href;
      el.style.cssText = 'display:flex;align-items:center;gap:0.7rem;padding:0.78rem 1rem;width:100%;'
        + 'text-align:left;background:none;border:none;'
        + 'border-bottom:1px solid rgba(255,255,255,0.06);'
        + 'color:' + (danger ? '#c8102e' : 'rgba(255,255,255,0.8)') + ';'
        + 'font-family:var(--font-body);font-size:0.82rem;cursor:pointer;'
        + 'text-decoration:none;transition:background 0.15s;';
      el.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + icon + '</svg>' + text;
      el.onmouseover = function(){ this.style.background = 'rgba(200,16,46,0.12)'; };
      el.onmouseout  = function(){ this.style.background = 'none'; };
      if (action) el.onclick = action;
      return el;
    }

    /* header row */
    var header = document.createElement('div');
    header.style.cssText = 'padding:0.7rem 1rem;border-bottom:1px solid rgba(255,255,255,0.1);';
    header.innerHTML = '<div style="font-family:var(--font-sub);font-size:0.58rem;letter-spacing:0.12em;color:#c8102e;text-transform:uppercase;margin-bottom:2px;">'
      + (isAdmin ? 'Supreme Administrator' : 'Citizen')
      + '</div><div style="font-size:0.78rem;color:rgba(255,255,255,0.7);font-family:var(--font-body);">' + s.user + '</div>';
    menu.appendChild(header);

    if (isAdmin){
      menu.appendChild(menuItem('<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
        'Admin Panel', 'admin.html', null, false));
    }
    menu.appendChild(menuItem('<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>',
      'Profile', '#', function(e){ e.preventDefault(); alert('Profile — coming soon.'); }, false));
    menu.appendChild(menuItem('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
      'Settings', 'settings.html', null, false));
    menu.appendChild(menuItem('<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      'Support', '#', function(e){ e.preventDefault(); alert('Support — coming soon.'); }, false));
    menu.appendChild(menuItem('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
      'Logout', '#', function(e){ e.preventDefault(); session.logout(); }, true));

    wrapper.appendChild(btn);
    wrapper.appendChild(menu);

    /* hover with open/close delay */
    var _closeTimer = null;
    wrapper.onmouseenter = function(){
      clearTimeout(_closeTimer);
      menu.style.display       = 'block';
      /* force reflow so transition fires */
      void menu.offsetWidth;
      menu.style.opacity       = '1';
      menu.style.transform     = 'translateY(0)';
      menu.style.pointerEvents = 'auto';
    };
    wrapper.onmouseleave = function(){
      _closeTimer = setTimeout(function(){
        menu.style.opacity       = '0';
        menu.style.transform     = 'translateY(-8px)';
        menu.style.pointerEvents = 'none';
        setTimeout(function(){ menu.style.display = 'none'; }, 260);
      }, 220);
    };

    cta.parentNode.replaceChild(wrapper, cta);
  };

  /* ── 4. Cookie banner ── */
  w.arieteCookieBanner = function(){
    if (!ck.get('ariete_cookie_pref')){
      var banner = document.getElementById('cookieBanner');
      if (banner) banner.style.display = 'block';
    }
  };
  w.setCookiePref = function(pref){
    ck.set('ariete_cookie_pref', pref,                     365);
    ck.set('ariete_cookie_date', new Date().toISOString(), 365);
    var banner = document.getElementById('cookieBanner');
    if (banner) banner.style.display = 'none';
  };

  /* ── 5. Mobile CSS injection ── */
  (function(){
    var link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = 'ariete-mobile.css';
    document.head.appendChild(link);
  })();

  /* ── 6. Mobile hamburger menu ── */
  w.arieteMobileNav = function(){
    var header = document.querySelector('header');
    var nav    = document.querySelector('header nav');
    if (!header || !nav) return;

    var btn = document.createElement('button');
    btn.id = 'arieteHamburger';
    btn.setAttribute('aria-label', 'Menu');
    btn.innerHTML = '<span></span><span></span><span></span>';
    header.appendChild(btn);

    var overlay = document.createElement('div');
    overlay.id = 'arieteMobileMenu';

    var links = nav.querySelectorAll('a');
    links.forEach(function(a){
      var clone = document.createElement('a');
      clone.href = a.href;
      clone.textContent = a.textContent.trim();
      if (a.classList.contains('nav-cta')) clone.className = 'mobile-cta';
      overlay.appendChild(clone);
    });

    overlay.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ closeMenu(); });
    });

    document.body.appendChild(overlay);

    function openMenu(){
      btn.classList.add('open');
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeMenu(){
      btn.classList.remove('open');
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    btn.addEventListener('click', function(){
      btn.classList.contains('open') ? closeMenu() : openMenu();
    });
  };

  /* ── 7. Auto-init on DOM ready ── */
  document.addEventListener('DOMContentLoaded', function(){
    /* Suspended account guard — redirect any logged-in suspended user */
    (function(){
      var EXEMPT = ['suspended.html','citizen-login.html','guest-register.html','register.html','index.html'];
      var page   = window.location.pathname.split('/').pop() || 'index.html';
      if (EXEMPT.indexOf(page) !== -1) return;
      var s = session.get();
      if (!s) return;
      var users = JSON.parse(localStorage.getItem('ariete_users') || '[]');
      var user  = users.find(function(u){ return u.id === s.user; });
      if (user && user.status === 'suspended') {
        window.location.replace('suspended.html');
        return;
      }
      /* Pending approval banner */
      if (user && user.status === 'pending') {
        var banner = document.createElement('div');
        banner.id = 'arietePendingBanner';
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;'
          + 'background:#7a4f00;border-bottom:2px solid #f5a623;'
          + 'color:#ffd98c;font-family:sans-serif;font-size:0.78rem;'
          + 'display:flex;align-items:center;justify-content:center;gap:0.8rem;'
          + 'padding:0.55rem 1.2rem;text-align:center;';
        banner.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f5a623" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
          + '<span><strong>Account pending approval</strong> — Access to citizen services is limited until the Civil Registry approves your account.'
          + ' <a href="settings.html" style="color:#f5a623;font-weight:600;text-decoration:underline;">View Status</a></span>'
          + '<button onclick="document.getElementById(\'arietePendingBanner\').remove()" '
          + 'style="background:none;border:none;color:#ffd98c;font-size:1rem;cursor:pointer;padding:0 0.3rem;line-height:1;" '
          + 'title="Dismiss">×</button>';
        document.body.insertBefore(banner, document.body.firstChild);
        /* push page content down so banner doesn't overlap */
        document.body.style.paddingTop = (document.body.style.paddingTop
          ? (parseFloat(document.body.style.paddingTop) + 38) : 38) + 'px';
      }
    })();

    w.arieteUpdateNav();
    w.arieteCookieBanner();
    w.arieteMobileNav();
  });

})(window);
