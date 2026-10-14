# ASSPS SaaS Core + Paper Studio — Coordinated Mission 14 October 2026

## Mission and owner boundaries
SaaS Core owns tenant security, PostgreSQL/RLS, safe lesson review import, release gates, and production certification. Paper Studio owns class-wise lesson editing and print. Grade IX–X owns independent academic accuracy. APEX Connect owns its corrected Next/Nginx login branch and authorized API integration. GitHub issue #4 is the single coordination register. No dirty worktree was modified.

## Integrated source
New clean branch `integration/core-composer-global-worker-20261014` descends from verified Core+GradeIX–X+PaperStudio composer source `fabefbf546ff65f49d4657292110913a043e1726`, through composer readiness `57f19f108a206d38a144d864481e8fc32f0cbe6b`, and four validated agent-authored signed catalog/global-six-table QA commits, plus latest independently tested least-privilege AI-worker adapter source `350dce0d148083b771451bc2f42bcdca6fdae454` forward-ported safely. No force pushes, production migrations, service reloads, direct school marks writes or school records edits.

## Secure source and review
Original private Miss Adiba WhatsApp ZIP and extracted manifest remain root-only outside GitHub. Miss Adiba is a composer/forwarder, NOT the teacher for every plan. Immutable 59 review groups span 12 classes, with an unassigned Islamiyat message held separately. The staff-only class-wise review UI uses original message hashes, line/source attribution, distinct proposed corrections and source revision. Class and all-class print preview work in test Chromium. All three production write feature flags remain OFF.

New manager-only `GET /api/lesson-plans/planner/composer-review-readiness` reports 59 status rows without leaking original WhatsApp content, assigns no teachers, grants no approvals, sends no notifications and never certifies academic publication. Recomputes SHA-256 from actual stored source excerpt content, not merely the self-reported sourceDigest, to fail closed on source edits after private import. Cross-tenant and forged manager access are rejected. Even verified teacher/Principal inspection cannot create academic approval without separate real evidence.

## Agent coordination verified
The other active APEX/Core agent diagnosed inherited membership in apex_app_runtime allowing six global tables to the signed Green runtime; a naive REVOKE on Green would be ineffective. Incorporated their clean source only: current signed catalog fail-closed verifier, QA-only six-global staging/inverse tests and restricted AI-worker adapter. Experimental SQL is guarded to QA ports and WAS NOT executed on production. Genuine production worker role/credentials and staff signed acceptance are still absent; no pretend approvals or model-generated signoffs.

## Executed acceptance
- Integrated lesson planner backend targeted tests: **68/68 PASS**.
- Frontend composer review logic: **5/5 PASS**.
- Chromium mock-actor Save→Reopen→proposed correction→class + all-class A4 print preview: **PASS**. Genuine staff HTTPS login and physical Urdu Jameel Noori print still unverified.
- Optimized Vite production build PASS; new source ESLint PASS.
- Integrated latest worker negative configuration tests: **5/5 PASS**; signed catalog source tests **12/12 PASS**, six-global QA-source static tests **11/11 PASS**. Agent independently reported separate full-ACL clone PostgreSQL 14/14 for six tables; not a production certificate.
- Official Core integrated release runner source tests PASS (22 backend + 39 Python + 5 frontend) but overall exit **2 / HOLD** across **nine** genuine live security/academic/traffic gates. Read-only catalog independently confirms 77 signed guards and 77 allows and the exact six unforced, inherited global-table risks.

## Latest live no-write evidence
At 2026-10-14 18:18 UTC live frontend release metadata `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`, backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`; these must be rechecked immediately before any future release.
School1 lesson plans: **3** original staged rows, **0** published, exact payload checksum `97f380274f46a9d4a101f289410e7249`. Exam9 has **1,762** real marks including **213** real numeric zeros; active verified teacher-class assignments **0**. No live modifications in this mission.
Private source-specific backup SHA256 `10ab9f8992988f0cbc7f72f3c2cd2e93b5d50e0c0706cc67894fcb85256a9bd0`; separate prior PostgreSQL QA restoration confirmed same 3 rows/digest. Full production/traffic rollback is NOT proven by this module backup.

## Exact next release pipeline
1. Connect Master must certify genuine staff signed login on current HTTPS ingress, removing both Nginx unconditional dashboard redirects only in a controlled Next+Nginx transaction after independent signed rollback. No reuse of synthetic QA session.
2. SaaS Core must certify six inherited global privileges least-privilege production remediation and dedicated restricted worker credentials, plus real peer-tenant/unassigned teacher-denial acceptance and full roles+ACL rollback.
3. Actual school Principal-designated admin must inspect original sources; the proper school owner must sign real class/section/subject assignments and resolve textbook/term/source ambiguities. No automatic composer-to-teacher mapping.
4. Only then enable authorized private staged import of the 59 source groups with backup, per-class source integrity and idempotent receipt; no student notifications or publish.
5. Paper Studio must complete real staff Save/Reopen/Edit/Print including Urdu font fidelity and class batch printing; protect existing Paper Workspace, exam marks, results, fees, attendance.
6. Once every Core release receipt independently passes, preserve exact commit ancestry, build both components, deploy under rollback protection and certify live smoke/role/isolation/print behavior. Academic publishing is separate from software deployment.

**Certification: SOURCE-READY / PRODUCTION HOLD.** Neither mock HTTP browser tests, AI-generated academic suggestions nor general user authorization can replace real institution-signed evidence.
