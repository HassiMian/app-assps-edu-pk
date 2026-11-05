# ASSPS A199 — Saved Papers V5 source recovery and assessment reopen safety

Date: 2026-11-05
Branch: feature/a199-saved-v5-source-recovery-20261105
Production: https://app.assps.edu.pk/paper-generator
Status: isolated SOURCE RECOVERY verified; LIVE PRODUCTION NOT MODIFIED.

## Why this was needed

Production index importmap points to SavedPapersTab-ASSPS-UNIFIED-RECOVERY-v5-20261031.js, whose minified bundle includes 3 distinct sources:
1. browser-local saved papers;
2. authenticated server Assessment Studio revisions;
3. authenticated Paper Vault read-only originals and independent editable copies.

Existing recoverable JSX on feature/a195-diary-typography-controls included only local papers. Searching 987 SavedPapersTab.jsx files across workspace and /var/www did not find equivalent three-source JSX. A normal full frontend build could overwrite current V5 functionality.

## Source work completed

- Added reviewable read-only assessment and Vault source component AssessmentStudio/SavedPapersV5Panels.jsx.
- Added pure tested source normalization, Vault original export and independently editable unapproved copy helper in AssessmentStudio/core/liveSavedPapersV5.mjs.
- Preserved existing SavedPapersTab.jsx local browsing, rename, duplicate, delete and paper statistics.
- Recovered Vault source via authenticated read-only detail GET, verifies matching returned record identity before download/copy, preserves original read-only source.
- New Vault editable copy deliberately strips published and approval authority, preserves source reference and starts as UNSAVED_NEW_COPY.
- Server-saved assessment listing distinguishes metadata-only/historical records from actual editable revisions. Missing revision button is disabled.
- PaperGenerator.jsx no longer falls back to an unverified empty local document after a server-only draft reopen error.
- API lists are fetched from authorized server endpoints; old data hidden when account/school identity changes; unauthorized responses are surfaced rather than bypassing checks.
- No real teacher/student data and no production DB writes were used in tests.

## Evidence

- Unit tests for source normalization, deduplication, original Vault preservation and independent draft: 2/2 PASS.
- Browser source test: local Saved Papers, server Assessment 4, historical revision disabled, Vault editable copy, original JSON export, search, refresh, unauthorized denial and failed server reopen: PASS, zero page errors.
- Full PaperGenerator browser integration: failed server GET does NOT navigate to editor or create fake blank paper: PASS.
- Built frontend static bundle browser test: actual dist route loads all three sources: PASS.
- npm run build: PASS.
- ESLint changed files and browser tests: 0 errors, 0 warnings.
- Existing assessment offline recovery tests: 6/6 PASS.
- Existing A195 Daily Diary browser acceptance: PASS.
- A197 Diary built-asset preservation guard: PASS.
- A198 Saved Papers guard: previous live V5 and recovered modular source/build both PASS; legacy main source BLOCKED.
- Current live website: HTTP 200 and nginx -t PASS.

## Safety boundaries

The real production V5 bundle remains active and unchanged. Although source parity is verified with synthetic fixtures, exact visual/styling parity and a real authenticated teacher Save -> Reopen on the live school account are not yet independently certified. Do not blindly deploy the entire rebuilt frontend: newer versioned production hotfixes in attendance, marks, exams, Diary, and paper printing must be reconciled through SaaS Core release review.

Source branch requires review/forward-port into the canonical frontend and a signed rollback-ready release. No automatic production cutover was performed.
