# E-MAN: Field Agent contact + wallet settlement history

Apply over the latest Security Dev Client + Logout Fix + UI Audit Fix. Do not replace .env; keep local API URL. Apply matching backend patch and migrate database before testing. No new native dependency.

From your existing React project directory:

    npx expo start --dev-client -c

Scan the Metro QR with the existing Security Dev Client (SecureStore already built in). No new APK/Dev Client rebuild for these JS changes if that build is already installed.

Worker Login now has Call Field Agent, selecting one eligible active non-leave agent without requesting GPS. User-facing support labels are English/Hindi/Marathi. Dialer opens for user confirmation. Worker profile keeps assigned-agent behavior. Customer support keeps assigned/nearby behavior.

Worker Wallet: pending payout = balance including previous weeks; weekly earnings/deductions displayed separately; total paid and Payment History across all dates. History shows payout amount, recorded date, method, reference. Refresh by re-entering Wallet, changing tab, foregrounding app or pull-to-refresh. There is no direct money transfer or push notification in this patch. Existing auth token/translation cache unchanged.

Tests: `node --test tests/uiAuditFix.test.cjs tests/mobileLogout.test.cjs tests/workerPayoutUI.test.cjs` (TypeScript dependency from project). 18 focused mock/source/transpile tests passed here. Real Android/device/API integration still requires testing.
