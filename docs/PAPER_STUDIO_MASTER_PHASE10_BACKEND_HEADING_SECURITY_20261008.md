# ASSPS Paper Studio Master — Phase 10 rich heading backend validation

Date: 8 October 2026 ~17:54–18:04 UTC. Status: isolated implementation and bounded regression PASS; **PRODUCTION HOLD**.

## Verified immutable baseline and handoff

- Exact parent: clean pushed Paper Studio Phase 9 `4bbfacc47ddfc1e26f39ea1b71866a4d4919b149`, not a stale Paper Editor source. Worktree `/root/workspace/assps-paper-studio-master-phase10-20261008`, branch `feat/paper-studio-phase10-rich-validation-20261008`.
- Verified production live release metadata: frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`, backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`, before editing. Never changed live deploy, school DB, data, role, RLS, keys, teacher/paper records, PM2, SSH, Nginx or firewall.
- Reviewed GitHub coordination issue #4 current SaaS Core Phase10 `12089d21b6f5c61349ce165ebe9ec8180f6e9a73`, Paper Studio Phase9 and other owner milestones; reviewed canonical Paper Studio handoff from coordination worktree in prior phase. Its print, Saved Paper and official document protections remain authority; older full ChatGPT transcripts remain incompletely accessible byte-for-byte.

## Genuine remaining security gap and narrow mitigation

Paper Studio Phase9 introduced optional `PaperDocumentV2.sections[].headingFormatting` to preserve independently edited serial and instruction styling through authoritative server revisions. Existing production-style Assessment Studio backend `validatePaperDocument` only checked document format, origin, schema version, source identity and that `sections` is an array. It had **no HTML allowlist for that new field**. This gap is found in source review, not asserted as a live exploit or observed stored attack.

New `al-siddique-backend/src/services/assessmentHeadingFormattingGuard.js` validates *only the optional presentation field*. Rejects nonstring/oversized (>16,000-character per fragment), unknown shape/properties, unbalanced/malformed tags, unsafe tags such as script/svg/img/a, event-handler attributes, arbitrary style/position/URL/animation CSS, duplicate style or attributes, and invalid direction. Allows exactly the existing Paper Inline Editor semantic formatting tags and bounded CSS font/size/color/weight/italic/underline/vertical-align/display/Urdu optical skew. Safe Urdu `(✓)` in LTR span and Urdu Nastaleeq font family remain allowed. Does not rewrite document text or mutate/recalculate marks.

`assessmentStudioRoutes.js` integrates this guard into the **existing** `validatePaperDocument` before opening the DB revision transaction or hashing any new revision; invalid requests return HTTP 400. Existing legacy/plain optional-absent documents still pass. No independent signed-RLS implementation was added. SaaS Core must selectively review/forward-port this two-file security boundary onto its current restricted-route source; never transplant the older transaction/authorization code from this Paper Studio branch.

## New executed regression evidence

- `node --test al-siddique-backend/src/tests/assessment-heading-formatting-guard.test.js al-siddique-backend/src/tests/assessment-heading-http-boundary.test.js`: **4/4 PASS**.
  - Positive real editor HTML and Urdu RTL punctuation/font fragments; legacy documents without optional formatting; text/marks immutable.
  - Negative script, image/SVG, event handler, unsupported tags, injected CSS/layout, duplicate styles/attrs, bad nesting and >16,000-character fragments rejected.
  - Real Express router (not hand-rolled endpoint) on ephemeral localhost port with synthetic in-memory DB and deliberately synthetic authentication: **five malicious POSTs HTTP 400 before any DB connect**, unauthenticated HTTP 401, safe revision POST HTTP 201 and exact same JSON on authoritative GET HTTP 200, hash parity verified, optimistic lock stale POST HTTP 409. Initial test failure was only the mocked 401 response text being parsed as JSON; fixed the test fixture to emit JSON, then reran green. **Does not certify real JWT, database privileges, signing key or RLS.**
- `node --test` frontend canonical/document + Chromium Save/Reopen/Print targeted suites: **14/14 PASS** (Phase 9 canonical 13 + Chromium 1), source/frontend compatible.
- `npm run verify:templates`: **PASS** — all 6 protected templates unchanged. `npm run build`: **PASS**, 2,519 modules, 8.11 sec. Backend JS syntax and `git diff --check`: **PASS**.
- Prior Phase 9 official 43/43 Chromium print-text corpus, Urdu 9/9, DOCX 2/2 unchanged; **not rerun here** because this phase modifies only backend route validation and adds no official-paper renderer/template changes. No physical printer run.

## Pending real signed production-equivalent gate

1. Latest SaaS Core Phase10 signed tenant helper and Core Phase9 dedicated Paper login code are independent **clone-only** candidates; SaaS Core must integrate this new pure guard into its own signed version of `assessmentStudioRoutes`, then run actual `NOSUPERUSER/NOBYPASSRLS` Paper role + JWT Save/GET/conflict and XSS negative tests on a disposable DB with unchanged signed context. The synthetic HTTP test is **not** a substitute. Do not reuse / overwrite Core active clone listener 127.0.0.1:55432.
2. Paper Studio must complete actual logged-in teacher rich bilingual server-revision reopen / PDF / DOCX / real printer and long-page/odd two-column RTL acceptance; issue #3 remains open for full operational closure. Phase3AE intent/PG18 recovery under issue #2 remains source/runner-blocked.
3. Grade IX–X Academic Master still has zero independently approved source-checked snapshots. Unreviewed question drafts cannot be published or represented as verified.
4. SaaS Core alone owns deployment certification, production artifact reconciliation, RLS/grants, privileged bootstrap, ingress/perimeter, staging restore/rollback and formal promotion. **RELEASE HOLD.**

Rollback: revert one isolated feature commit (scope only service, route, tests and evidence); no production rollback performed or authorized.
