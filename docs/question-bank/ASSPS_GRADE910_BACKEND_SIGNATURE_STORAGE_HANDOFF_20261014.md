# ASSPS Grade IX–X signed evidence backend — October 14, 2026

## Authenticated backend implementation
- Source-only route `/api/grade910-signoffs` under existing JWT `protect` and strict teacher/principal RBAC, mounted in `al-siddique-backend/src/server.js`.
- `POST /submissions`: independently validates JWT school/user/role against submitted claim, 2026–27/2027 original 56-catalog index, original source PDF SHA and original question-set SHA, personal signing time, PNG image hash and format, grade/medium, all eight teacher checks and revision-specific principal teacher receipt. Stores one idempotent **unverified** claim with original question & final answer revisions. Client-supplied `approved` or `published` flags are rejected.
- `GET /catalog`, `GET /submissions` (principal school only, teacher only own), `GET /submissions/:id/image` (privately decrypted principal/own), `GET /publication-readiness`. No signature image bytes in list responses or logs.
- Signature pixels are AES-256-GCM encrypted using **externally configured** `ASSPS_QBANK_SIGNATURE_ENCRYPTION_KEY` (64 hex characters), no key in source/DB. Content hash and auth tag independently verified. Routes fail closed if configured signed runtime role or encryption key is missing.
- PostgreSQL additive migration `al-siddique-backend/migrations/030_grade910_signed_human_evidence.js`: school/user FKs, actor, exact revision+evidence digests, pending-only immutable verification status, private encrypted bytes, idempotency unique key, no DELETE/UPDATE grant, FORCE RLS and required `core_security.signed_school_allowed(school_id)` guard, restricted NOBYPASS/NOSUPERUSER role grant. **Migration MUST be owned/deployed by SaaS Core on the latest canonical signed runtime.**
- Frontend `/academic/grade910-signoffs` existing personal signature form now calls secure POST and requires a real server receipt before claiming upload. A private local JSON copy is also exported.

## Genuine status and dependencies
**Engineering API/storage code complete in isolated feature branch, NOT live deployed.** Real signed school-adopted book decisions received 0, independent teacher/Urdu authenticated question-answer revision reviews 0, academically approved 0, verified published 0, teacher-visible approved-only Paper Studio release 0.

PNG captures and logged-in user claims are evidence of submission, **not** cryptographic school-rules-roster certification, independent teacher correctness, printed exercise-page verification, 2027 board applicability or signed immutable publication eligibility. Existing separate Ed25519 school-root institutional signature verifier and qualified human reviewers remain mandatory. A principal can personally submit only their real book decisions; an assistant must not sign as principal/teacher.

**Production gate:** SaaS Core must reconcile/merge to latest canonical code, securely configure the database runtime restricted role and new image encryption secret, run isolated restore/FORCE RLS with real restricted-role and cross-tenant HTTP tests, verify true teacher/principal authentication and Staff Login Access, verify backup/rollback, approve release/cutover. Paper Studio must separately implement and accept verified approved-only immutable published revision selector and actual teacher Save/Reload/Print. No production seeding or release was performed by Academic Master.

## Actual isolated test evidence
- New independent storage/crypto/role/pending-status suite: 10/10 PASS.
- New strict migration/source-signed guard suite: 5/5 PASS, including missing core_security signed guard, BYPASSRLS denial and missing restricted role.
- Optional local HTTP Express test (mock staff actors and DB, real HTTP routing): 1/1 PASS, including unauthenticated 401 and peer school invisibility.
- Frontend Vite 8 isolated full build: PASS.
- Real PostgreSQL 16 **QA cluster only**, port 55432, disposable database `g910_signoff_isolated_20261014`: extracted source migration executed successfully under synthetic safe QA signed-school predicate; observed `relrowsecurity=true,relforcerowsecurity=true`. Disposable QA database AND dedicated QA role removed afterwards; no production DB changes. This **is not production signed-RLS/role certification**.
- Existing full mission source/Paper Studio regression run recorded independently in `/tmp/assps-grade910-one-mission-evidence/mission-audit.json`, and a post-implementation run is needed before owner merge.
- Original 2,581 research question/answer/option revisions, 73 authoring source files, 43 historical papers and previous Academic checkpoints preserved.

**Publication release verdict: HOLD — real authenticated human approvals and Paper Studio/SaaS Core cutover are not certified.**
