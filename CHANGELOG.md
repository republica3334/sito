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

---

## Security Audit — June 2026

Findings from automated scan, verified manually.

### Confirmed & Noted

**[True] Client-side session trust (Medium risk)**
Sessions stored in localStorage (`republicstar-auth.js` line 22/64). `requireAdmin` trusts `role` from localStorage for UI/redirect decisions. Actual admin mutations (approve, delete, suspend) route through Firebase callable functions server-side — so localStorage forgery only bypasses UI guards, not real data operations. Still: move role checks fully server-side via Firebase custom claims when scaling.

**[True] OTP functions allow account enumeration (High risk)**
`loginUser` / `sendOtp` callable functions return distinct error codes for missing users, disabled 2FA, etc. An attacker can probe which user IDs exist. Mitigation: return generic errors and add per-IP rate limiting in Cloud Functions.

**[True] No `package-lock.json` in `functions/`**
Dependency versions are loose ranges. Function deployments are not reproducible. Fix: run `npm install` and commit the lockfile.

### Verified False

**[False] Passwords stored as base64**
No `btoa`/`atob` calls anywhere in the codebase. Registration and login send the password to `registerUser`/`loginUser` Cloud Functions — hashing is server-side.

**[True → Removed] Firestore security rules in repo**
`firestore.rules` was tracked in git and has been removed. Security rules should not be in source control.

**[False] Direct Firestore writes from browser for admin ops**
`republicstar-firebase.js` routes all mutations through callable functions: `updateUser` → `adminUpdateUser`, `deleteUser` → `adminDeleteUser`. `saveUser` explicitly returns `Promise.reject('Direct user writes are disabled')`. No direct `db.collection().set/update/delete` calls for admin actions.

### Partially Mitigated

**[Partial] XSS in admin/mod HTML rendering**
User IDs are interpolated into `onclick` attributes via string concatenation, but the `jsString()` helper (admin.html line 214) escapes backslashes and single quotes before insertion. Not full HTML encoding — a specially crafted ID with angle brackets could still break out of the attribute context. Risk is low since user IDs are generated server-side and not user-controlled strings.
