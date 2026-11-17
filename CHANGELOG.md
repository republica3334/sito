# Changelog — United Republic of Stars

## [Static Site] — November 2026

The portal is now a fully static site: no accounts, no database, no outbound requests besides Google Fonts and the embedded YouTube video.

### Removed
- Citizen accounts: login, registration, OTP/2FA, account setup, suspension page, settings
- Admin and moderator panels, admin secret code and meltdown sequence (`auth/`, `portal/`, `media/alarm.mp3`, `media/audio2.mp3`)
- Firebase Auth, Firestore and Cloud Functions (`functions/`, `firestore.rules`, `republicstar-firebase.js`) and the EmailJS integration
- All "Citizen Login" / "Register" links; demo service forms no longer redirect to login

### Changed
- `republicstar-auth.js` replaced by `republicstar-site.js` (theme, cookie banner, mobile menu, footer only); it also clears session data left in the browser by the old account system
- Deploy workflow publishes Firebase Hosting only
- Added a Content-Security-Policy header that blocks requests to any other site; removed the obsolete `X-XSS-Protection` header

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

## Weekly Changelog - 2026-06-16 to 2026-06-23

Generated from Git commits in this repository for the requested window, plus the current uncommitted workspace state. Git shows 82 commits in this range, all dated 2026-06-22 or 2026-06-23; no commits were found for 2026-06-16 through 2026-06-21.

### Security & Auth
- Moved the admin secret-code gate server-side through the `verifyAdminCode` callable and stopped issuing/storing the admin custom token before secret-code verification.
- Added `ADMIN_SECRET_HASH` deployment support and redeploy workflow updates.
- Reworked privileged Cloud Function checks to use live Firestore role/status data, including awaited `requirePrivileged()` calls.
- Fixed moderator privilege boundaries: moderators cannot modify themselves, cannot modify admin/moderator accounts, and cannot delete admin/moderator accounts.
- Added rate limits for login, registration, guest registration, setup, email changes, and password changes.
- Improved account status enforcement for login/OTP flows while preserving legacy accounts without status fields.
- Removed the admin ID from client-side code and standardized the protected admin account as `ADMIN001`.
- Added token revocation after admin role/status updates.
- Removed Firestore rules deployment from CI because rules are managed manually in Firebase.
- Excluded local/private deployment artifacts and the EmailJS template page from Firebase Hosting output.

### Admin & Moderator Panels
- Rebuilt the moderator panel to match the admin panel layout and added a mobile moderator panel.
- Added optimistic local UI updates for admin and moderator approval, suspension, rejection, delete, and role-change flows.
- Added Revoke actions for moderators and moved revoked users back into pending review.
- Added robust `onUsers` snapshot error handling and redirects on auth/permission failures.
- Refactored admin and moderator action buttons away from fragile inline JavaScript toward `data-action` event delegation.
- Hid protected admin accounts from citizen lists and statistics.
- Added toast/logging improvements and safer admin delete/reject flows.

### Login, Setup & Secret Code
- Extracted shared desktop/mobile login and OTP behavior into `auth/login-shared.js`.
- Added mobile-specific secret-code page and routed mobile admin login to it.
- Added loader overlays for login, OTP, registration, setup, and admin panel operations.
- Fixed back/forward-cache restore so stuck login loaders/buttons reset correctly.
- Improved setup flow styling, light-mode behavior, active step state, and selector reliability.
- Added password confirmation requirements for sensitive settings actions such as email change and account deletion.

### Secret-Code Meltdown Experience
- Reworked desktop and mobile meltdown layout, centering, spacing, and responsive behavior.
- Tuned flash timing several times, ending with the mobile sync at 0.94s.
- Changed the meltdown countdown to 2:40.
- Added audio priming to satisfy browser autoplay policy.
- Added and switched meltdown audio assets, including `alarm.mp3` and `audio2.mp3`, with `audio2` starting at 0:18.

### Performance & Optimization
- Extracted duplicated service, government, and military page CSS into shared files: `services/service-detail.css`, `services/service-index.css`, `gov/gov-page.css`, and `military/military-page.css`.
- Reduced repeated inline CSS across 32 service detail pages, 8 service index pages, government pages, and military pages.
- Added Firebase Hosting `Cache-Control` headers for HTML/JS/CSS and long-lived immutable caching for static assets.
- Added `tax.png` as an optimized tax icon asset and switched referenced pages between `tax.svg` and `tax.png` during follow-up fixes.
- Removed duplicate `functions/emblem-white.png` from the current uncommitted workspace state.

### UI, Theme & Encoding
- Fixed light-theme behavior across admin, login, setup, mobile login, profile dropdown, and settings surfaces.
- Added adaptive theme-color metadata, then reverted it.
- Repaired corrupted replacement characters, broken arrows, bullets, and symbols across the site.
- Fixed service page arrows and ticker bullets, including service detail pages, service index pages, government CSS, and military CSS.
- Fixed broken health ministry icon references by correcting the health icon asset path handling.
- Removed BOM/null-byte encoding issues from affected HTML/CSS files.

### Firebase, CI & Dependencies
- Added Firebase deploy workflow and later expanded it to deploy functions from the `sito-test` branch.
- Added Functions package lockfile for reproducible dependency installs.
- Added EmailJS-backed OTP delivery through Cloud Functions.
- Kept current Firestore rules out of the repository and documented that rules are managed in Firebase Console.

### Current Uncommitted Workspace State
- `functions/emblem-white.png` is deleted.
- `svgs/icone/generico/tax.svg` has an uncommitted edit adding two white background rectangles.
- Git reports a warning reading `C:\Users\LEI71/.config/git/ignore`, but repository commands still completed.
