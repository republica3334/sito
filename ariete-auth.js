/* ── Resolve base URL (works from any subfolder) ── */
var _arieteBase = (document.currentScript ? document.currentScript.src.replace(/[^\/]*$/, '') : '');

/* ── Firebase SDK (injected synchronously) ── */
document.write('<scr'+'ipt src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"><\/scr'+'ipt>');
document.write('<scr'+'ipt src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"><\/scr'+'ipt>');
document.write('<scr'+'ipt src="'+_arieteBase+'ariete-firebase.js"><\/scr'+'ipt>');

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
        window.location.replace(_arieteBase + 'auth/citizen-login.html');
        return false;
      }
      return true;
    },

    requireAdmin: function(){
      var s = session.get();
      if (!s || s.user !== ADMIN_ID){ window.location.replace(_arieteBase + 'auth/citizen-login.html'); return false; }
      return true;
    },

    isMod: function(){
      var s = session.get();
      return s && s.role === 'moderator';
    },

    requireMod: function(){
      var s = session.get();
      if (!s || (s.role !== 'moderator' && s.user !== ADMIN_ID)){
        window.location.replace(_arieteBase + 'auth/citizen-login.html'); return false;
      }
      return true;
    },

    logout: function(){
      session.clear();
      window.location.href = _arieteBase + 'auth/citizen-login.html';
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
      cta.href        = _arieteBase + 'auth/citizen-login.html';
      cta.onclick     = null;
      return;
    }

    var isAdmin = (s.user === ADMIN_ID);
    var isMod   = (s.role === 'moderator');
    var label   = isAdmin ? 'ADMIN' : isMod ? 'MOD' : s.user.substring(0, 10).toUpperCase();

    /* wrapper */
    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;display:inline-block;';

    /* trigger button */
    var btn = document.createElement('button');
    btn.style.cssText = 'background:var(--red);color:#fff;border:none;font-family:var(--font-sub);font-size:0.65rem;letter-spacing:0.15em;text-transform:uppercase;padding:0.5rem 1.1rem;cursor:pointer;display:flex;align-items:center;gap:0.45rem;';
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>'
                  + label
                  + ' <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';
    btn.onclick = function(e){
      e.preventDefault();
      e.stopPropagation();
      clearTimeout(_closeTimer);
      var isOpen = menu.style.opacity === '1';
      if (isOpen) {
        menu.style.opacity       = '0';
        menu.style.transform     = 'translateY(-8px)';
        menu.style.pointerEvents = 'none';
        setTimeout(function(){ if (menu.style.opacity === '0') menu.style.display = 'none'; }, 260);
      } else {
        menu.style.display       = 'block';
        void menu.offsetWidth;
        menu.style.opacity       = '1';
        menu.style.transform     = 'translateY(0)';
        menu.style.pointerEvents = 'auto';
      }
    };

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
    header.id = '_arieteNavHeader';
    header.style.cssText = 'padding:0.8rem 1rem;border-bottom:1px solid rgba(255,255,255,0.1);';
    var roleColor = isAdmin ? '#c8102e' : isMod ? '#7e5bff' : 'rgba(255,255,255,0.35)';
    header.innerHTML =
      '<div style="font-family:var(--font-sub);font-size:0.55rem;letter-spacing:0.14em;color:'+roleColor+';text-transform:uppercase;margin-bottom:3px;">'
      + (isAdmin ? '★ Supreme Administrator' : isMod ? '⬡ Moderator' : '◈ Citizen')
      + '</div>'
      + '<div id="_arieteNavName" style="font-size:0.85rem;font-weight:600;color:rgba(255,255,255,0.9);font-family:var(--font-body);margin-bottom:1px;">' + s.user + '</div>'
      + '<div id="_arieteNavEmail" style="font-size:0.7rem;color:rgba(255,255,255,0.3);font-family:var(--font-body);"></div>'
      + '<div id="_arieteNavStatus" style="margin-top:5px;"></div>';
    menu.appendChild(header);

    /* Load real profile data from Firestore */
    if (!isAdmin && window.arieteDB) {
      window.arieteDB.getUser(s.user).then(function(user){
        if (!user) return;
        var nameEl   = document.getElementById('_arieteNavName');
        var emailEl  = document.getElementById('_arieteNavEmail');
        var statusEl = document.getElementById('_arieteNavStatus');
        if (nameEl && user.name)  nameEl.textContent  = user.name;
        if (emailEl && user.email) emailEl.textContent = user.email;
        if (statusEl && user.status) {
          var sc = {approved:'#00b450', pending:'#f5a623', suspended:'#c8102e'};
          statusEl.innerHTML = '<span style="font-family:var(--font-sub);font-size:0.5rem;letter-spacing:0.12em;text-transform:uppercase;color:'+(sc[user.status]||'#aaa')+';border:1px solid '+(sc[user.status]||'#aaa')+'30;padding:0.1rem 0.4rem;">'+user.status+'</span>';
        }
      }).catch(function(){});
    }

    if (isAdmin){
      menu.appendChild(menuItem('<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
        'Admin Panel', _arieteBase + 'portal/admin.html', null, false));
    }
    if (isMod && !isAdmin){
      menu.appendChild(menuItem('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
        'Moderator Panel', _arieteBase + 'portal/mod.html', null, false));
    }
    menu.appendChild(menuItem('<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>',
      'Profile', '#', function(e){ e.preventDefault(); alert('Profile — coming soon.'); }, false));
    menu.appendChild(menuItem('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
      'Settings', _arieteBase + 'portal/settings.html', null, false));
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

    /* Close on outside click/tap (touch devices) */
    document.addEventListener('click', function(e){
      if (!wrapper.contains(e.target) && menu.style.opacity === '1') {
        clearTimeout(_closeTimer);
        menu.style.opacity       = '0';
        menu.style.transform     = 'translateY(-8px)';
        menu.style.pointerEvents = 'none';
        setTimeout(function(){ if (menu.style.opacity === '0') menu.style.display = 'none'; }, 260);
      }
    });

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
    link.href = _arieteBase + 'ariete-mobile.css';
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
    /* Suspended / pending check — async Firestore */
    (function(){
      var EXEMPT = ['suspended.html','citizen-login.html','guest-register.html','register.html','index.html','secret-code.html'];
      var page   = window.location.pathname.split('/').pop() || 'index.html';
      if (EXEMPT.indexOf(page) !== -1) return;
      var s = session.get();
      if (!s || s.user === 'ilcreatore') return;

      function runCheck(user){
        if (!user) return;
        /* Sync role update if changed remotely */
        if (user.role && user.role !== s.role){
          session.set(s.user, user.role, 0);
        }
        if (user.status === 'suspended'){
          window.location.replace(_arieteBase + 'auth/suspended.html');
          return;
        }
        if (user.status === 'pending'){
          var banner = document.createElement('div');
          banner.id = 'arietePendingBanner';
          banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;'
            + 'background:#7a4f00;border-bottom:2px solid #f5a623;'
            + 'color:#ffd98c;font-family:sans-serif;font-size:0.78rem;'
            + 'display:flex;align-items:center;justify-content:center;gap:0.8rem;'
            + 'padding:0.55rem 1.2rem;text-align:center;';
          banner.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f5a623" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
            + '<span><strong>Account pending approval</strong> — Access to citizen services is limited until the Civil Registry approves your account.'
            + ' <a href="' + _arieteBase + 'portal/settings.html" style="color:#f5a623;font-weight:600;text-decoration:underline;">View Status</a></span>'
            + '<button onclick="document.getElementById(\'arietePendingBanner\').remove()" '
            + 'style="background:none;border:none;color:#ffd98c;font-size:1rem;cursor:pointer;padding:0 0.3rem;line-height:1;" '
            + 'title="Dismiss">×</button>';
          document.body.insertBefore(banner, document.body.firstChild);
          document.body.style.paddingTop = (document.body.style.paddingTop
            ? (parseFloat(document.body.style.paddingTop) + 38) : 38) + 'px';
        }
      }

      if (window.arieteDB){
        window.arieteDB.getUser(s.user).then(runCheck).catch(function(){});
      } else {
        /* Retry once Firebase finishes loading */
        setTimeout(function(){
          if (window.arieteDB) window.arieteDB.getUser(s.user).then(runCheck).catch(function(){});
        }, 800);
      }
    })();

    w.arieteUpdateNav();
    w.arieteCookieBanner();
    w.arieteMobileNav();
  });


  /* ── 8. Secret Override Code ── */
  /* Trigger: type ARIETE (not inside an input) → secret modal appears.
     Correct code (SUPREMUS7734) grants temporary admin session.
     3 wrong attempts → reactor-meltdown security screen. */
  (function(){
    var _TRIGGER = 'ARIETE';
    var _SECRET  = ['S','U','P','R','E','M','U','S','7','7','3','4'].join('');
    var _MAX     = 3;
    var _fails   = 0;
    var _seq     = '';

    document.addEventListener('keydown', function(e){
      /* Shortcut: Ctrl+Shift+A always works, regardless of focus */
      if(e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'A'){
        e.preventDefault();
        _showModal();
        return;
      }
      /* Sequence ARIETE — only outside inputs */
      if(['INPUT','TEXTAREA','SELECT'].indexOf((document.activeElement||{}).tagName||'')!==-1) return;
      if(e.key.length !== 1) return;
      _seq += e.key.toUpperCase();
      if(_seq.length > _TRIGGER.length) _seq = _seq.slice(-_TRIGGER.length);
      if(_seq === _TRIGGER){ _seq = ''; _showModal(); }
    });

    /* ── Secret Modal ── */
    function _showModal(){
      if(document.getElementById('__arOverlay__')) return;
      var style = document.createElement('style');
      style.id  = '__arStyle__';
      style.textContent =
        '@keyframes _arFadeIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}'
        + '@keyframes _arShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}'
        + '@keyframes _arPulse{0%{box-shadow:0 0 0 0 rgba(200,16,46,0.6)}70%{box-shadow:0 0 0 14px rgba(200,16,46,0)}100%{box-shadow:0 0 0 0 rgba(200,16,46,0)}}';
      document.head.appendChild(style);

      var ov = document.createElement('div');
      ov.id = '__arOverlay__';
      ov.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,0.97);display:flex;align-items:center;justify-content:center;';
      ov.innerHTML =
        '<div id="__arBox__" style="background:#080808;border:2px solid #c8102e;padding:3rem 2.5rem;max-width:400px;width:90%;text-align:center;animation:_arFadeIn 0.25s ease;position:relative;">'
        +'<div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#c8102e,transparent);animation:_arPulse 2s infinite;"></div>'
        +'<div style="font-family:monospace;font-size:0.52rem;letter-spacing:0.5em;color:#c8102e;margin-bottom:1.8rem;">UNITED REPUBLIC OF STARS · CLASSIFIED</div>'
        +'<div style="font-size:2rem;margin-bottom:0.6rem;">🔐</div>'
        +'<div style="font-family:\'Oswald\',sans-serif;font-size:1.35rem;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#fff;margin-bottom:0.4rem;">OVERRIDE ACCESS</div>'
        +'<div style="font-family:monospace;font-size:0.6rem;letter-spacing:0.2em;color:rgba(255,255,255,0.25);margin-bottom:2rem;">SUPREME COMMAND · LEVEL DELTA-7</div>'
        +'<input id="__arCode__" type="password" maxlength="20" autocomplete="off" placeholder="ENTER OVERRIDE CODE"'
        +' style="width:100%;background:#111;border:1.5px solid rgba(200,16,46,0.35);color:#c8102e;font-family:monospace;font-size:0.9rem;text-align:center;padding:0.9rem;letter-spacing:0.4em;outline:none;box-sizing:border-box;margin-bottom:0.8rem;text-transform:uppercase;"'
        +' onfocus="this.style.borderColor=\'#c8102e\'" onblur="this.style.borderColor=\'rgba(200,16,46,0.35)\'">'
        +'<div id="__arErr__" style="color:#c8102e;font-family:monospace;font-size:0.65rem;letter-spacing:0.12em;margin-bottom:1rem;min-height:1em;"></div>'
        +'<button id="__arSubmit__" style="width:100%;background:#c8102e;color:#fff;border:none;font-family:\'Oswald\',sans-serif;font-size:0.72rem;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;padding:0.9rem;cursor:pointer;transition:background 0.2s;"'
        +' onmouseover="this.style.background=\'#9b0c22\'" onmouseout="this.style.background=\'#c8102e\'">AUTHENTICATE ▸</button>'
        +'<div style="margin-top:1.8rem;font-family:monospace;font-size:0.48rem;letter-spacing:0.2em;color:rgba(255,255,255,0.12);">WARNING — 3 FAILED ATTEMPTS TRIGGERS SECURITY LOCKDOWN</div>'
        +'</div>';
      document.body.appendChild(ov);

      var inp = document.getElementById('__arCode__');
      var btn = document.getElementById('__arSubmit__');
      var err = document.getElementById('__arErr__');
      setTimeout(function(){ if(inp) inp.focus(); }, 80);

      function _submit(){
        var v = (inp.value||'').toUpperCase().trim();
        if(v === _SECRET){
          /* success — grant admin session */
          inp.style.borderColor = '#00b450';
          inp.value = '✔  ACCESS GRANTED';
          if(btn) btn.disabled = true;
          setTimeout(function(){
            arieteSession.set(ADMIN_ID, 'admin', 0);
            ov.remove();
            if(document.getElementById('__arStyle__')) document.getElementById('__arStyle__').remove();
            window.location.href = _arieteBase + 'portal/admin.html';
          }, 800);
        } else {
          _fails++;
          inp.value = '';
          if(_fails >= _MAX){
            ov.remove();
            if(document.getElementById('__arStyle__')) document.getElementById('__arStyle__').remove();
            _meltdown();
          } else {
            var rem = _MAX - _fails;
            err.textContent = '⚠ AUTHENTICATION FAILED · ' + rem + ' ATTEMPT' + (rem!==1?'S':'') + ' REMAINING';
            document.getElementById('__arBox__').style.animation = 'none';
            void document.getElementById('__arBox__').offsetWidth;
            document.getElementById('__arBox__').style.animation = '_arShake 0.4s ease';
          }
        }
      }
      btn.addEventListener('click', _submit);
      inp.addEventListener('keydown', function(e){ if(e.key==='Enter') _submit(); });
      ov.addEventListener('click', function(e){ if(e.target===ov){ ov.remove(); if(document.getElementById('__arStyle__')) document.getElementById('__arStyle__').remove(); } });
    }

    /* ── Reactor Meltdown ── */
    function _meltdown(){
      var ms = document.createElement('style');
      ms.id  = '__meltStyle__';
      ms.textContent =
        '@keyframes _mFlash{0%{opacity:1}50%{opacity:0.4}100%{opacity:1}}'
        +'@keyframes _mShake{0%{transform:translate(-3px,2px)rotate(-0.3deg)}25%{transform:translate(3px,-2px)rotate(0.3deg)}50%{transform:translate(-2px,3px)rotate(-0.2deg)}75%{transform:translate(2px,-1px)rotate(0.2deg)}100%{transform:translate(-1px,2px)rotate(-0.1deg)}}'
        +'@keyframes _mPulse{0%,100%{text-shadow:0 0 20px #ff0000,0 0 40px #ff0000}50%{text-shadow:0 0 60px #ff0000,0 0 120px #ff0000,0 0 5px #fff}}'
        +'@keyframes _mScan{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}';
      document.head.appendChild(ms);

      var ov = document.createElement('div');
      ov.id = '__meltdown__';
      ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0a0000;overflow:hidden;font-family:monospace;';

      /* Red flash layer */
      var flash = document.createElement('div');
      flash.style.cssText = 'position:absolute;inset:0;background:rgba(200,0,0,0.45);animation:_mFlash 0.35s infinite;';

      /* Grid overlay */
      var grid = document.createElement('div');
      grid.style.cssText = 'position:absolute;inset:0;'
        +'background:repeating-linear-gradient(0deg,transparent,transparent 29px,rgba(255,0,0,0.06) 29px,rgba(255,0,0,0.06) 30px),'
        +'repeating-linear-gradient(90deg,transparent,transparent 29px,rgba(255,0,0,0.06) 29px,rgba(255,0,0,0.06) 30px);';

      /* Scanline sweep */
      var scan = document.createElement('div');
      scan.style.cssText = 'position:absolute;left:0;right:0;height:3px;background:rgba(255,80,80,0.3);'
        +'animation:_mScan 1.2s linear infinite;';

      /* Scanline static */
      var stat = document.createElement('div');
      stat.style.cssText = 'position:absolute;inset:0;pointer-events:none;'
        +'background:repeating-linear-gradient(0deg,rgba(0,0,0,0.18) 0,rgba(0,0,0,0.18) 1px,transparent 1px,transparent 3px);';

      /* Content wrapper — shaking */
      var wrap = document.createElement('div');
      wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:10;animation:_mShake 0.12s infinite;';

      var status_msgs = [
        'COOLANT PUMP FAILURE · PRESSURE RISING',
        'CONTAINMENT FIELD DESTABILISING',
        'CORE TEMPERATURE: 3400°C AND RISING',
        'EMERGENCY SHUTDOWN OVERRIDE FAILED',
        'ALL PERSONNEL EVACUATE IMMEDIATELY',
        'REACTOR CORE BREACH DETECTED',
        'RADIATION LEAK · SECTOR 7-GAMMA',
        'FAILSAFE SYSTEMS OFFLINE',
        'MELTDOWN SEQUENCE LOCKED IN',
        'TOTAL SYSTEM COLLAPSE IMMINENT'
      ];

      var count = 10;
      wrap.innerHTML =
        '<div style="font-size:0.55rem;letter-spacing:0.55em;color:#ff4444;margin-bottom:2.5rem;opacity:0.8;">UNITED REPUBLIC OF STARS · CLASSIFIED SYSTEMS · LEVEL DELTA-7</div>'
        +'<div style="font-size:5rem;animation:_mPulse 0.5s infinite;color:#ff0000;line-height:1;margin-bottom:0.5rem;">⚠</div>'
        +'<div style="font-size:clamp(1.5rem,4vw,2.8rem);font-weight:900;letter-spacing:0.3em;color:#fff;margin:0.5rem 0;text-shadow:0 0 20px #ff0000;">SECURITY BREACH</div>'
        +'<div style="font-size:0.75rem;letter-spacing:0.4em;color:#ff6666;margin-bottom:0.4rem;">UNAUTHORIZED OVERRIDE ATTEMPT DETECTED</div>'
        +'<div style="font-size:0.65rem;letter-spacing:0.3em;color:#ff3333;margin-bottom:2.5rem;opacity:0.8;">NUCLEAR CONTAINMENT PROTOCOL INITIATED</div>'
        +'<div style="border:2px solid #ff0000;box-shadow:0 0 30px rgba(255,0,0,0.4),inset 0 0 30px rgba(255,0,0,0.05);padding:1.5rem 3.5rem;margin-bottom:2rem;">'
        +  '<div style="font-size:0.55rem;letter-spacing:0.35em;color:#ff5555;margin-bottom:0.4rem;">REACTOR CORE DESTABILISING IN</div>'
        +  '<div id="__meltCount__" style="font-size:4.5rem;font-weight:900;color:#ff0000;line-height:1;text-shadow:0 0 40px #ff0000;">10</div>'
        +  '<div style="font-size:0.55rem;letter-spacing:0.35em;color:#ff5555;margin-top:0.3rem;">SECONDS</div>'
        +'</div>'
        +'<div id="__meltStatus__" style="font-size:0.65rem;letter-spacing:0.25em;color:#ff4444;margin-bottom:2.5rem;opacity:0.9;">INITIALISING CONTAINMENT FAILURE SEQUENCE</div>'
        +'<div style="font-size:0.5rem;letter-spacing:0.3em;color:rgba(255,0,0,0.4);">SESSION TERMINATED · ALL ACTIONS LOGGED · SECURITY TEAM NOTIFIED</div>';

      ov.appendChild(flash);
      ov.appendChild(grid);
      ov.appendChild(scan);
      ov.appendChild(stat);
      ov.appendChild(wrap);
      document.body.appendChild(ov);

      var t = setInterval(function(){
        count--;
        var ce = document.getElementById('__meltCount__');
        var se = document.getElementById('__meltStatus__');
        if(ce) ce.textContent = count;
        if(se && status_msgs[10-count-1]) se.textContent = status_msgs[10-count-1].toUpperCase();
        if(count <= 0){
          clearInterval(t);
          flash.remove();
          grid.style.background = 'none';
          ov.style.background   = '#000';
          wrap.style.animation  = 'none';
          wrap.innerHTML =
            '<div style="font-size:0.65rem;letter-spacing:0.5em;color:rgba(255,0,0,0.35);">ACCESS PERMANENTLY REVOKED</div>'
            +'<div style="margin-top:0.8rem;font-size:0.45rem;letter-spacing:0.35em;color:rgba(255,0,0,0.2);">SESSION TERMINATED</div>';
          setTimeout(function(){
            arieteSession.clear();
            window.location.href = _arieteBase + 'auth/citizen-login.html';
          }, 2200);
        }
      }, 1000);
    }

  })();

})(window);
