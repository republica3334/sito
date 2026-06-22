/**
 * Shared login logic for citizen-login.html and citizen-login-mobile.html
 * Call rsLoginInit(config) once per page.
 *
 * config = {
 *   loginFormId:      string  — ID of the form/card to hide when 2FA starts
 *   loginFormDisplay: string  — display value to restore on cancelTFA ('flex'|'block')
 *   adminRedirect:    string  — path to secret-code page for this platform
 * }
 */
(function(w){
  w.rsLoginInit = function(cfg) {
    var _loginFormId      = cfg.loginFormId      || 'loginForm';
    var _loginFormDisplay = cfg.loginFormDisplay  || 'block';
    var _adminRedirect    = cfg.adminRedirect     || 'secret-code.html';

    var _tfaExpiry = 0;
    var _tfaTimerInterval = null;

    /* ── TFA ── */
    w.startTFA = function(result) {
      var user = result.user || result;
      w._pendingUser = user;
      w._pendingChallengeId = result.challengeId || null;
      _tfaExpiry = Date.now() + 5 * 60 * 1000;

      var form = document.getElementById(_loginFormId);
      if (form) form.style.display = 'none';
      document.getElementById('tfaPanel').style.display = 'block';
      document.querySelectorAll('.otp').forEach(function(i){ i.value = ''; });
      var first = document.querySelector('.otp');
      if (first) first.focus();

      var masked = user.email
        ? user.email.replace(/(.{2})(.+)(@.+)/, function(_, a, b, c){ return a + '***' + c; })
        : '***';
      var emailEl = document.getElementById('tfaEmailDisplay');
      if (emailEl) emailEl.textContent = masked;

      _startTFATimer();
    };

    function _startTFATimer() {
      clearInterval(_tfaTimerInterval);
      _tfaTimerInterval = setInterval(function(){
        var left = Math.max(0, _tfaExpiry - Date.now());
        var m = Math.floor(left / 60000);
        var s = Math.floor((left % 60000) / 1000);
        var el = document.getElementById('tfaTimer');
        if (el) el.textContent = m + ':' + String(s).padStart(2, '0');
        if (left === 0) {
          clearInterval(_tfaTimerInterval);
          var err = document.getElementById('tfaError');
          if (err) { err.textContent = 'Verification code expired. Please request a new one.'; err.style.display = 'block'; }
        }
      }, 1000);
    }

    /* ── OTP input helpers ── */
    w.otpInput = function(el) {
      el.value = el.value.replace(/[^0-9]/g, '');
      if (el.value) {
        var next = el.nextElementSibling;
        while (next && next.tagName === 'SPAN') next = next.nextElementSibling;
        if (next && next.classList.contains('otp')) next.focus();
      }
      var inputs = document.querySelectorAll('.otp');
      if ([].slice.call(inputs).every(function(i){ return i.value; })) w.verifyOTP();
    };

    w.otpKey = function(e, el) {
      if (e.key === 'Backspace' && !el.value) {
        var prev = el.previousElementSibling;
        while (prev && prev.tagName === 'SPAN') prev = prev.previousElementSibling;
        if (prev && prev.classList.contains('otp')) prev.focus();
      }
    };

    /* ── Verify OTP ── */
    w.verifyOTP = function() {
      var entered = [].slice.call(document.querySelectorAll('.otp')).map(function(i){ return i.value; }).join('');
      var err = document.getElementById('tfaError');
      if (entered.length < 6) { err.textContent = 'Please enter all 6 digits.'; err.style.display = 'block'; return; }
      if (Date.now() > _tfaExpiry) { err.textContent = 'Code expired. Request a new one.'; err.style.display = 'block'; return; }

      var btn = document.getElementById('tfaVerifyBtn');
      btn.textContent = 'Verifying…';
      btn.disabled = true;
      if (w.republicstarLoader) republicstarLoader.show('Verifying code…');

      firebase.functions().httpsCallable('verifyLoginOtp')({ challengeId: w._pendingChallengeId, code: entered })
        .then(function(result) {
          if (result.data.valid) {
            clearInterval(_tfaTimerInterval);
            btn.textContent = 'Verified ✓ Signing in...';
            if (w.republicstarLoader) republicstarLoader.show('Signing in…');
            setTimeout(function(){ w.finishLogin(result.data, w._pendingRemember); }, 800);
          } else {
            if (w.republicstarLoader) republicstarLoader.hide();
            var reason = result.data.reason;
            err.textContent = reason === 'expired'
              ? 'Code expired. Request a new one.'
              : reason === 'too_many_attempts'
              ? 'Too many attempts. Request a new code.'
              : 'Incorrect code. Please check your email and try again.';
            err.style.display = 'block';
            document.querySelectorAll('.otp').forEach(function(i){ i.value = ''; i.style.borderColor = '#c8102e'; });
            var first = document.querySelector('.otp');
            if (first) first.focus();
            btn.textContent = 'Verify Code →';
            btn.disabled = false;
          }
        })
        .catch(function() {
          if (w.republicstarLoader) republicstarLoader.hide();
          err.textContent = 'Verification failed. Please try again.';
          err.style.display = 'block';
          btn.textContent = 'Verify Code →';
          btn.disabled = false;
        });
    };

    /* ── Finish login ── */
    w.finishLogin = function(result, remember) {
      var user = result.user || result;
      var token = result.token || null;
      var rememberEl = document.getElementById('rememberMe');
      var days = (rememberEl && rememberEl.checked) ? 30 : 0;
      var signIn = token && w.republicstarDB
        ? republicstarDB.signInWithCustomToken(token, !!remember)
        : Promise.resolve();
      signIn.then(function(){
        republicstarSession.set(user.id, user.role || 'citizen', days);
        if (user.role === 'admin') { w.location.href = _adminRedirect; return; }
        if (!user.setup) { w.location.href = 'setup.html'; return; }
        var redirect = localStorage.getItem('republicstar_redirect') || '../GOVERN_1.HTM';
        localStorage.removeItem('republicstar_redirect');
        w.location.href = redirect;
      }).catch(function(){
        var err = document.getElementById('errorMsg') || document.getElementById('tfaError');
        if (err) { err.textContent = 'Sign-in failed. Please try again.'; err.style.display = 'block'; }
        if (w.republicstarLoader) republicstarLoader.hide();
      });
    };

    /* ── Resend OTP ── */
    w.resendOTP = function() {
      if (!w._lastLoginPayload) return;
      if (w.republicstarLoader) republicstarLoader.show('Sending new code…');
      firebase.functions().httpsCallable('loginUser')(w._lastLoginPayload)
        .then(function(result){
          if (w.republicstarLoader) republicstarLoader.hide();
          w.startTFA(result.data);
        })
        .catch(function(){
          if (w.republicstarLoader) republicstarLoader.hide();
        });
      var err = document.getElementById('tfaError');
      if (err) err.style.display = 'none';
      document.querySelectorAll('.otp').forEach(function(i){ i.value = ''; i.style.borderColor = 'rgba(255,255,255,0.12)'; });
      var btn = document.getElementById('resendBtn');
      if (btn) {
        btn.textContent = 'Code resent ✓';
        setTimeout(function(){
          btn.textContent = 'Resend Code';
          var first = document.querySelector('.otp');
          if (first) first.focus();
        }, 2000);
      }
    };

    /* ── Cancel TFA ── */
    w.cancelTFA = function() {
      clearInterval(_tfaTimerInterval);
      w._pendingUser = null;
      document.getElementById('tfaPanel').style.display = 'none';
      var form = document.getElementById(_loginFormId);
      if (form) form.style.display = _loginFormDisplay;
      var err = document.getElementById('tfaError');
      if (err) err.style.display = 'none';
    };
  };
})(window);
