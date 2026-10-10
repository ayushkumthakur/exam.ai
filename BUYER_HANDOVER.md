# Buyer Handover Guide — Competitive Exam AI

This guide is intended for a buyer evaluating or taking over this repository. It is a technical checklist, not a contract or a guarantee that every external integration has been tested.

## 1. Confirm the sale scope before transfer

Write down exactly what is included:
- Source repository and the specific commit being transferred.
- Right to use, modify, deploy, and/or redistribute the code, as agreed in writing.
- Whether the live Railway deployment, domain, hosting account, database, and existing users are included or excluded.
- Whether any support period, bug-fix window, or future development is included.
- Third-party services, provider accounts, API usage, and recurring fees that remain the buyer's responsibility.

The repository currently declares the ISC license in `package.json`. Review that license and all third-party notices before promising exclusive rights. Do not describe the transaction as an exclusive copyright transfer unless the rights have been reviewed and the transfer agreement actually grants those rights.

## 2. Buyer setup

Prerequisites:
- Node.js 22 or newer with support for the built-in `node:sqlite` API.
- A writable persistent directory for application data.
- Optional AI and email provider accounts if those features are required.

Steps:
1. Obtain access to the agreed repository and check out the agreed commit.
2. Configure environment variables in the hosting platform or local shell. Never paste production secrets into Git, screenshots, issue trackers, or this guide.
3. Set `DATA_DIR` to a writable, persistent directory. For local development, use a private local directory; for Railway, use the configured persistent mount.
4. Start the app with `node server.js` and open the configured URL.
5. Configure the selected AI provider and email delivery only if required. Check `ai.js` and the current code for the exact variable names and supported provider values; do not assume every optional variable listed in examples is active.

## 3. Pre-transfer verification

Run these commands on the exact commit being handed over:

```bash
node --version
npm test
npm run test:e2e
```

The project uses built-in Node.js functionality and currently declares no runtime package dependencies. Test scripts may have their own environment requirements; follow any failure messages and inspect the test files.

Manually verify in the target deployment:
- Sign up and log in using a new test account.
- Complete onboarding and select an exam.
- Generate or start a practice/mock test.
- Answer questions, submit, and inspect the score and explanations.
- Refresh/reopen the results and confirm persistence.
- Test AI features only with a valid provider key and within the provider's quota.
- Test email delivery only if a real email provider is configured.
- Verify admin access using an agreed account without exposing passwords in logs or documentation.

Do not claim a check passed unless it was actually run. Local automated tests are not proof that every production integration works.

## 4. Data and security

- Decide explicitly whether existing user data is part of the sale. Do not transfer personal data without an appropriate legal basis and user/privacy obligations being addressed.
- If transferring data is agreed, make an encrypted backup, test restoring it in a separate environment, and document the transfer scope.
- If existing user data is not included, transfer the code without copying the live database or persistent volume.
- Remove temporary bootstrap credentials and test accounts from the handover environment.
- Rotate any API keys, mail credentials, and application secrets that may have been exposed or shared.
- Give the buyer their own provider accounts and secrets where possible; do not send secret values in this repository.
- Confirm that the buyer can access the hosting account they will own. Do not hand over personal account credentials when account transfer or a new buyer-owned account is the safer option.

## 5. Deployment and rollback

- Use a host that supports Node.js 22+, environment variables, outbound network access for configured providers, and persistent writable storage.
- Keep `DATA_DIR` on persistent storage; deleting it may remove the database and app secret.
- Back up data before changing storage, redeploying with a new volume, or migrating hosts.
- Deploy to a buyer-owned environment first and validate it before switching any domain or directing users to it.
- Keep a known-good commit and backup available until the new deployment has been verified.

## 6. Known limitations to disclose

- AI features require a compatible provider, valid API key, available model, network access, and sufficient quota; provider usage may cost money.
- Email/OTP delivery requires valid email provider configuration.
- Exam patterns, syllabi, and question coverage may be approximate and should be checked against official sources.
- Verified PYQ content must be checked for source accuracy and rights to reproduce; a source URL alone does not automatically grant republication rights.
- Hosting, domain, email, AI usage, and other third-party costs are excluded unless the written agreement says otherwise.
- A successful deploy and automated test run do not guarantee the absence of bugs or that every live integration has been tested.

## 7. Handover acceptance record

Fill this in jointly with the buyer and keep a copy outside the repository.

- Sale/transfer date: ____________________
- Repository and commit SHA: ____________________
- Included items and rights granted: ____________________
- Excluded accounts, services, data, and assets: ____________________
- Test run and date: ____________________
- Deployment URL/environment tested: ____________________
- Backup/restore status (if applicable): ____________________
- Secrets rotated and buyer-owned accounts configured: ____________________
- Known issues disclosed: ____________________
- Support terms, if any: ____________________
- Seller acknowledgement: ____________________
- Buyer acknowledgement: ____________________

This checklist does not replace a sale agreement. Obtain appropriate legal advice for jurisdiction-specific copyright, privacy, tax, and contract questions.
