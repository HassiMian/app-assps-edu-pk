# ASSPS Fee Voucher Studio V3 — Production release receipt (30 October 2026)

## User requirement
School billing must NOT require a student-by-student loop. Three scopes:
All Classes (default), Class-wise and One Student. Premium simple light
layout, next billing month default, template selection and non-print
preview, exam fee visible without scrolling, paper fund and other charges
behind a small disclosure. For each scope: review count, arrears,
discounts, duplicates and held identities, then explicitly create batch.

Design references:
- QuickBooks Online Advanced, October 2026 batch invoice review-before-save:
  https://quickbooks.intuit.com/learn-support/en-us/help-article/invoicing/create-multiple-invoices-batch/L6DLUcNG6_US_en_US
- Nielsen Norman Group, progressive disclosure for advanced controls:
  https://www.nngroup.com/articles/progressive-disclosure/

## Production fulfillment
- All 11 original Eight/Blue pupils already moved to Pre Nine/Blue in
  an auditable, owner-directed administrative correction. Their 11
  November fee challans were committed in a school-scoped RLS transaction,
  totaling PKR 98,100, from 11 exact real IDs. Three director-directed
  finals, one verified sibling discount, genuine October balance carry
  and the new Pre Nine PKR3,000 monthly rate were respected. No payments
  were recorded; no existing November invoice was duplicated.
- Last verified live November total: 322 unique invoices. Invoice balances
  may change as live school staff correct them; batch creation must never
  overwrite them, or promise an old aggregate is current.

## Backend implementation
- POST /api/fees/batch/preview, authenticated admin; scopes all/class/student;
  RLS read-only snapshot; previews every student, separately identifies
  already-created, held and ready, with exact 1x latest previous-period
  carried arrears, per-student fee profile, fallback class monthly rate
  and verified automatically eligible sibling discounts.
- POST /api/fees/batch/generate, same authenticated school user;
  requires matching SHA-256 preview fingerprint, SERIALIZABLE transaction,
  batch INSERT and enforced unique(student,month,year) index; either every
  ready row is inserted or the transaction rolls back. No payment status
  changes; new rows start unpaid and paid_amount=0.
- Paper fund, exam fee, other fee are opt-in separate heads with zero defaults;
  old unpaid paper fund remains in carried prior balance and is never
  automatically added twice. Columns exam_fee and other_fee were
  added through scoped, rollback-tested schema migration with defaults 0;
  existing invoice values were not rewritten.
- Historical unresolved November cases and separate pending class correction
  remain excluded across months until legitimately reconciled.
- Anonymous batch API requests return HTTP 401.

## Frontend rollout and isolation
- Fee Creation Studio replaces old long form specifically for /fees routes;
  full compile succeeded, 85 JS build files, zero missing imports.
- A new cache-busted scoped bootstrap loads the reviewed fee V3 entry
  only on fee routes. All nonfee routes retain the exact original
  production entry, preserving the existing assessment, Paper Studio
  Nastaleeq print, and promotion-auth emergency hotfixes. Crossing fee
  / nonfee shell boundaries triggers a full reload so React versions
  never share a single document.
- Live static index, new scoped boot and new FeeModule assets verified HTTP
  200; source import dependencies verified present. Original HTML and
  boot backed up in root secure archive for immediate rollback.
- Non-authenticated browser cannot complete a principal end-to-end UI save;
  do not claim an authenticated interactive acceptance test took place.

## Verification
- Source unit tests: 10/10 PASS (input validation, fees, session, discounts,
  duplicate preservation, read-only planner behavior).
- Read-only actual school November all-classes preview:
  329 eligible, 322 existing, 7 held, zero new. Pre Nine has all 11 existing.
- Read-only December all-classes preview:
  329 eligible, 318 ready, 11 held, zero existing. NOTHING generated for December.
- PM2 apex-backend online after restart; unsigned bulk preview HTTP 401.
- Existing November 322 invoices protected, and original fee-table data
  backed up. No separate payment or source student update was performed
  by this UI release.

## Rollback
Restore /root/secure-archive/assps-fee-batch-v3-20261030/frontend-index-before.html
to /var/www/assps-releases/promotion-auth-v2-20261030/index.html for immediate
frontend rollback. Existing old assets are intentionally untouched. Backend
feeRoutes-before.js and backend-dotenv-before are backed up in same private
folder; the two optional new numeric fee columns are additive and need not
be dropped to roll back the feature.
