# Competitive Exam AI

An AI-assisted competitive-exam preparation platform for Indian exams. It combines practice, mock tests, explanations, performance tracking, revision workflows, and an admin area in a lightweight Node.js application.

**Live demo:** https://web-production-b7a92.up.railway.app/  
**Source code:** https://github.com/ayushkumthakur/exam.ai

## Product highlights

- Account signup/login and student-specific progress.
- Exam selection, onboarding, subject/topic practice, and mock-test flows.
- Test submission, result views, answer explanations, and progress tracking.
- Topic performance, mistake tracking, revision recommendations, and daily plans.
- Admin dashboard for exam/question management and reports.
- AI-assisted question generation when a supported provider and API key are configured.
- Verified PYQ handling: new imports require an official question-paper source, an official answer source, reviewer notes, explicit confirmation, and a recorded reviewer/timestamp. Trusted domains alone are not proof; legacy rows missing this provenance are not shown to students as verified.
- Lightweight server with no application runtime dependencies beyond supported Node.js built-ins.

Exam patterns are marked with explicit audit metadata where available. Full mocks now use a persisted paper blueprint for section counts, marking, and total duration. Real Exam Mode locks difficulty to the exam-style mixed set; Practice Mode can target a difficulty. Section timers are enabled only when the audited pattern declares them (currently SSC CGL Tier-I: four sequential 15-minute sections). UPSC CSE Prelims totals and marking are recorded separately from the approximate practice-only subject split; SSC CGL Tier-I and RBI Grade B Phase-I have official-baseline metadata and disclose known runtime gaps. SSC CGL's official 15-minute sectional timers, SSC CGL Tier-II, UPSC Mains descriptive papers, and RBI Grade B Phase-II descriptive papers are not currently fully implemented. Admin-customized patterns are preserved and flagged for review rather than silently overwritten. Always check the linked current official notification before relying on an exam pattern.

## Technology

- Node.js (version 22 or newer; uses the built-in `node:sqlite` API)
- Native HTTP server and Fetch API
- SQLite database
- HTML, CSS, and browser JavaScript in `public/`
- Railway deployment; persistent storage mounted at `/data`

## Run locally

1. Install Node.js 22 or newer.
2. Clone the repository:
   ```bash
   git clone https://github.com/ayushkumthakur/exam.ai.git
   cd exam.ai
   ```
3. Configure environment variables as needed (see below).
4. Start the server:
   ```bash
   node server.js
   ```
5. Open http://localhost:3000.

The project has no separate package installation step for runtime dependencies. Use a current Node.js 22+ release that supports `node:sqlite`.

## Configuration

Set variables in your deployment environment or local shell. Never commit API keys, passwords, or production secrets to Git.

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port; defaults to 3000. |
| `NODE_ENV` | Set to `production` for production cookie/security behavior. |
| `DATA_DIR` | Directory for persistent app data and the application secret. Back this directory up. |
| `AI_PROVIDER` | Primary provider: `gemini` (default) or `anthropic`. If it is unavailable, the other configured provider is used for timeouts, network errors, HTTP 429, and HTTP 5xx responses. |
| `GEMINI_API_KEY` | First secret API key for Gemini; required if Gemini is the primary or backup provider. |\n| `GEMINI_API_KEY_2` | Optional second Gemini key, used if the first hits quota/authentication or transient errors. |\n| `GEMINI_API_KEY_3` | Optional third Gemini key, used if earlier configured keys fail with retryable errors. |
| `GEMINI_MODEL` | Optional Gemini model override; defaults to `gemini-2.5-flash`. |
| `ANTHROPIC_API_KEY` | Secret API key for Anthropic; required if Anthropic is the primary or backup provider. |
| `ANTHROPIC_MODEL` | Optional Anthropic model override; defaults to the model configured in `ai.js`. |
| `ADMIN_EMAILS` | Comma-separated email addresses granted admin role by the application. |
| `RESEND_API_KEY` / `resend_api_key` | Email provider key, if configured in your deployment. Keep only the variable name your deployment code actually reads. |
| `MAIL_FROM` | Sender address for configured email delivery. |

Production checklist:
- Use a persistent volume for `DATA_DIR` (the current Railway service uses `/data`).
- Keep API keys and application secrets private; rotate any key that has been exposed.
- Do not leave temporary admin-bootstrap variables configured after a one-time recovery.
- Configure email delivery if real email OTPs are required.
- Back up the SQLite data and test restoring the backup before a production handover.
- Review provider quotas and costs before enabling AI generation for public users. Admins can inspect in-memory AI usage, token counts, API errors and Gemini key-slot rotations from the Admin dashboard; counters reset on server restart and are not a billing ledger.

## Tests

Available npm scripts:

```bash
npm test       # AI question-quality regression tests + smoke tests
npm run test:e2e
```

The end-to-end smoke runner uses an isolated temporary data directory. Do not treat local automated tests as proof that every production integration has been exercised. Before transferring ownership, run the tests on the exact commit being sold and manually verify signup/login, question generation, test submission, score persistence, and results in the target deployment.

## Deployment

The live instance is currently deployed on Railway from the `main` branch. To deploy elsewhere, use a Node.js 22+ host that supports persistent disk storage and environment variables, set the required configuration, and run:

```bash
node server.js
```

Ensure the SQLite data directory persists across restarts and deployments. Never delete or replace the production data volume as part of a routine redeploy.

## Buyer handover checklist

- [ ] Buyer can access the repository and has confirmed the commit/hash being purchased.
- [ ] Buyer creates their own hosting account and configures their own secrets/API keys.
- [ ] Buyer receives setup and deployment instructions.
- [ ] Buyer verifies admin access and tests signup, AI generation, mock submission, saved results, and email flows.
- [x] Local SQLite snapshots are created automatically after startup and every 24 hours; each snapshot is integrity-checked and the newest 7 are retained by default. Set `DB_BACKUP_KEEP` to change retention (1–30).
- [ ] Off-site backup is not configured: local snapshots share the Railway persistent volume and do not protect against volume loss. Configure external object storage and test a restore before treating disaster recovery as complete.
- [ ] Any third-party provider accounts, API usage costs, domains, and hosting are transferred explicitly or excluded in writing.
- [ ] Ownership, included assets, support period, payment terms, and permitted use are documented in the sale agreement.

## Current limitations to disclose

- AI features depend on the configured provider, API key, model availability, quota, and network.
- Real email delivery requires valid provider configuration.
- Exam patterns, syllabus data, and question coverage must be verified against current official sources.
- A successful deployment or smoke test does not guarantee every live integration or edge case has been tested.
- Hosting, domain, API usage, and email-provider fees are separate unless the sale agreement explicitly includes them.

## License and sale terms

The repository currently declares the ISC license in `package.json`. Before selling or transferring the code, confirm that you own or are authorized to transfer all code, content, dependencies, logos, and other assets, and specify in writing what rights the buyer receives. Do not advertise user numbers, revenue, verified PYQ coverage, or test coverage beyond what you can substantiate.
