# ASSPS Unified Live Frontend + Secure Core Reconciliation — 19 October 2026

Status: **INTEGRATED SOURCE BUILD PASS — RELEASE HOLD / NOT DEPLOYED**

This two-parent isolated merge does not replace production artifacts.

## Exact provenance
- Core-security parent: `0c9b7063811571ec4224951a1fd09247930159f8`; includes prior `a52ee445` timetable write and private HR guards, and `825f2a4f` Lesson/session identity integration.
- Verified running-frontend source parent: `f4a2a340f0b94d41fe152012079b55d7f82779f2` from /root/workspace/assps-term-planner-mission-20261015 (clean).
- Exact live `/var/www/assps-timetable-notices-unified-20261019` files are **97/97 identical** to `f4a2a340`'s `al-siddique-frontend/dist`; live index SHA256 `8216276411fce912309767361e0f23e8a445106aa3b5eefe629c3ed0fceb2958`.
- Verified live frontend parent preserved on origin `preserve/live-timetable-notice-frontend-20261019`.
- Core and frontend histories diverged: prior comparison `24 older-only / 164 Core-only` commits, common ancestor `9a631af22759b72d9302650c46569df3ced7ec70`.
- Isolated worktree /root/workspace/assps-unified-release-reconcile-20261019, branch integration/assps-unified-live-reconcile-20261019.
- 18 merge conflicts manually resolved in isolated worktree. Latest Core backend/auth, paper result safety, MarksRegister and lesson async auth retained; latest live timetable/Notice Studio UI restored. Current Notice Studio API hardening retained and protected Bell/Date Sheet source routes present. No original dirty agent worktree mutated.

## Corrections and regression protection
- School timetable print no longer injects ASSPS-specific branding/address into other tenants; uses current school branding with escaped HTML, acceptable logo URL, actual academic year where supplied, visible verification-pending label rather than inventing approval.
- Protected School Documents print no longer defaults to School1 name/address for other schools. Confidential private employee notice UI retained.
- Duplicate sidebar Notice entries removed; /school-documents and /notices aliases plus /timetable/timings route included.
- The latest Core safe session renewal, first-password-change, tenant-scoped Lesson integration preserved.
- Original Paper templates and marks semantics remain protected.

## Reproduced QA
- Nginx and Postgres actual production **not touched** by this branch.
- Merged frontend Vite production build PASS (fresh unserved output `dist-unified-20261019`).
- Selected touched JSX ESLint PASS, 0 errors (3 preexisting warnings).
- `node ops/production-safety-check.js` PASS; `git diff --cached --check` PASS.
- Merged source 104/104 selected backend/Notice/Timetable/Auth/Lesson identity tests PASS.
- Merged source 2/2 Lesson Planning Chromium browser mocks PASS.
- Protected 6/6 Paper templates unchanged.

## Pending release conditions
1. Confirm exact backend actual deployed source hash and code ancestry separately from historical release metadata.
2. Repeat dual-tenant real PostgreSQL signed RLS test on disposable clone; main role/notice fallback with unset `app.rls_enabled` can see 18 School1 docs; 85 forced tables includes three Notice family tables. Not certified.
3. Complete independent offsite encrypted backup+both clusters' **restoration**; current 2026-10-19T013648Z dual-cluster backup checksum 4/4 PASS is local only.
4. Approved 16-Oct PDF SHA256 `9ac81002d2bc67cc748ece72b637c6cc081c8e1f23d1551d594031deea7e70c4`: 336/336 weekday teaching slots present, six Nine/Fatima/P7 display title aliases, same genuine teacher user ID 2386. Old 14-Oct provenance on 336 records requires exact, signed migration/review before write enable. Class Four+Five overlaps verified as 12 shared class-day slots.
5. `teacher_class_assignments` has zero active rows; 3 saved lessons, 0 shared; 59 original source candidates with no independent Academic signoffs. No blanket permission grants/publication.
6. Genuine School1 Principal and 2 Teacher logins, peer School2 denial, actual Save→Reopen→Urdu A4 Print, physical Ricoh print acceptance still pending.
7. Controlled backend/frontend deployment only after approved backup, rollback, source safety and live acceptance. No stale branch re-deploy.

No code in this branch has yet reached live production.
