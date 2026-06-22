# Changelog — United Republic of Stars

## [Major Update] — June 2026

### Auth & Login
- Extracted shared TFA/OTP/login logic into `auth/login-shared.js` (`rsLoginInit()`) — eliminates duplication between desktop and mobile login pages
- Admin login now redirects to `secret-code.html` instead of directly to `admin.html`
- Added loading overlay (spinner) on login, logout, OTP send/verify, and registration

### Secret Code
- Re-enabled secret code modal in `republicstar-auth.js` (was blocked by `return;`)
- Added admin session guard — override modal only accessible to logged-in admins
- Secret code verified via SHA-256 hash client-side
- Replaced Web Audio API alarm with `alarm.mp3`
- Flash timing set to `1.12s`
- Created `auth/secret-code-mobile.html` (mobile-optimized, identical logic)

### Admin Panel (`portal/admin.html`)
- Full rewrite: removed ~850 lines of unused homepage CSS
- Theme-reactive via CSS variables (`--at`, `--ab`, `--aborder`, etc.)
- Admin user hidden from citizen list
- All panel operations wrapped with loading overlay

### Light Theme Fixes
- `citizen-login.html` — card, inputs, background, emblem
- `citizen-login-mobile.html` — top bar, security note, OTP separator, cookie banner; fixed broken `[data-theme="light"] html` selector
- `portal/admin.html` — all JS-rendered elements use CSS variables
- `republicstar-theme.css` — profile dropdown now reacts to theme (broad `*` selector)
- `auth/setup.html` — step cards, inputs, step indicator, toggle, connector line; stripped 2382 null bytes causing silent CSS failures

### Media
- Added `media/alarm.mp3` to repository
