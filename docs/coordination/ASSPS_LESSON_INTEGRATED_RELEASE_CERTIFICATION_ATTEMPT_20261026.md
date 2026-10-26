# ASSPS Lesson Planning — integrated candidate & live release certificate attempt
**Date:** 26 October 2026 (PKT)
**Scope:** existing Final SaaS Audit master mission; isolated candidate engineering, live READ ONLY gates; NO production cutover.
**Decision:** SOURCE ACCEPTANCE PASS / PRODUCTION CERTIFICATION NOT ISSUED — G11/G12 RELEASE HOLD.

## Branch reconciliation
- Parent: `fix/assps-lesson-proposal-provenance-20261025` at `02258ff01a1a323e5f178e66013e91a263ebb14e`, incorporating original-source replay hardening on top of `ad0de945`.
- Cherry-picked independent `fix/assps-lesson-client-tenant-delivery-20261025` commit `226365c2577b4c03663ee0b7f4b2ea6675807ad2` into clean, isolated `integration/assps-lesson-cert-candidate-20261026`; preserves account-specific lesson recovery and authoritative save/share/delete receipts.
- Reproduced negative A/B original-source page-bound test from the divergent `fix/assps-lesson-provenance-failclosed-20261025` branch: 1 of 3 source-lock tests FAILED before repair. Ported only the nonconflicting Second Term A/B page immutability and audit-warning protection; retained First/Third Term proposal editability and latest replay-origin guards. Re-ran: 3/3 PASS, combined term-model tests 21/21 PASS. Original divergent branch has NOT been blindly merged.
- Protected originals, proposals, teacher identity, independent A/B source semantics, unknown legacy drafts and source boundaries cannot be silently elevated or overwritten.

## Fresh integrated acceptance
- Focused Node source/term/lesson/diary/calendar/receipt suite: **71 PASS, 0 FAIL**.
- Backend pure and fixture-route suite: **38 PASS, 0 FAIL**.
- Safe simulated HTTP source/provenance suites: **8 PASS, 0 FAIL**.
- Python Lesson contract/gate tests: **14 PASS, 0 FAIL**.
- Python teacher read-only audit/reconcile tests: **14 PASS, 0 FAIL**.
- **145 total focused Node/Python safe-source tests PASS** (71+38+8+14+14), plus **3/3 independent disposable PostgreSQL-backed HTTP/integration suites PASS**; total **148/148 distinct selected test cases PASS** on final verified runs. They are not live-school authenticated tests.
- For the three formerly excluded DB suites, initialized a separate PostgreSQL 16 cluster under `/tmp/assps-lesson-qa-20261026/data`, Unix-socket-only at port 5444, no TCP listener and a test-only `assps_lesson_qa_20261026` database. Verified `current_database()`, `inet_server_addr()=NULL`, and exact data directory before any migration. Applied test-only subscription and main schema migrations. The initial blank-DB main migration exposed missing subscription schema and a seeded-table sequence collision; corrected **only inside the disposable QA cluster**; reran the three test suites: `lesson-plans-http` PASS, `lesson-planner-cognitive-http` PASS, `lesson-planning-cognitive-http` PASS. These failures were disposable bootstrap prerequisites, not proof of a live app defect. No copy or clone of the real `apexos` database was used.
- Changed-file ESLint PASS, optimized Vite build PASS, production source safety script PASS, git diff --check PASS.
- Independently executed **3 synthetic browser acceptance flows**: Lesson Plans account-switch/login/recovery/real returned revision and portal receipt 1/1 PASS; six-subject Term POST→PUT revision1→2, reopen and A4 PDF PASS; five fictional students 2, 3, 4 cards/sheet PASS. All intercepted backend APIs; NO production credentials, live publishing, actual users, real pupil PII, physical print or real school transaction involved.
- Those PostgreSQL-writing suites were **never** run against live `apexos`; only the independent disposable QA database was used. Their PASS evidence is test-environment-only, not live production certification.

## Live READ ONLY, 26 October
- Website HTTP 200; backend health HTTP 200; anonymous `/api/lesson-plans` HTTP 401; Nginx syntax PASS.
- School 1: **3 saved Lesson Plans, 0 sent to portal**, 54 active formal teacher-class assignments, 12 verified assigned teacher identities, 19 active teacher accounts, 336 teaching slots; 12 timetable-user-employee links verified by scoped aggregate.
- `public.lesson_plans`: PostgreSQL RLS enabled and FORCE RLS enabled; unsigned runtime role READ ONLY sees School 1 0 rows, School 2 0 rows. This negative role result does not certify authenticated JWT-positive school-specific access.
- Serving Nginx root: `/var/www/assps-releases/baseline-20261022-1404`; current index SHA256 `aebad446888f85bceaf6ebb2aec9fb458761eef6e07aa6e6db2dd1c1003bff8a`. Isolated candidate dist index differs: `fea2e14715a27c3aa4a306035700af62d825e2d935d41cc1e37ad2e50bfaa4ae`. Thus this integrated candidate is NOT deployed.
- Correct-root preflight: **exit 2, HOLD_NOT_LIVE_CERTIFIED, deployAuthorized=false**. Protected notices+diary routes match, but exam route differs; live signed marks revision dependency and migration 034 are absent; signed cross-school & roster acceptance, physical Urdu print, independent off-host recovery and provenance are missing.

## Remaining independent release blockers
1. 59/59 source candidates in pinned source-review baseline lack signed independent subject-owner and academic QA, so broad academic teacher delivery MUST remain blocked. Preserve original Second Term source pages, existing three Class Five original-date collisions, and mark missing First/Third Term pages as UNSOURCED. No fabricated approvals.
2. Genuine authorized School 1 Principal/Teacher session, password-change, School 2 peer denial, CRUD revision conflict, save→reopen→edit→publish and recipient authorization have not been proved in live signed browser sessions. Zero shares currently exist; no fabrication of delivery.
3. Real authenticated Urdu/Jameel PDF→printer physical A4 verification not witnessed. Synthetic PDFs cannot count.
4. Independent off-host restore of both PostgreSQL clusters and all current runtime media, signed rollback, exact source+bundle ancestry, complete security/RLS/cross-tenant matrix and official Core-controlled cutover not certified.
5. A separate latest Core audit reported P0 cached private CDN media exposure and lacks provider-authenticated purge + repeated entire-inventory GET/HEAD denial; no authorization to treat transient 404 as cleanup. Requires independent current retest and signoff.
6. Live exam/marks revision dependency divergence, historical First Term score/grade actor attribution and pending official subject approvals remain cross-module release HOLD.

No production SQL DML/DDL, marks/result/diary changes, account impersonation, academic signoff, teacher publication, printer job, cache purge, Nginx/PM2 restart, CDN action or deployment was performed.

**Release threshold:** Do not issue a complete Lesson Planning production certificate merely because isolated code/tests pass. Only an authenticated, end-to-end, approved and rollback-ready witnessed Core release meeting every gate can earn GO. The current result remains **HOLD**.
