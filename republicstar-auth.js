/* ── Resolve base URL (works from any subfolder) ── */
var _republicstarBase = (document.currentScript ? document.currentScript.src.replace(/[^\/]*$/, '') : '');

/* ── Firebase SDK (injected synchronously) ── */
document.write('<scr'+'ipt src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"><\/scr'+'ipt>');
document.write('<scr'+'ipt src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"><\/scr'+'ipt>');
document.write('<scr'+'ipt src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"><\/scr'+'ipt>');
document.write('<scr'+'ipt src="https://www.gstatic.com/firebasejs/10.7.1/firebase-functions-compat.js"><\/scr'+'ipt>');
document.write('<scr'+'ipt src="'+_republicstarBase+'republicstar-firebase.js"><\/scr'+'ipt>');

/* ═══════════════════════════════════════════════════
   REPUBLICSTAR AUTH  –  shared across all pages
   Storage: localStorage with expiry wrapper
═══════════════════════════════════════════════════ */
(function(w){

  /* ── 1. Storage helpers ── */
  var PFX = 'republicstar_ck_';
  var ck = {
    set: function(name, value, days, sessionOnly){
      var entry = {v: value};
      if (!sessionOnly && days) entry.e = Date.now() + days * 864e5;
      try { localStorage.setItem(PFX+name, JSON.stringify(entry)); } catch(e){ console.warn('[republicstar] storage.set:', e); }
    },
    get: function(name){
      try {
        var raw = localStorage.getItem(PFX+name);
        if (!raw) return null;
        var entry = JSON.parse(raw);
        if (entry.e && Date.now() > entry.e) { localStorage.removeItem(PFX+name); return null; }
        return entry.v;
      } catch(e){ console.warn('[republicstar] storage.get:', e); return null; }
    },
    del: function(name){ try { localStorage.removeItem(PFX+name); } catch(e){ console.warn('[republicstar] storage.del:', e); } }
  };
  w.republicstarCookie = ck;

  /* ── Local dev users (fallback when Firestore unavailable) ── */
  function getUser(id){
    if (window.republicstarDB){
      return window.republicstarDB.getUser(id).then(function(u){ return u || null; });
    }
    return Promise.resolve(null);
  }

  /* ── 2. Session API ── */
  var ADMIN_ID   = 'ilcreatore';

  var session = {
    get: function(){
      var s = ck.get('republicstar_session');
      var u = ck.get('republicstar_user');
      var r = ck.get('republicstar_role');
      if (!s || !u) return null;
      return {session: s, user: u, role: r || 'citizen'};
    },

    set: function(userId, role, rememberDays){
      var days   = rememberDays || 0;
      var isSess = (days === 0);
      ck.set('republicstar_session', '1',    days, isSess);
      ck.set('republicstar_user',    userId, days, isSess);
      ck.set('republicstar_role',    role,   days, isSess);
      localStorage.setItem('republicstar_session_start', Date.now().toString());
    },

    clear: function(){
      ck.del('republicstar_session');
      ck.del('republicstar_user');
      ck.del('republicstar_role');
      localStorage.removeItem('republicstar_session_start');
      localStorage.removeItem('republicstar_remember');
      if (window.firebase && firebase.auth) {
        firebase.auth().signOut().catch(function(){});
      }
    },

    isAdmin: function(){
      var s = session.get();
      return !!(s && (s.user === ADMIN_ID || s.role === 'admin'));
    },

    requireLogin: function(){
      if (!session.get()){
        localStorage.setItem('republicstar_redirect', window.location.href);
        window.location.replace(_republicstarBase + 'auth/citizen-login.html');
        return false;
      }
      return true;
    },

    requireAdmin: function(){
      var s = session.get();
      if (!s || (s.user !== ADMIN_ID && s.role !== 'admin')){ window.location.replace(_republicstarBase + 'auth/citizen-login.html'); return false; }
      return true;
    },

    isMod: function(){
      var s = session.get();
      return s && s.role === 'moderator';
    },

    requireMod: function(){
      var s = session.get();
      if (!s || (s.role !== 'moderator' && s.role !== 'admin' && s.user !== ADMIN_ID)){
        window.location.replace(_republicstarBase + 'auth/citizen-login.html'); return false;
      }
      return true;
    },

    logout: function(){
      if (w.republicstarLoader) w.republicstarLoader.show('Signing out…');
      session.clear();
      window.location.href = _republicstarBase + 'auth/citizen-login.html';
    }
  };
  w.republicstarSession = session;

  /* ── 3. Nav dropdown ── */
  w.republicstarUpdateNav = function(targetEl){
    var s   = session.get();
    var cta = targetEl || document.querySelector('.nav-cta');
    if (!cta) return;

    if (!s) {
      cta.textContent = 'Citizen Login';
      cta.href        = _republicstarBase + 'auth/citizen-login.html';
      cta.onclick     = null;
      return;
    }

    var isAdmin = (s.user === ADMIN_ID || s.role === 'admin');
    var isMod   = (s.role === 'moderator');
    var initials = s.user.charAt(0).toUpperCase();
    var shortLabel = isAdmin ? 'ADMIN' : isMod ? 'MOD' : s.user.substring(0, 8).toUpperCase();
    var avatarColor = isAdmin ? '#c8102e' : isMod ? '#5a3ebf' : '#1f1f1f';

    /* wrapper */
    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;display:inline-block;';

    /* trigger button */
    var btn = document.createElement('button');
    btn.style.cssText = 'background:none;border:1.5px solid rgba(255,255,255,0.18);color:#fff;'
      + 'font-family:var(--font-sub);font-size:0.65rem;letter-spacing:0.12em;text-transform:uppercase;'
      + 'padding:0.3rem 0.75rem 0.3rem 0.3rem;cursor:pointer;display:flex;align-items:center;gap:0.5rem;'
      + 'transition:border-color 0.2s,background 0.2s;';
    btn.onmouseover = function(){ btn.style.borderColor = 'rgba(255,255,255,0.45)'; btn.style.background = 'rgba(255,255,255,0.06)'; };
    btn.onmouseout  = function(){ btn.style.borderColor = 'rgba(255,255,255,0.18)'; btn.style.background = 'none'; };

    var avatar = document.createElement('span');
    avatar.style.cssText = 'width:26px;height:26px;border-radius:0;background:' + avatarColor + ';'
      + 'display:inline-flex;align-items:center;justify-content:center;'
      + 'font-family:var(--font-head);font-size:0.75rem;font-weight:700;letter-spacing:0;color:#fff;flex-shrink:0;';
    avatar.textContent = initials;

    var labelNode = document.createTextNode(shortLabel);

    var chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    chevron.setAttribute('width', '9');
    chevron.setAttribute('height', '9');
    chevron.setAttribute('viewBox', '0 0 24 24');
    chevron.setAttribute('fill', 'none');
    chevron.setAttribute('stroke', 'currentColor');
    chevron.setAttribute('stroke-width', '2.5');
    chevron.innerHTML = '<polyline points="6 9 12 15 18 9"/>';

    btn.appendChild(avatar);
    btn.appendChild(labelNode);
    btn.appendChild(chevron);

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
    menu.id = 'republicstarProfileMenu';
    menu.style.cssText = 'display:none;position:absolute;right:0;top:calc(100% + 6px);'
      + 'background:#141414;border:1px solid rgba(255,255,255,0.1);border-top:2px solid #c8102e;'
      + 'min-width:190px;z-index:9999;box-shadow:0 8px 28px rgba(0,0,0,0.6);'
      + 'opacity:0;transform:translateY(-8px);'
      + 'transition:opacity 0.25s ease,transform 0.25s ease;pointer-events:none;'
      + 'color-scheme:dark;color:rgba(255,255,255,0.8);';

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
    var navHeader = document.createElement('div');
    navHeader.style.cssText = 'padding:0.85rem 1rem;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;gap:0.75rem;';
    var roleColor = isAdmin ? '#c8102e' : isMod ? '#7e5bff' : 'rgba(255,255,255,0.35)';

    var bigAvatar = document.createElement('div');
    bigAvatar.style.cssText = 'width:36px;height:36px;background:' + avatarColor + ';flex-shrink:0;'
      + 'display:flex;align-items:center;justify-content:center;'
      + 'font-family:var(--font-head);font-size:1rem;font-weight:700;color:#fff;';
    bigAvatar.textContent = initials;

    var headerInfo = document.createElement('div');
    headerInfo.style.cssText = 'min-width:0;flex:1;';

    var nameEl   = document.createElement('div');
    var emailEl  = document.createElement('div');
    var statusEl = document.createElement('div');
    nameEl.style.cssText   = 'font-size:0.85rem;font-weight:600;color:rgba(255,255,255,0.9);font-family:var(--font-body);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    emailEl.style.cssText  = 'font-size:0.7rem;color:rgba(255,255,255,0.3);font-family:var(--font-body);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    statusEl.style.cssText = 'margin-top:4px;display:flex;align-items:center;gap:0.4rem;';
    nameEl.textContent = s.user;
    var roleLabel = document.createElement('div');
    roleLabel.style.cssText = 'font-family:var(--font-sub);font-size:0.5rem;letter-spacing:0.14em;color:'+roleColor+';text-transform:uppercase;';
    roleLabel.textContent = isAdmin ? '★ Supreme Administrator' : isMod ? '⬡ Moderator' : '◈ Citizen';
    headerInfo.appendChild(roleLabel);
    headerInfo.appendChild(nameEl);
    headerInfo.appendChild(emailEl);
    headerInfo.appendChild(statusEl);
    navHeader.appendChild(bigAvatar);
    navHeader.appendChild(headerInfo);
    menu.appendChild(navHeader);

    /* Load real profile data (falls back to local users) */
    if (!isAdmin) {
      getUser(s.user).then(function(user){
        if (!user) return;
        if (user.name)  nameEl.textContent  = user.name;
        if (user.email) emailEl.textContent = user.email;
        if (user.status) {
          var sc = {approved:'#00b450', pending:'#f5a623', suspended:'#c8102e'};
          var col = sc[user.status] || '#aaa';
          var span = document.createElement('span');
          span.style.cssText = 'font-family:var(--font-sub);font-size:0.5rem;letter-spacing:0.12em;text-transform:uppercase;color:'+col+';border:1px solid '+col+'30;padding:0.1rem 0.4rem;';
          span.textContent = user.status;
          statusEl.appendChild(span);
        }
      }).catch(function(){});
    }

    if (isAdmin){
      menu.appendChild(menuItem('<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
        'Admin Panel', _republicstarBase + 'portal/admin.html', null, false));
    }
    if (isMod && !isAdmin){
      menu.appendChild(menuItem('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
        'Moderator Panel', _republicstarBase + 'portal/mod.html', null, false));
    }
    menu.appendChild(menuItem('<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>',
      'Profile', '#', function(e){ e.preventDefault(); alert('Profile — coming soon.'); }, false));
    menu.appendChild(menuItem('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
      'Settings', _republicstarBase + 'portal/settings.html', null, false));
    menu.appendChild(menuItem('<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      'Support', '#', function(e){ e.preventDefault(); alert('Support — coming soon.'); }, false));
    menu.appendChild(menuItem('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
      'Logout', '#', function(e){ e.preventDefault(); session.logout(); }, true));

    wrapper.appendChild(btn);
    wrapper.appendChild(menu);

    /* hover with open/close delay */
    var _closeTimer = null;
    function _closeMenu() {
      clearTimeout(_closeTimer);
      menu.style.opacity       = '0';
      menu.style.transform     = 'translateY(-8px)';
      menu.style.pointerEvents = 'none';
      setTimeout(function(){ if (menu.style.opacity === '0') menu.style.display = 'none'; }, 260);
    }
    wrapper.onmouseenter = function(){
      clearTimeout(_closeTimer);
      menu.style.display       = 'block';
      void menu.offsetWidth;
      menu.style.opacity       = '1';
      menu.style.transform     = 'translateY(0)';
      menu.style.pointerEvents = 'auto';
    };
    wrapper.onmouseleave = function(){ _closeTimer = setTimeout(_closeMenu, 220); };

    /* Close on outside click/tap — attached once per page, not per nav update */
    if (!w._republicstarDocClickAttached) {
      w._republicstarDocClickAttached = true;
      document.addEventListener('click', function(e){
        var m = document.getElementById('republicstarProfileMenu');
        var p = m && m.parentNode;
        if (m && p && !p.contains(e.target) && m.style.opacity === '1') {
          m.style.opacity       = '0';
          m.style.transform     = 'translateY(-8px)';
          m.style.pointerEvents = 'none';
          setTimeout(function(){ if (m.style.opacity === '0') m.style.display = 'none'; }, 260);
        }
      });
    }

    cta.parentNode.replaceChild(wrapper, cta);

    if (!document.getElementById('_republicstarMenuStyle')) {
      var st = document.createElement('style');
      st.id = '_republicstarMenuStyle';
      st.textContent = '#republicstarProfileMenu, #republicstarProfileMenu * {'
        + 'background-color: unset; color: inherit; border-color: inherit; }'
        + '#republicstarProfileMenu { background: #141414 !important; color: rgba(255,255,255,0.8) !important; }'
        + '#republicstarProfileMenu a, #republicstarProfileMenu button { color: rgba(255,255,255,0.8) !important; background: none !important; }'
        + '#republicstarProfileMenu a[style*="c8102e"], #republicstarProfileMenu button[style*="c8102e"] { color: #c8102e !important; }';
      document.head.appendChild(st);
    }
  };

  /* ── 4. Cookie banner ── */
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

  /* ── 5. CSS injection (mobile + theme) ── */
  (function(){
    var link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = _republicstarBase + 'republicstar-mobile.css';
    document.head.appendChild(link);
  })();

  (function(){
    var link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = _republicstarBase + 'republicstar-theme.css';
    document.head.appendChild(link);
  })();

  (function(){
    var icon = document.createElement('link');
    icon.rel  = 'icon';
    icon.type = 'image/svg+xml';
    icon.href = _republicstarBase + 'svgs/icone/republica/favicon.svg';
    document.head.appendChild(icon);
  })();

  /* ── 5b. Theme system ── */
  (function(){
    var LS_KEY = 'republicstar_theme';
    var html   = document.documentElement;

    /* Pages in these folders are light by default; everything else is dark */
    function getPageDefaultTheme() {
      var path = window.location.pathname;
      if (/\/(services|gov)\//.test(path)) return 'light';
      return 'dark';
    }

    var _lockedTheme = html.getAttribute('data-theme-lock') || null;

    function applyTheme(t) {
      html.setAttribute('data-theme', _lockedTheme || t);
      if (!_lockedTheme) localStorage.setItem(LS_KEY, t);
    }

    /* Set initial theme: lock → stored user preference → page-native default */
    var stored = localStorage.getItem(LS_KEY);
    applyTheme(stored || getPageDefaultTheme());

    /* Public API — no-op on locked pages */
    w.republicstarToggleTheme = function() {
      if (_lockedTheme) return;
      applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
      /* Re-render toggle icon */
      var btn = document.getElementById('republicstarThemeToggle');
      if (btn) btn.innerHTML = _themeIcon();
    };

    function _themeIcon() {
      var isDark = html.getAttribute('data-theme') === 'dark';
      return isDark
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }

    w._republicstarThemeIcon = _themeIcon;

    /* Inject floating toggle button into body — omit on locked pages */
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

  /* ── 5c. Debug mode (placeholder — admin/mod only) ── */
  (function(){
    var DEBUG_SHORTCUT_KEY = 'D'; /* Ctrl+Shift+D */
    var PANEL_ID = 'republicstarDebugPanel';

    function _isPrivileged() {
      var s = session.get();
      return s && (s.role === 'admin' || s.role === 'moderator' || s.user === 'ilcreatore');
    }

    function _buildPanel() {
      if (document.getElementById(PANEL_ID)) return;
      if (!_isPrivileged()) return;

      var s = session.get();
      var panel = document.createElement('div');
      panel.id = PANEL_ID;
      panel.style.cssText = [
        'position:fixed;bottom:1rem;right:1rem;z-index:2147483000',
        'background:#0a0a0a;border:1.5px solid #c8102e',
        'color:#fff;font-family:monospace;font-size:0.7rem',
        'width:280px;max-height:60vh;overflow-y:auto',
        'box-shadow:0 4px 24px rgba(200,16,46,0.25)',
        'transition:opacity 0.2s'
      ].join(';');

      panel.innerHTML =
        '<div style="background:#c8102e;padding:0.45rem 0.8rem;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;">'
        + '<span style="font-size:0.65rem;letter-spacing:0.18em;font-weight:700;">⬡ DEBUG MODE</span>'
        + '<span style="font-size:0.55rem;opacity:0.7;color:#ffd;padding:2px 6px;background:rgba(0,0,0,0.3);border-radius:2px;">PLACEHOLDER</span>'
        + '<button id="__debugClose__" '
        +   'style="background:none;border:none;color:#fff;cursor:pointer;font-size:0.9rem;line-height:1;padding:0 0.2rem;" aria-label="Close debug panel">×</button>'
        + '</div>'
        + '<div style="padding:0.7rem 0.8rem;display:flex;flex-direction:column;gap:0.6rem;">'

        + '<div style="border-bottom:1px solid rgba(200,16,46,0.25);padding-bottom:0.5rem;">'
        + '<div style="color:#c8102e;letter-spacing:0.12em;font-size:0.6rem;margin-bottom:0.3rem;">SESSION</div>'
        + '<div>user: <span style="color:#7cf">' + (s ? s.user : '—') + '</span></div>'
        + '<div>role: <span style="color:#' + (s && s.role === 'admin' ? 'f87' : s && s.role === 'moderator' ? 'fa7' : 'aaa') + '">' + (s ? s.role : '—') + '</span></div>'
        + '</div>'

        + '<div style="border-bottom:1px solid rgba(200,16,46,0.25);padding-bottom:0.5rem;">'
        + '<div style="color:#c8102e;letter-spacing:0.12em;font-size:0.6rem;margin-bottom:0.3rem;">PAGE</div>'
        + '<div style="word-break:break-all;opacity:0.75;">' + window.location.pathname + '</div>'
        + '<div style="margin-top:0.2rem;">theme: <span style="color:#7cf">' + (document.documentElement.getAttribute('data-theme') || 'none') + '</span></div>'
        + '</div>'

        + '<div style="border-bottom:1px solid rgba(200,16,46,0.25);padding-bottom:0.5rem;">'
        + '<div style="color:#c8102e;letter-spacing:0.12em;font-size:0.6rem;margin-bottom:0.3rem;">PLACEHOLDERS</div>'
        + '<div style="opacity:0.5;">Performance metrics — coming soon</div>'
        + '<div style="opacity:0.5;">Firebase latency — coming soon</div>'
        + '<div style="opacity:0.5;">Error log — coming soon</div>'
        + '<div style="opacity:0.5;">Feature flags — coming soon</div>'
        + '</div>'

        + '<div style="opacity:0.35;font-size:0.58rem;text-align:center;">Ctrl+Shift+D to toggle</div>'
        + '</div>';

      document.body.appendChild(panel);
      var closeBtn = document.getElementById('__debugClose__');
      if (closeBtn) closeBtn.addEventListener('click', function(){ panel.remove(); });
    }

    document.addEventListener('keydown', function(e) {
      if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === DEBUG_SHORTCUT_KEY) {
        e.preventDefault();
        var existing = document.getElementById(PANEL_ID);
        if (existing) { existing.remove(); return; }
        _buildPanel();
      }
    });

    /* Also expose public toggle */
    w.republicstarDebugToggle = function() {
      var existing = document.getElementById(PANEL_ID);
      if (existing) { existing.remove(); return; }
      _buildPanel();
    };
  })();

  /* ── 6. Mobile nav — hamburger + avatar profile button ── */
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

    /* ── Profile / Login button ── */
    var s = session.get();
    var profileBtn = document.createElement('a');
    profileBtn.href = _republicstarBase + 'auth/citizen-login.html';
    profileBtn.style.cssText = 'display:flex;align-items:center;justify-content:center;'
      + 'width:34px;height:34px;text-decoration:none;flex-shrink:0;';

    if (s) {
      var isAdminM = (s.user === ADMIN_ID || s.role === 'admin');
      var isModM   = (s.role === 'moderator');
      var aColor   = isAdminM ? '#c8102e' : isModM ? '#5a3ebf' : '#2a2a2a';
      var aInit    = s.user.charAt(0).toUpperCase();
      profileBtn.style.background = aColor;
      profileBtn.style.color      = '#fff';
      profileBtn.style.fontFamily = 'var(--font-head)';
      profileBtn.style.fontSize   = '0.85rem';
      profileBtn.style.fontWeight = '700';
      profileBtn.style.border     = '1.5px solid rgba(255,255,255,0.2)';
      profileBtn.textContent = aInit;

      /* Enrich with real name initial once loaded */
      getUser(s.user).then(function(user){
        if (user && user.name) profileBtn.textContent = user.name.charAt(0).toUpperCase();
      }).catch(function(){});

      /* Profile button opens the profile page / settings */
      profileBtn.href = _republicstarBase + 'portal/settings.html';
    } else {
      /* Not logged in — show login button */
      profileBtn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;'
        + 'height:34px;padding:0 1rem;text-decoration:none;flex-shrink:0;'
        + 'background:#c8102e;color:#ffffff;'
        + 'font-family:var(--font-sub);font-size:0.65rem;font-weight:700;'
        + 'letter-spacing:0.14em;text-transform:uppercase;';
      profileBtn.textContent = 'Login';
    }
    group.appendChild(profileBtn);

    /* ── Hamburger button ── */
    var hamburger = document.createElement('button');
    hamburger.setAttribute('aria-label', 'Open menu');
    hamburger.style.cssText = 'background:none;border:1.5px solid rgba(255,255,255,0.2);cursor:pointer;'
      + 'display:flex;flex-direction:column;justify-content:center;align-items:center;'
      + 'gap:4px;padding:0.4rem;width:34px;height:34px;flex-shrink:0;'
      + 'transition:border-color 0.2s;';

    var bar1 = document.createElement('span');
    var bar2 = document.createElement('span');
    var bar3 = document.createElement('span');
    [bar1, bar2, bar3].forEach(function(b){
      b.style.cssText = 'display:block;width:16px;height:1.5px;transition:transform 0.25s,opacity 0.25s;';
    });
    hamburger.appendChild(bar1);
    hamburger.appendChild(bar2);
    hamburger.appendChild(bar3);

    function getBarColor(){ return document.documentElement.dataset.theme === 'light' ? '#0a0a0a' : '#ffffff'; }
    function updateBarColors(){
      var c = getBarColor();
      [bar1, bar2, bar3].forEach(function(b){ b.style.background = c; });
      var bc = document.documentElement.dataset.theme === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)';
      hamburger.style.borderColor = bc;
      profileBtn.style.borderColor = bc;
    }
    updateBarColors();
    new MutationObserver(updateBarColors).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
    group.appendChild(hamburger);

    function setBarsOpen(open){
      if (open) {
        bar1.style.transform = 'translateY(5.5px) rotate(45deg)';
        bar2.style.opacity   = '0';
        bar2.style.transform = 'scaleX(0)';
        bar3.style.transform = 'translateY(-5.5px) rotate(-45deg)';
        hamburger.style.borderColor = 'rgba(200,16,46,0.5)';
      } else {
        bar1.style.transform = 'none';
        bar2.style.opacity   = '1';
        bar2.style.transform = 'none';
        bar3.style.transform = 'none';
        updateBarColors();
      }
    }

    /* ── Overlay ── */
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;left:0;right:0;top:0;bottom:0;z-index:99999;background:#080808;'
      + 'display:flex;flex-direction:column;overflow-y:auto;'
      + 'opacity:0;pointer-events:none;transition:opacity 0.22s;';

    /* Overlay header bar */
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
    overlayClose.innerHTML = '&times;';
    overlayClose.onmouseover = function(){ overlayClose.style.color = '#fff'; };
    overlayClose.onmouseout  = function(){ overlayClose.style.color = 'rgba(255,255,255,0.5)'; };
    overlayHeader.appendChild(overlayLogo);
    overlayHeader.appendChild(overlayClose);
    overlay.appendChild(overlayHeader);

    /* Nav links */
    var linksWrap = document.createElement('div');
    linksWrap.style.cssText = 'flex:1;display:flex;flex-direction:column;padding:1.5rem 2rem 2rem;';
    nav.querySelectorAll('a').forEach(function(a){
      if (a.classList.contains('nav-cta')) return;
      if (a.textContent.trim().toLowerCase() === 'logout') return;
      var clone = document.createElement('a');
      clone.href = a.href;
      clone.textContent = a.textContent.trim();
      clone.setAttribute('style', 'color:rgba(255,255,255,0.8) !important;text-decoration:none !important;'
        + 'font-family:var(--font-head);font-size:1.5rem;letter-spacing:0.06em;'
        + 'text-transform:uppercase;padding:0.8rem 0;border-bottom:1px solid rgba(255,255,255,0.06);'
        + 'transition:color 0.15s;');
      clone.onmouseover = function(){ clone.setAttribute('style', clone.getAttribute('style').replace('rgba(255,255,255,0.8)','#ffffff')); };
      clone.onmouseout  = function(){ clone.setAttribute('style', clone.getAttribute('style').replace('#ffffff','rgba(255,255,255,0.8)')); };
      clone.addEventListener('click', function(){ closeMenu(); });
      linksWrap.appendChild(clone);
    });

    if (session.get()) {
      var logoutLink = document.createElement('a');
      logoutLink.href = '#';
      logoutLink.textContent = 'Logout';
      logoutLink.setAttribute('style', 'margin-top:1.5rem;color:#c8102e !important;text-decoration:none !important;'
        + 'font-family:var(--font-head);font-size:1.5rem;letter-spacing:0.06em;text-transform:uppercase;'
        + 'padding:0.8rem 0;transition:color 0.15s;');
      logoutLink.onmouseover = function(){ logoutLink.style.color = '#ff3355'; };
      logoutLink.onmouseout  = function(){ logoutLink.style.color = '#c8102e'; };
      logoutLink.addEventListener('click', function(e){
        e.preventDefault();
        closeMenu();
        setTimeout(function(){ session.logout(); }, 60);
      });
      linksWrap.appendChild(logoutLink);
    }
    overlay.appendChild(linksWrap);
    document.body.appendChild(overlay);

    function openMenu(){
      var hh = header.offsetHeight;
      overlayHeader.style.height    = hh + 'px';
      overlayHeader.style.minHeight = hh + 'px';
      overlay.style.opacity      = '1';
      overlay.style.pointerEvents = 'auto';
      document.documentElement.style.overflow = 'hidden';
      setBarsOpen(true);
      hamburger.setAttribute('aria-label', 'Close menu');
    }
    function closeMenu(){
      overlay.style.opacity      = '0';
      overlay.style.pointerEvents = 'none';
      document.documentElement.style.overflow = '';
      setBarsOpen(false);
      hamburger.setAttribute('aria-label', 'Open menu');
    }

    hamburger.addEventListener('click', function(){
      var isOpen = overlay.style.opacity === '1';
      if (isOpen) closeMenu(); else openMenu();
    });
    overlayClose.addEventListener('click', closeMenu);
  };

  /* ── 7. Auto-init on DOM ready ── */
  document.addEventListener('DOMContentLoaded', function(){
    /* Suspended / pending check — async Firestore */
    (function(){
      var EXEMPT = ['suspended.html','citizen-login.html','guest-register.html','register.html','index.html','secret-code.html','setup.html'];
      var page   = window.location.pathname.split('/').pop() || 'index.html';
      if (EXEMPT.indexOf(page) !== -1) return;
      var s = session.get();
      if (!s || s.user === 'ilcreatore' || s.role === 'admin') return;

      function runCheck(user){
        if (!user) return;
        /* Sync role update if changed remotely */
        if (user.role && user.role !== s.role){
          session.set(s.user, user.role, 0);
        }
        if (user.status === 'suspended'){
          window.location.replace(_republicstarBase + 'auth/suspended.html');
          return;
        }
        if (user.status === 'pending'){
          var banner = document.createElement('div');
          banner.id = 'republicstarPendingBanner';
          banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;'
            + 'background:#7a4f00;border-bottom:2px solid #f5a623;'
            + 'color:#ffd98c;font-family:sans-serif;font-size:0.78rem;'
            + 'display:flex;align-items:center;justify-content:center;gap:0.8rem;'
            + 'padding:0.55rem 1.2rem;text-align:center;';
          banner.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f5a623" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
            + '<span><strong>Account pending approval</strong> — Access to citizen services is limited until the Civil Registry approves your account.'
            + ' <a href="' + _republicstarBase + 'portal/settings.html" style="color:#f5a623;font-weight:600;text-decoration:underline;">View Status</a></span>'
            + '<button id="_rsPendingDismiss" '
            + 'style="background:none;border:none;color:#ffd98c;font-size:1rem;cursor:pointer;padding:0 0.3rem;line-height:1;" '
            + 'aria-label="Dismiss">×</button>';
          document.body.insertBefore(banner, document.body.firstChild);
          var dismiss = document.getElementById('_rsPendingDismiss');
          if (dismiss) dismiss.addEventListener('click', function(){
            var h = banner.offsetHeight;
            banner.remove();
            var cur = parseFloat(document.body.style.paddingTop) || 0;
            var next = cur - h;
            document.body.style.paddingTop = next > 0 ? next + 'px' : '';
          });
          document.body.style.paddingTop = (document.body.style.paddingTop
            ? (parseFloat(document.body.style.paddingTop) + banner.offsetHeight) : banner.offsetHeight) + 'px';
        }
      }

      if (window.republicstarDB){
        window.republicstarDB.getUser(s.user).then(runCheck).catch(function(){});
      } else {
        /* Retry once Firebase finishes loading */
        setTimeout(function(){
          if (window.republicstarDB) window.republicstarDB.getUser(s.user).then(runCheck).catch(function(){});
        }, 800);
      }
    })();

    w.republicstarUpdateNav();
    w.republicstarCookieBanner();
    w.republicstarMobileNav();
    w.republicstarInjectFooter();
  });

  /* ── 7b. Full footer injection ──
     Pages with minimal footers (service sub-pages, ministry sub-pages) get
     the same full grid footer as the homepage. Pages that already have a
     .footer-grid are left untouched. mobile.html is explicitly excluded. */
  w.republicstarInjectFooter = function() {
    var page = window.location.pathname.split('/').pop() || '';
    if (page === 'mobile.html') return;
    var footer = document.querySelector('footer');
    if (!footer) return;
    if (footer.querySelector('.footer-grid')) return;
    var b = _republicstarBase;
    footer.innerHTML =
      '<div class="footer-grid">'
      + '<div class="footer-brand">'
      +   '<img src="' + b + 'svgs/icone/republica/1.svg" width="78" style="display:block;" alt="United Republic of Stars — Official Emblem">'
      +   '<p>The Official Portal of the United Republic of Stars. All government information, services and legislation accessible to every citizen.</p>'
      +   '<p style="font-size:0.7rem;color:rgba(255,255,255,0.2);letter-spacing:0.08em;text-transform:uppercase;">&copy; 2026 United Republic of Stars. All Rights Reserved.</p>'
      + '</div>'
      + '<div class="footer-col"><h5>Government</h5><ul>'
      +   '<li><a href="' + b + 'gov/government.html">Office of the President</a></li>'
      +   '<li><a href="' + b + 'gov/national-assembly.html">National Assembly</a></li>'
      +   '<li><a href="' + b + 'gov/supreme-court.html">Supreme Court</a></li>'
      +   '<li><a href="' + b + 'gov/ministries.html">Cabinet of Ministers</a></li>'
      +   '<li><a href="' + b + 'gov/official-gazette.html">Official Gazette</a></li>'
      + '</ul></div>'
      + '<div class="footer-col"><h5>Citizen Services</h5><ul>'
      +   '<li><a href="' + b + 'services/service-digital-id.html">National ID Portal</a></li>'
      +   '<li><a href="' + b + 'services/service-taxes.html">Tax Authority</a></li>'
      +   '<li><a href="' + b + 'services/service-civil-registration.html">Civil Registry</a></li>'
      +   '<li><a href="' + b + 'services/service-health.html">Health Services</a></li>'
      +   '<li><a href="' + b + 'services/service-education.html">Education Portal</a></li>'
      + '</ul></div>'
      + '<div class="footer-col"><h5>Information</h5><ul>'
      +   '<li><a href="' + b + 'GOVERN_1.HTM">About the Republic</a></li>'
      +   '<li><a href="' + b + 'gov/constitution.html">Constitution</a></li>'
      +   '<li><a href="' + b + 'gov/laws-decrees.html">Laws &amp; Decrees</a></li>'
      +   '<li><a href="' + b + 'gov/open-data.html">Open Data</a></li>'
      +   '<li><a href="' + b + 'gov/contact.html">Contact Government</a></li>'
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

  /* ── 8. Page Loader overlay ── */
  w.republicstarLoader = (function(){
    var _el = null;
    function _create(){
      if (_el) return;
      var s = document.createElement('style');
      s.textContent =
        '@keyframes _rsSpinA{to{transform:rotate(360deg)}}'
        + '#_rsLoader{position:fixed;inset:0;z-index:2147483645;background:rgba(0,0,0,0.88);'
        + 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.4rem;'
        + 'opacity:0;transition:opacity 0.18s;pointer-events:none;}'
        + '#_rsLoader.active{opacity:1;pointer-events:auto;}'
        + '#_rsSpinner{width:40px;height:40px;border:3px solid rgba(200,16,46,0.18);'
        + 'border-top-color:#c8102e;border-radius:50%;animation:_rsSpinA 0.7s linear infinite;}'
        + '#_rsLoaderMsg{font-family:var(--font-sub,"Inter",sans-serif);font-size:0.62rem;'
        + 'letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.4);}';
      document.head.appendChild(s);
      _el = document.createElement('div');
      _el.id = '_rsLoader';
      _el.setAttribute('aria-live', 'polite');
      _el.innerHTML = '<div id="_rsSpinner"></div><div id="_rsLoaderMsg"></div>';
      document.body.appendChild(_el);
    }
    return {
      show: function(msg){
        if (document.body) { _create(); }
        else { document.addEventListener('DOMContentLoaded', function(){ _create(); }); return; }
        var m = document.getElementById('_rsLoaderMsg');
        if (m) m.textContent = msg || 'Please wait…';
        void _el.offsetWidth;
        _el.classList.add('active');
      },
      hide: function(){
        if (!_el) return;
        _el.classList.remove('active');
      }
    };
  })();

  /* ── 9. Secret Override Code ── */
  /* Trigger: type REPUBLICSTAR (not inside an input) → secret modal appears.
     Disabled: admin sessions are issued only by backend custom tokens.
     3 wrong attempts → reactor-meltdown security screen. */
  (function(){
    return;
    var _TRIGGER = '';
    var _SECRET  = '';
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
      /* Sequence REPUBLICSTAR — only outside inputs */
      if(['INPUT','TEXTAREA','SELECT'].indexOf((document.activeElement||{}).tagName||'')!==-1) return;
      if(!e.key || e.key.length !== 1) return;
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
            throw new Error('Secret override disabled');
            ov.remove();
            if(document.getElementById('__arStyle__')) document.getElementById('__arStyle__').remove();
            window.location.href = _republicstarBase + 'portal/admin.html';
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
            republicstarSession.clear();
            window.location.href = _republicstarBase + 'auth/citizen-login.html';
          }, 2200);
        }
      }, 1000);
    }

  })();

})(window);
