# ASSPS SaaS Core — Largest Unified Autonomous Completion Programme
**Programme:** ASSPS-UNIFIED-20261019 • **Release owner:** SaaS Core • **Status:** ACTIVE, PRODUCTION FINAL CERTIFICATION HOLD • **Approved operational mode:** zero routine human involvement.

> This document is the ONE programme architecture and engineering execution specification, not an independent competing agent or secondary project. Paper Studio, Grade IX–X Academic and APEX Connect continue as specialized ownership lanes feeding ONE Core-owned production release train. Never interpret an earlier chat, stale release sidecar, or a passing unit test as authority to mutate the live deployment.

## 0. Irrevocable business and safety invariants
1. **First Term 2026–2027 exams are COMPLETED, the Result Cards are ALREADY PRINTED, and their records are indefinite historical assets.** Marks entry or physical First Term result-card print is not pending. Never delete, reset, reseed, overwrite, replay, recalculate, move exam identity, truncate or silently regrade results, including real zero marks (zero must not be treated as NULL/blank). **Next terms use new exam IDs**, not Exam 8 or Exam 9.
2. Preserve all live Student, Examination, Paper Document, Question Bank, Timetable, Lesson, Diary, Attendance, Fee/Payments and Notice history and tenant boundaries. No invented marks, approved question rows, subject mappings, signature, textbook citation, or exam-year applicability.
3. Owner requests **zero routine human involvement**: no owner/staff/teacher commands, checklists, passwords, browser clicks, printing work, release approvals or technical issue resolution delegated back to humans. Use authorized agents, machine-to-machine proofs, read-only analysis, isolated tests and existing operational permissions. **Never impersonate a teacher, circumvent legitimate credential/approval gates, forge independent academic or hardware witnesses, bypass safety checks, or certify an unobserved activity**. If independently unattainable, mark ONLY the true gate HOLD without blocking unrelated safe engineering.
4. One deploy owner, Core; other source branches are feeders. Never blindly replace live source from a stale branch, force-push other's changes, modify concurrent worktrees or hide test failures. Core controls the sole rollback-capable release event.
5. Confidentiality: no student personally identifiable data or academic answers in logs, source, issues or public verification receipts. Files containing DB snapshots or signatures stay root-only, encrypted offsite when available. Never expose sensitive signature images through anonymous static routes.

## 1. Architecture: eight layered control planes

| Layer | Authoritative system | Agent-owned task | Release gate |
|---|---|---|---|
| A. Evidence & control | Git exact SHA, signed build manifests, Issue #4, read-only release receipts | establish one canonical ancestry; merge feature lanes | exact Git source + reproducible immutable bytes |
| B. Protected persistence | Production PostgreSQL apexos, separate other PG cluster; encrypted snapshots | stable IDs, zero/NULL preservation, migrations | before/after count/hash, RLS, audited restore |
| C. Identity and tenant boundary | existing signed Core actor, Principal/Admin vs Teacher, school/tenant scope | deny unverified actor and peer-school requests | genuine scoped login/session + runtime HMAC, negative cases |
| D. School academic structure | class/section/subject, official timetable, teacher assignments | 8-period schedule, 54 pre-authorized mappings, period constraints | serializable write, optimistic version, School2 denial |
| E. Learning delivery | Weekly/Term/Daily Lesson Planner + Diary, teacher/student views | subject-to-teacher mapping, draft/review/delivery, A4 | scoped Save→Reopen→Print, actual logged-in teacher evidence |
| F. Paper & Curriculum | Paper Studio canonical Workspace, PaperDocuments, Question Bank, syllabus provenance | immutable revision-bound drafts, scoring, Urdu RTL, DOCX/PDF and selected approved questions | archive source, no unauthorized question publication |
| G. School operations | Attendance, Fees, Results for future terms, Notices/HR, APEX Connect | scoped reliable CRUD with comprehensive audit trail | accounting invariants, correct recipient, School2 denial |
| H. Delivery & operations | Nginx, PM2, protected backups, Cloudflare, printer path, GitHub CI | atomic release, health, privacy, rollback and monitoring | immutable source, signed postflight, repeatable restore |

### Source ownership boundaries
- **SaaS Core** owns DB DDL/DML, RLS, critical backend route, auth, live deployment, Nginx and rollback.
- **Paper Studio** owns authoring/editor, original 43 protected official paper documents and six result templates, print/PDF/DOCX, early years and learner-facing UI, and only consumes qualified approved academic snapshots.
- **Academic** owns verified textbook/edition/syllabus/board identity, 2027 source applicability, independent per-revision expert approval of question content. AI advisory scores/automated math verification never invent independent sign-offs.
- **APEX Connect** owns projections/integration, authentic tenancy via Core, never owns an alternate source-of-truth school DB or broad permissions.
- **Unified programme manager** runs one release gate graph and writes one official mission evidence record in Issue #4. Parallel agents can continue independent source-only work; they cannot publish live versions independently.

## 2. Dependency graph — directed, not fragmented
```
First Term Historical Freeze ──┬── Source Fingerprint & Immutable Artifact
                              ├── Backup/DR Restore Gate ─────────────┐
                              └── Signed Actor + RLS + Audit Gate ────┤
Canonical Release Ancestry ─────┬── Timetable Safe Write ─── Lesson ─┤
                               ├── Paper Studio ── Approved Grade 9/10 ┤
                               └── Notices/Attendance/Fees/APEX ───────┤
Protected Result Cards ─────────┴── Future-term Results ───────────────┤
                 All release-critical proofs ──> Blue/Green Canary ───┤
                            Recovery rollback-ready ──> Atomic Promote
                                             └──────────> Postflight
```
**Default decision:** no source-certification or role-proof = **NO production cutover**, even when HTTP200 and synthetic suites pass. Continuation of isolated improvements remains authorized.

## 3. Unified execution phases, priorities, automated entry/exit criteria

### Phase 0 — historical foundation and exact live inventory (already in operation)
**Inputs:** live PostgreSQL apexos, previous signed backups and restore receipts, actual Nginx/PM2 and Git worktrees.
- Run read-only two-pass protected baseline verifier before and after any proposed change. Verified School1 Exam9=1,853 First Term results, 224 numeric zeros, 0 NULL; separate School2 Demo Exam8=1 row; total exam_results=1,854. School2 Demo is NOT First Term. Current students=326; school1 official teacher-class assignments=54; 3 saved lesson plans (0 shared at earlier scope).
- Retain one-time original rows/metadata SHA manifest mode0600; hourly fail-closed scheduled read-only monitor; fresh PostgreSQL full custom archive and its SHA. Protect all student and historical paper rows separately with snapshot-before-release.
- Reconcile existing latest critical backup manifests, encrypted off-host archives and BOTH PG cluster restores, with isolated restore compared to source SHA and counts. Same-host restore is NOT an off-host restore.
**Acceptance:** historical before/after exact SHA PASS; all relevant backup artefacts readable; named zero/NULL invariants; retention manifest cannot be reset; no destructive SQL.
**Recorded:** First Term read-only integrity PASS; fresh apexos backup, SHA/list PASS; hourly timer active; off-host independent decrypted dual-cluster restore not yet certified.

### Phase 1 — canonical frontend/backend source and release safety (P0)
- Lock release source ancestry from **current live**, not oldest compatible repo. Read latest Issue #4 before action; cross-check exact live Nginx assets + backend PM2 effective runtime, not only sidecars.
- Original release commit `575438b8…` Vite rebuild exactly reproduced the historical attestation index SHA `8fdadfe4…`, but active index `3c74d3be…` differs. Other Core stream published new source ancestor reproducing current live 98/98 visible assets; **198 older/unattested live assets and differences in live backend remain**. Preserve file manifest and original bytes. Do not repin mismatched metadata to declare success.
- Inspect exact entry and dynamic import dependencies (live referenced JS/CSS), classify 198 extras as unreachable leftovers vs runtime-loaded assets, verify all entry transitive dependencies, CSP/network references, hash parity and exceptions. Determine whether pruning can be safe ONLY within a versioned candidate output, not in the active directory.
- Compare 710 live backend JS/JSON with newer canonical candidate; protect 18 differing and 171 live-only paths (latest verified in Issue #4). Forward-port only source-attested security additions and ensure no missing operational endpoints or API behavior. Stage non-destructive immutable release directories with atomic pointer and preflight; no live copy-in-place.
**Acceptance:** exact source build reproducibility, all loaded asset hashes, frontend/backend lineage, no missing independently owned route, reversible release. Distinguish source parity from auth certification.
**Current:** current lived served index is not attested by its sidecar; full release HOLD; isolate code-only investigations permitted.

### Phase 2 — identity, signed context, authorization and tenant isolation (P0)
- Auth: actual principal/teacher account access through **authorized existing sessions or approved machine credentials**, including first-password-change and invalid token denial. Do not know/reset staff credentials without lawful authority.
- Enforce signed HMAC actor context for all data-access paths, FORCE RLS, explicit School1/School2 tenant binding, endpoint authorization for class+subject assignments (54 already granted; never duplicate), principal-only mutating timetable/approvals, reject 0 permission, reject subject mismatch and cross-tenant overrides.
- Verify all 85 currently cataloged RLS policies by exact SQL deparse and tested authorized requests; distinguish catalog PASS from real authenticated enforcement. Notice/HR recipient audience MUST deny different teacher within same school.
**Acceptance:** independent Principal/Teacher/School2 positive and negative authenticated tests, signature/session integrity and expired/absent tokens, signed actor RLS, 0 privilege overreach, documented adverse errors. If approved identities unavailable, keep auth witness HOLD (no forgery).

### Phase 3 — Timetable + teacher assignments + Lesson Planner + Diary (P0 operational)
- Treat 54 approved assignments across 12 teachers as final source; no second inserts. Reconcile 405 timetable rows and official 8-slot bell schedules for regular + Friday, combined-class constraints, section identities, 12 shared-class patterns/6 historical exceptions.
- Legacy `POST /api/timetable/save` is intentionally HTTP403 because DELETE/INSERT fallback unsafe. Replace only via Core reviewed signed Principal-only **atomic** transactional write with valid 8 slots, row/school teacher validation, concurrency CAS, no empty payload, rollback and tenant denial. No direct unguarded route override.
- Lesson Planner: 3 saved but 0 shared; 59 subject source groups remain academically held. Fix routing/login/loading, teacher scope, week/term/day schedule, assistant suggestions separated from approved teacher-facing plan. Do not auto-publish teacher-approved content without evidence; drafts are safe to stage.
- Diary: language-specific English/Urdu polished prompts, class, dated rows, original page/exercise numbers, no AI-invented schoolwork; Save→Reopen→Print with right-to-left Jameel Noori/Nastaleeq source and print parity.
**Acceptance:** authorization+transaction tests, isolated PG restore, actual authenticated Teacher UI Save/Reopen, no cross-subject publication, browser PDF/print structure. Physical Ricoh A4 witness remains HOLD unless independently genuinely observed.

### Phase 4 — Paper Studio, original papers, IX–X Question Bank (P0/P1)
- Protect original official 43 papers, six official Result Card templates, accurate marks, choice, MCQ/short/long scoring; legacy editor compatibility only, canonical Workspace editable. Ensure Urdu Nastaleeq RTL and Times New Roman LTR, both screen+print+Word/PDF; scoped selection across question number and heading (Issue #3), persistent authoring revision/one-time intent with real DB transaction (Issue #2).
- Freeze Grade IX/X overlapping source inventories: 2,581 original authored research variants, 2,411 separately provisional; 584 AI-advisory improvements (no auto-authority), 1,305 distinct review-blocked revisions. Selectable NEW approved current revisions remain 0 until independent curricular verification. Do not carry 2026 ALP notice to 2027 by guess.
- Exact textbook/official page/board year/stream/edition identity; no invented reviewer signatures; bound immutable approval rev. Teacher paper generator must never inadvertently expose unreviewed questions.
**Acceptance:** property tests for marks and choices, 2+ page browser print, authentic protected originals, signed RLS and source version, approved-only SQL and recovered save/print.

### Phase 5 — Attendance, Fees, Results, Notices/HR, APEX Connect (P1)
- Attendance: isolate Starter Save success-with-unmarked bug; test idempotent per student/day and cross-school denial; do not rewrite 13,770 old attendance values.
- Fees: audit 901 challans, 171 payments, 7 profiles and historic anomalies with immutable ledger; never fabricate, double-count or silently edit paid rows. Correct formula engine + partial receipts in new version with reconciliation, no direct historical migration without proof.
- Future-term Results: exam identity separate from historical 8/9; no result-card reprint required for completed First Term. Preserve 224 zeros, six result-card templates and historical print correctness.
- Notices/HR: fix same-school wrong-recipient leak with member-target security; 12 notices and 6 private punctuality docs preserved, seven pending HR templates not silently published; prove scope in real signed runtime.
- APEX Connect: vendor-neutral authenticated projection of Core state with stable contracts; 379/379 legacy tests meaningful but not a real tenant acceptance substitute; no alternative writable source of truth.
**Acceptance:** only correctly scoped actor sees/edits data, reversibility on failure, ledger uniqueness, APEX tenant parity, result/exam separation and authenticated user flows.

### Phase 6 — Complete automated testing and source validation (P0 release gate)
Run **tests against exact candidate commit** (not a mutable worktree):
1. syntax/type/lint, repository production-safety and protected asset hashes;
2. module unit/property tests, score/math/RTL/printing fixtures and frozen originals;
3. simulated malformed and credential/tenant negative requests, approval hold behavior;
4. isolated PostgreSQL upgrades on full anonymized clone preserving real schema+triggers, two distinct cluster restores and rollback migrations;
5. network-only current production health check separate from authenticated live read+write acceptance;
6. Chromium multi-role Save→Reopen→Print, class and section, both language directions, first-password change and peer-school denial;
7. concurrent race tests for timetable/fees/marks and out-of-date actor sessions;
8. checksums, migration output, signed immutable release manifest, full downstream asset graph.
**Release cannot be PASS** if a negative security test is skipped or privileged actors used as replacements for real scoped roles.

### Phase 7 — staging, production cutover and recovery (Core exclusive)
- Pre-cutover: freeze publish/agent collisions through legitimate release lock, get exact Git SHAs and existing live backend source snapshot, check First Term guard twice, compare 326 students/1,854 result rows/224 zeros and SHA, backup both PostgreSQL clusters + active backend/frontend config, verify encrypted offhost recovery as far as independently possible.
- Candidate: immutable content-addressed web root + isolated backend service/port + Nginx canary; smoke with authenticated role; rollback snapshot and tested dry-run; never mutate active directories. Full dual-cluster restore to disposable environment with ACLs/tenant projections; offhost independent restore must have true independent receipt.
- Promote ONLY on all release-critical gates pass; perform atomic symlink/PM2 switch with versioned undo, health double-check, DB hashes, public privacy/notice denial, paper renderer fidelity, next-term identity. Set auto-rollback on failed health or any data-integrity drift. Retain archives and signed postflight receipt.
**If any critical blocker unresolved: HOLD the production release, but do not stop isolated engineering.**

### Phase 8 — final production acceptance report
One signed/source-backed report, not staged misleading successes: exact production Git/backend/frontend SHA, deploy time, previously/live installed functionality, data row+hash parity, documented actual role/path tests, 2027-source and academic proof, backup/full restore/rollback and paper print evidence, all automated test jobs with numbers, risks and any honest HOLD.
Only mark **FULL SYSTEM VERIFIED / PRODUCTION READY** when no critical unverified acceptance remains. Provide final-only completion notice when that state is real; otherwise a transparent interim checkpoint can be recorded centrally without owner involvement.

## 4. Gate taxonomy
- **PASS:** independent, correct environment, exact source, real signatures/identities where required, reproducible evidence.
- **HOLD:** missing independent proof, incomplete migration, untrusted source ancestry, unreadable backup, unknown paper adoption, stale status, external witness genuinely absent.
- **FAIL:** actively demonstrated violation or regression; must fix + rerun. A safe HOLD is not an outage.
- **N/A with proof:** a gate is out of scope for a specific nonproduction-only source experiment; never N/A an end-to-end production requirement.

## 5. Risk register and controls

| Risk | Exposure | Required prevention / containment |
|---|---|---|
| First Term loss or true zero→blank | Irrecoverable school record corruption | immutable baseline + FOUR LIVE Exam9-only Core triggers + two backups + pre/post SHA |
| Unattested live frontend/backend | Hidden older assets/modified routes | source-reproducible entry and asset graph, immutable release and anti-reversal guard |
| Unverified signed actor and RLS | Student data across tenants/teachers | per-request signed context, FORCE RLS, real actor/School2 negative tests |
| Timetable unsafe DELETE/INSERT | Loss of 405 historical slots | keep 403 until scoped SQL transaction and optimistic concurrency |
| Lesson/Grade IX–X false approval | Students receive incorrect content | drafts only, revision-bound qualified signoff and syllabus-year provenance |
| Anonymous signature asset | Identity/branding misuse | exact Nginx 403+no-store already live; build verified authenticated alternative |
| Result Card/editor regressions | Printed cards/papers broken | protected layout hashes, PDF/Chromium/Urdu print acceptance before migration |
| Wrong-notice recipient | Confidential HR content leakage | per-user audience, no same-school wildcard |
| Fees anomaly/data replay | Duplicate/misapplied transactions | immutable journal, idempotency keys, exact money invariants |
| Storage 91% utilized at checkpoint | Backups/builds fail from low disk | monitor, bound candidate size, do not purge unverified archives |
| Concurrent agents deploy each other | rollback target drift | release lock, one Core promoter, non-shared worktrees, exact SHA checks |
| Backups only on original VPS | Disaster recovery false confidence | independently decrypted off-host copy and full PostgreSQL ACL restore |
| Missing human-only signoff | False compliance/certification | HONEST HOLD, never invent signatures or impersonate reviewers |

## 6. Current factual checkpoint for next run (19 Oct 2026 ~16:42 UTC)
- Source: GitHub Issue #4 latest Core candidate `fix/core-live-timetable-guard-reconcile-20261019@04b3d53aff1a54710ac95761ddea0b2bb28679d1` (source-only) and separate protected audit branch `audit/assps-firstterm-historical-retention-20261019@2aefdfae8ba76a6d2c1be14a1ca7f925c26efd05`; their features must be reconciled, never deploy the old audit base itself.
- Nginx root `/var/www/assps-resultcard-nazra-purged-20261019`, active `index.html` SHA `3c74d3be652b41549ef2129eaacec4c341c05c2118597e308edffd17a33726a9`. Sidecar previous SHA `8fdadfe4…` mismatches. Core agent independently reproduced newer live-frontend build 98/98 against `3f7fbfa4…`; signed integrated release still HOLD.
- Website, login, public branding, api root and api health HTTP200. Anonymous public principal signature HTTP403 and no-store; same file preserved privately. Timetable legacy unsafe save intentionally 403. Current PM2 backend and Connect online.
- Physical students 326, exam results 1,854, true zeros 224, 0 NULL, First Term School1 Exam9=1,853, School2 Demo Exam8=1; Core Exam9-only triggers active. Lesson plans School1=3, authorized teacher mappings School1=54. The real First Term SHA guard PASS; roll-back --check PASS. Critical backup `/var/backups/assps-critical-20261019T154045Z` exists, newer source comments assert 4/4 SHA PASS.
- Published privacy/First Term/reproducible-build evidence total 30/30 targeted tests (6 historical + 6 release-sidecar + 4 privacy + 6 reproducible-asset synthetic + 8 genuine disposable-PG negative). Historic exact Vite source at 575438b8 rebuilt to claimed sidecar SHA, but current entry differs. Existing production-safety check PASS; **no unified release certification**.
- Academic Issues #1, Paper Studio #2/#3 open. Genuine independent school-role acceptance, expert review, independent offhost restore, actual physical Ricoh Urdu print remain unverified.
