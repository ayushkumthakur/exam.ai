# Competitive Exam AI

Zero-dependency app (Node 22+, built-in `node:sqlite`). Run: `node server.js` → http://localhost:3000

Env: `ANTHROPIC_API_KEY` (AI features), `ANTHROPIC_MODEL`, `ADMIN_EMAILS` (comma list → admin role),
`RESEND_API_KEY` + `MAIL_FROM` (real OTP emails; without them the OTP is printed to the server log and shown on screen in non-production),
`NODE_ENV=production` (Secure cookies, hides dev OTP), `DATA_DIR`, `PORT`.

Tests: `node tests/smoke.js` (API, 34 checks) and `python3 tests/ui.py` (browser, needs playwright).

Content notes: exam patterns/syllabi are approximate defaults (flagged unverified) and editable in Admin.
The ~30 seed questions are labelled "Admin Practice Question". No PYQs or current-affairs items are seeded:
add real ones in Admin so nothing is fabricated.