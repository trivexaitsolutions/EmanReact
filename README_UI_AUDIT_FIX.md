# E-MAN client UI audit fixes (F1, F2, F3, F4, F5, F7, F16)
Apply the Backend patch and React patch together to the latest F8–F11 security project (React also includes the latest logout fix as its merge base). Back up local sources and retain your existing .env. Do not overwrite any database or change migration history. No new dependency or Prisma migration is needed; expo-location and SecureStore already exist in the updated Dev Client.

Backend: extract into D:\laragon\www\eman-admin, stop Node with Ctrl+C and run `node emanserver.js`. Existing mobile security migrations must already be applied. No server entry changes needed: the existing user and worker API routers are mounted there.
React: extract into the current React project (D:\laragon\www\EmanReact or your EmanReactSecure folder), retain the local API URL and run `npx expo start --dev-client -c`. Scan the Metro QR with the current security Dev Client. No rebuild needed if the installed client already contains expo-location and expo-secure-store.

Scope:
- Remove meaningless dashboard location label. Customer Wallet shortcut and Wallet/Settings profile items removed; History retained, Settings opens Profile, Support calls Mitra. Worker Wallet is unchanged.
- Worker login dead Forgot PIN/Privacy links replaced with Call Mitra. Worker Profile Contact Us calls the assigned active Mitra only.
- Support requests use the existing mobile JWT middleware for logged-in contacts, no client-provided identity. Customer assigned first; if missing, device GPS then stored address coordinates if GPS unavailable. Nearby means nearest VERIFIED Naka within configured service radius (not agent live GPS). Worker pre-login lookup is unauthenticated but rate-limited to 10 per IP per 15 min, returns only one active non-demo support contact, no agent directory. The rate limiter is process-local. Use approved service contact phone numbers. Invalid/dummy numbers are excluded and no arbitrary contact is dialled. For local Worker Login testing, create or use an active non-demo agent with valid phone and assign a nearby currently verified Naka. Device dialer asks for call confirmation.
- AUTO: 1 Skill/requirements, 2 work location, 3 review/address/payment. CUSTOMER_SELECT: same first two, 3 worker selection, 4 review/address/payment. Unknown mode does not show a guessed total while settings are being loaded. Mode follows actual existing booking routing and saved draft; no payment logic changed.
- Role cards show localized Worker/Customer labels; language switcher and login/navigation behavior retained. Hindi/Marathi support/error strings added.
- Existing SecureStore/logout, QR, OTP, translation cache, Admin and worker pool logic preserved.

Tests (after existing dependencies installed):
Backend: `node --test tests/mobileSupportContacts.test.cjs tests/mobileSecurityPatch.test.cjs`
React: `node --test tests/uiAuditFix.test.cjs tests/mobileLogout.test.cjs tests/phase2LanguageNav.test.cjs tests/phase2Translations.test.cjs`
13 backend + 17 React Node test entries passed in preparation environment (mock/static/transpile, not real device or MySQL). The older translation test sandbox was repaired to load the existing extra-translations import. Actual Android, permission, dialer, MySQL and full booking/payment regression tests remain required.

Manual acceptance: 1. Customer dashboard has three shortcuts; Settings opens Profile. 2. Customer profile Support resolves assigned contact, then GPS/saved address fallback with unassigned customer. 3. Worker login Call Mitra shows nearest agent or clear location/no-contact prompt. 4. Worker profile Contact Us opens assigned number only. 5. Check 3 and 4-step flows by changing Admin assignment mode; complete a test booking. 6. Verify role labels and call messages in en/hi/mr; logout and re-login; verify security QR flow still works.
