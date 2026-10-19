# ASSPS ONE UNIFIED AUTONOMOUS PRODUCTION MISSION
Version 1.0 — 19 October 2026 — AUTHORITATIVE ENGINEERING PLAN AND RELEASE GATE

Scope: Al Siddique Scholars Public School SaaS Core, Hostinger production, and explicitly coordinated integrations. This is ONE programme with internal ordered phases, not separate missions. User and school-staff routine engineering/QA involvement target is 0.00%.

Production frontend: https://app.assps.edu.pk
Core API: https://app.assps.edu.pk/api/
Public health: https://api.assps.edu.pk/health
Repository: https://github.com/HassiMian/app-assps-edu-pk
Coordination: GitHub Issue #4; independently owned open Issues #1, #2, #3.
Infrastructure: Hostinger srv1769723, NOT AWS. PostgreSQL main apexos:5432 plus signed asspssigned:55432.

## Hard authorization and evidence rules

- Act through authorized connections; do not ask principal/teachers/staff to perform routine technical tests, configuration, migration, source repair or deployment tasks.
- Do not impersonate Principal/Teacher/School2 or invent credentials, academic reviews, print witnesses, curriculum approvals or external restore evidence. Use existing genuinely authorized identities and deterministic automation when available.
- Never bypass access control, tenant/RLS, academic approvals or rollback holds. If a requirement cannot be genuinely established autonomously, record BLOCKED/HOLD, preserve system, and continue other safe work.
- First Term ended and result cards were printed. School1 First Term is Exam9 only (1853 result rows, 224 authentic zeros, no NULL); Exam8 is School2 Demo Monthly Test (one distinct protected historical result). Preserve original printed cards, source paper content, all marks, exact genuine zero-versus-blank semantics, examination metadata and all historical documents. Future terms are new independent records; never replay, reseed, reset, fabricate or silently migrate First Term scores.
- Student data, fees, attendance, employee roles, school documents and independent APEX/JARVIS/AEGIS content are protected. Never globally DELETE/UPDATE on live school tables, force-push shared refs, clear old backups or edit another agent's dirty worktree.
- All release assertions must label evidence as LIVE, SOURCE, DISPOSABLE CLONE, SYNTHETIC HTTP, BROWSER, PHYSICAL or OFFSITE. No category substitutes for another.
- Autonomous execution happens only while an authorized assistant/tool session runs. There is no claim of unbounded unattended background work unless a verified systemd unit/authorized automation actually exists.

## Current verified baseline (refresh at every deployment preflight)

Frontend Nginx root /var/www/assps-resultcard-nazra-purged-20261019.
Served index SHA256 3c74d3be652b41549ef2129eaacec4c341c05c2118597e308edffd17a33726a9.
Clean reconstructed active frontend source 3f7fbfa4ed0cf893a83f0805f182f9d7264c069f: fresh Vite rebuild matched 98/98 currently served counterpart files. Current runtime has 198 additional asset files and a stale release sidecar. Do not repin metadata or delete extra files as a shortcut.
Core secure-source candidate 04b3d53aff1a54710ac95761ddea0b2bb28679d1, source-only; 56/56 selected tests, Vite build, targeted timetable ESLint and source safety pass. Active PM2 backend provenance NOT independently attested; closest worktree comparison: 521 matching, 18 different, 171 live-only JS/JSON/CJS/MJS files. Backend is NOT safe to replace wholesale.
Latest read-only baseline: physical students 326 (School1 322, School2 3, historical test-school 1); exam_results 1854, true zero marks 224, NULL marks 0; School1 official timetable 405, active 54 verified teacher assignments, wrong-source grants 0; saved School1 lesson plans 3, shared plans 0.
Main DB public FORCE+ENABLE RLS catalog 85 (excluding historical movement audit); actual signed runtime actor/HMAC acceptance is not established.
Latest backup is chosen by verifying real archive contents, not by name alone; /var/backups/assps-critical-20261019T163621Z four SHA256 entries PASS after the first-term database protection deployment. Four live triggers now guard School1 Exam9 results/exam metadata and table-wide TRUNCATE, with future examination and School2 operations retained. Systemd backup and hourly First Term read-only integrity timers are enabled. Offsite decrypted two-cluster restoration not certified.
Nginx quarantines legacy unsafe POST /api/timetable/save on api/app/www/apex with HTTP403. Public principal-signature.png now HTTP403. Never remove either guard without an independently authenticated replacement.

## Release architecture and dependency graph

Live inventory and release fence -> byte-attributed immutable source -> historical data backup/fingerprint -> isolated Core security implementation -> disposable PostgreSQL + negative tenant tests -> owned Paper Studio / Academic / Connect contract integration -> automated UX, print and regression tests -> independent off-host DR and genuine role acceptance -> immutable frontend/backend release candidates -> signed backup and rollback preflight -> controlled progressive cutover -> postflight live acceptance -> final certificate.

Core controls source integration, database, identity and release. Paper Studio independently controls Paper Workspace, authoring, LessonPlanDocument, Daily Diary, Results, Urdu and physical print. Academic owner exclusively verifies/publishes Grade IX-X question/source snapshots. APEX Connect is a restricted projection over authorized SaaS APIs, never an independent school-data authority. Do not take over those workstreams or silently publish their drafts.

## Internal phases of this single programme

| Phase | Objective and automated implementation | Machine-verifiable exit |
| --- | --- | --- |
| 0. Discover and lock | Inspect latest GitHub #4 and related issues, source worktrees/dirty files, Nginx, PM2, both PG clusters, migrations, dynamic source hashes, disk, backup timer, protected historical school aggregates. | Immutable signed state snapshot, current frontend/backend separately identified or HOLD, no modified peer tree. |
| 1. Preserve data and recovery | Verify First Term exact row-data fingerprint and 224 numeric zeros with read-only hourly guard; verify backup tar includes current Nginx root and both full PostgreSQL clusters. Store retention-preserving backups and checksum manifests. | 0 unwanted row changes, backup SHA/gzip/pg_restore verification, a usable rollback artifact, offhost status truthfully labeled. |
| 2. Canonical source reconciliation | Preserve current 98-file live rebuild and 198 extra assets; recover exact backend version and overlay 18 differing/171 live-only files without overwriting protected modules; package component-specific immutable artifacts and build provenance. | Git ancestry verified; no accidental deletions; repeatable frontend/backend builds and diff-free release candidate. |
| 3. Security/auth/RLS | Verify signed DB actor HMAC, role/tenant boundaries, 85 RLS tables and policy expressions, password-change flow, session recovery, effective teacher permission scope, authorized School2 denial and staff privacy. Apply least-privilege changes only after disposable-clone proof. | Real authenticated Principal + Teacher + peer School2 tests and signed runtime deny/allow matrix; no production privilege widening. |
| 4. Timetable and teacher allocations | Keep 54 approved mappings, eight-period official regular/Friday bells, combined classes, historical Regular rows. Replace quarantined unsafe destructive timetable POST with reviewed optimistic-lock, actor-scoped, transaction-safe draft/update pipeline; check migration on disposable PG16. | Empty/wrong actor/wrong school/stale schedule denied; all 8 correct rows atomic; real role, schema and rollback acceptance before unblocking. |
| 5. Lesson Planning, Diary and academia | Preserve three existing lessons and unpublished 59 academic groups. Integrate authorized teacher's class+subject assignments with LessonPlanDocument Save-Reopen-Print, independent publication gates and Paper Studio-owned Daily Diary; preserve Urdu/English language and precise page/chapter references. | Authenticated authorized-teacher browser Save-Reopen-Print, School2 denial, no unapproved academic publish, printed artifact parity. |
| 6. Core school operations | Admissions/student lifecycle, attendance (including historical Starter issue), class/section/academic year, teachers/employees/user permissions, fees/receipts/ledgers, exam/result cards and prior-term integrity, school notices and confidential HR notices. | Happy/negative role + tenant flow for each; sums, fee balance, marks and attendance snapshots invariant, no unauthorized HR disclosure. |
| 7. Independent client contracts | Paper Workspace and protected papers/Urdu MCQs/Word/PDF only via Paper Studio approval. Academic IX/X revision-bound approved snapshot consumption only; Connect projections over Core roles. Issues #1/#2/#3 remain open until their owners' acceptance is documented. | Cross-service authenticated API tests, no independent shadow database, revision/version compatibility and protected document regression. |
| 8. Reliability and disaster recovery | Validate encrypted rotation, monitoring/log redaction, disk inventory (no blind deletion), dual-cluster backup hashes, replica/offhost transport and independently decrypted PG16 restore on separate authorized host, restore RPO/RTO. | Actual second-host restore and test queries + documented independent checksum; local-only copy is insufficient. |
| 9. Release-candidate QA | JS/TS/SQL checks, full source build, targeted/full lint with baseline waivers documented, real browser Principal/Teacher/School2 Save-Reopen-Print, protected historical Result Card and Urdu A4 renderer, genuine printer if available. | Zero new P0 regressions, protected prior templates verified by owning stream, full actionable gate matrix, no false physical certificate. |
| 10. Controlled cutover and certification | Fresh production snapshot, immutable app/backend package, signed commit ancestry, guarded backward-compatible migrations, backup, rollback dry-run, canary smoke, atomic Nginx root flip and backend deploy only if necessary. Postflight live HTTP, identity/RLS, education modules, data checksum, logs and rollback. | All mandatory gates PASS and evidence links. Else remain HOLD with current production operational and safe. |

## Full module inventory / ownership / starting release state

| Module or subsystem | Core/partner responsibility | Starting situation |
| --- | --- | --- |
| Students and admissions | Core | Read-only student counts verified; recent additions must be preserved; lifecycle E2E incomplete. |
| Attendance and historic data | Core | Preserve 13k+ attendance rows; Starter acceptance and cross-school tests need fresh replay in clone/browser. |
| Fees and payments | Core | Protect 901 historic fee challans baseline; ledger and permissions need regression. No fictional payments. |
| Exams, First Term and Result Cards | Core + Paper Studio | First Term Exam9 CLOSED, 1853 School1 results/224 zeros protected by four LIVE triggers; School2 Demo Exam8 is separate historical one-row exam. 1854 global rows preserved, cards printed. Template protection hash mismatch needs independent provenance review, not blind revert. |
| Bell timetable, classes and sections | Core | 405 school1 rows, 54 verified assignments; source-guarded route source-only, legacy live POST403 quarantine. |
| Staff, roles and authentication | Core | Password-change/session candidates exist; no proved current live Principal/Teacher/School2 acceptance. |
| Lesson Planning / teacher delivery | Paper Studio feature, Core auth/DB | Three saved, zero shared, authorized 54 mapping scopes; real delivery and chapter/page source approval remain gated. |
| Daily Diary / printed Urdu | Paper Studio feature, Core integration | Protected template and A4 RTL/Jameel Noori parity require independent acceptance. |
| Paper Workspace / question selection | Paper Studio | Separate canonical PaperDocument; do not close issues #2/#3 without actual editor/selection/print tests. |
| Grade IX-X Question Bank | Academic owner | 59 source groups held, zero blanket academic signoff. Never invent approved originals. |
| Confidential notices, HR and documents | Core | Leader-only restrictions, 85 forced RLS; live recipient/private browser acceptance not fully attested. |
| APEX Connect | Connect owner + Core authorization | Projection contract; never expose cross-tenant saved answers, papers or employees. |
| Monitoring/retention | Core | Critical dual PG backup and hourly First Term read-only guard enabled; independent DR host remains missing. |
| Release history, immutable UI, backend | Core | Old sidecar inconsistent, one live bundle source recovered, backend exact Git SHA unknown; no wholesale file replacement. |

## Test layers, CI and proof requirements

L0 static source/syntax, ancestry, exact output files and reproducible manifests.
L1 focused unit/contract tests with synthetic actors and role-denial cases (never called LIVE).
L2 real local Express against disposable full Postgres clone, signed restricted DB roles, migrations and rollback; quarantine remains on real live write routes.
L3 browser automated authorized test identities; real Principal/Teacher/School2 accounts only through lawful existing access, no fake approval.
L4 actual print-to-PDF visual equivalence on A4, Urdu RTL, math, borders, document/page integrity; physical Ricoh evidence separate.
L5 production read-only health, data snapshots, authenticated narrow-scope smoke, backups and offhost recovery.
L6 immutable release + postflight: verify both frontend/backend SHAs, Nginx, PM2, PG checksums, 401/403 denies, approved end-user flows and rollback readiness.

The unified release-gate script MUST fail closed for (a) stale/false release metadata, (b) failed First Term or data invariants, (c) unsafe timetable POST unblocked, (d) public principal signature access, (e) no backup checksum or rollback readiness, (f) missing signed actor acceptance, (g) unresolved academic/physical/offsite conditions. Verification must never mutate production.

## Risks, controls and stop conditions

P0 concurrent in-place frontend changes -> immutable release staging and SHA fence; never overwrite current root, preserve extra assets.
P0 mistaken exam reset, loss of zero vs NULL -> Exam9 scoped four production triggers already LIVE, exact 1853/224 SHA + read-only hourly checker, protected full PG archive and clone-only rehearsals. Preserve separate School2 Exam8; triggers are not superuser-proof.
P0 timetable classwide erasure -> Nginx 403 quarantine, strict school/teacher/period/source/optimistic-lock transaction; do not enable insecure POST.
P0 tenant leakage -> signed actor HMAC and zero unscoped tenant access, tests on both real constrained role and disposable School2.
P0 fake source/approval -> independent SHA, branch and reviewer ledger; academic and physical signoffs cannot be substituted by internal smoke tests.
P1 rollback unable to recover newest active UI -> verify actual live artifact digest and preserve immutable snapshot, never repin after concurrent mutation.
P1 disk 91% -> inventory and remove only verified temporary scratch owned by this programme; preserve all worktrees, historical backups, student records, paper/source files, logs of evidentiary importance.
P1 offhost workstation standby -> verify allowed alternate independent target; do not label VPS fallback as offhost restore.
P1 signature image on public static path -> keep current HTTP403 and introduce authenticated tenant-scoped access only via approved new source contract.
P1 source-grade/Result Card template baseline mismatch -> Paper Studio protected regression and reviewed diff; do not force-reset newly printed templates.
P0 PUBLIC SOURCE PRIVACY: existing Git history includes a school principal-signature image asset and other potentially sensitive material. Nginx now blocks public runtime access, but that does NOT revoke Git repository/history access. No additional pushes of inherited assets, public links to those files, source bundle publication or history rewrite without separate security review. Use root-private checkpoints and provenance-only coordination records.

No service restart, unsafe release, schema DDL or writable School1 query while any P0 gate remains unresolved. A verified safe hotfix with full rollback can be released independently only when it does not bypass these controls or overwrite a newer component.

## Documentation and no-fragment execution contract

All internal phases stay under this one issue and one mission document; each commit carries its own isolated source, tests and proof. The report at every checkpoint names verified live frontend/backend origins (or UNVERIFIED), active worktree, passed/failed/blocked tests, main+signed PG/RLS, backup/rollback and exact deployment status. User receives final truthful completion status, not a fake fully deployed claim. Never ask user/staff for routine chores or create scheduled assistant tasks without direct authorization. Existing pre-authorized on-VPS monitoring stays enabled.

## Live execution amendment — 19 October 2026 16:46 UTC

Exam9 live trigger catalog verified 4/4; School2 Demo Exam8 correctly separated; full global exam results 1854 and actual 224 numeric zeros remain. Latest post-migration main/signed PG backup checksums 4/4 pass, with newest ciphertext still not independently restored offhost. Current live index stable, metadata stale. The plan is in an isolated Core mission worktree; do not publish it together with inherited sensitive git objects. Final go/no-go is determined by the independent read-only release gate, not by manually setting readiness flags.

## Autonomous execution evidence — first unified release-fence run

- Newly authored unified READ-ONLY release checker: ops/release/unified/assps_unified_readiness_readonly.py, with pure offline adversarial tests test_assps_unified_readiness_readonly.py.
- Hermetic unit tests **14/14 PASS**. Initial negative-test discovery caught empty evidence incorrectly passing the operational group; corrected to require all seven named evidence sections before pass.
- Actual Hostinger production checker returns exit **2 = RELEASE_HOLD**, not exit 0 or completion. Operational groups all PASS: main PG student/exam/teacher mapping invariants; live Exam9 metadata, 1853 rows/224 true zeros/0 NULL/4 active protective triggers; SHA-locked First Term history; signed85 catalog source audit; newest dual-PG full backup 4/4 SHA and both gzip tests with current live frontend in tar; stable frontend index; 10 anonymous HTTP checks including four timetable POST403 and signature GET403; rollback --check only.
- **11 independent outstanding release gates**, including incomplete current frontend sidecar attestation, exact backend source and signed actor acceptance, genuine School1/School2 browser roles, secure timetable production mutation, 59 academic reviews, offsite decrypted restore, printer witness, protected Result Card acceptance, system-wide tenant/fees/attendance/Connect QA and public repository sensitive-asset history review.
- Disposable PostgreSQL 16 reviewed timetable migration rehearsal PASS: unsigned schema blocked with rollback, new two draft tables FORCE RLS, five scoped policies. Separate isolated School Document RLS rehearsal PASS: missing context returns zero, School101 and School202 isolated, wrong tenant zero. Both temporary clusters destroyed; zero production DDL/DML by this mission.
- A private source-history/security risk is registered separately from live HTTP controls. No unsafe new public GitHub push is authorized from this mission branch while previous public history may carry the protected school image asset.
- Current source-only Core timetable guard from parent 04b3d53a remains NOT DEPLOYED, and existing live unsafe endpoint must stay HTTP403. No service restart, cron/autonomous new scheduler, student marks change, teacher grant repeat or exam reprint executed.

## Source reconciliation execution — 19 Oct 2026 ~17:xx UTC

This is a source-only Core hardening iteration on the same protected unified mission worktree, not a second mission or a production release.

- Real backend delta review found the current runtime has a working School Document Studio server mount and a validated read-only public-branding endpoint absent from current source candidate; both are forward-ported without copying the entire runtime, and mock public HTTP tests require explicit code validation, 404 for unlisted schools, 503 for simulated DB outages, a binding for school-code and a strict four-field public response allowlist.
- Existing live results routes included attendance totals, which the candidate lacked. Added attendance totals to the two Core results read queries but strengthened tenant isolation by grouping on attendance.school_id + student_id and joining on matching student school ID. The live PostgreSQL database parsed this query under BEGIN TRANSACTION READ ONLY / EXPLAIN, and the source calculation of saved grades with previewDefaults:false was preserved. No live examination mark was changed.
- A root-private backend source comparison after the narrow forward-port finds 710 runtime code files: 522 byte-exact match, 17 conflicts, 171 runtime-only (143 in independent runtime namespaces), 15 source-only. Versioned read-only source-preservation checker now refuses any wholesale backend replacement while the 17/171 gaps remain. Never delete ARGUS/JARVIS independent code as an incidental school release step.
- Corrected unified verification logic so genuinely added student/admissions, new Second Term marks, additional lesson plans, timetables and extra RLS-protected schema cannot be mislabeled corruption. Exact historic Exam9 1853/224/0 and School2 Exam8, 54 official grants/zero unapproved, exact SHA archival guard and four live Exam9 triggers continue fail-closed. Added adversarial tests for valid future rows and historic deletions/unauthorized grants.
- Verified **62/62** selected isolated Node route/security/lesson/timetable tests and **26/26** hermetic Python production-preflight and source-preservation tests PASS; JS checks and production-safety checker PASS. Both actual live gate and runtime source reconciler return exit 2 RELEASE HOLD by design. 8/8 live operational evidence categories PASS, but active frontend attestation, authentic signed actor, private source history, offsite restore, Academic and hardware gates not proven. The earlier protected Paper Studio Result Card snapshot mismatch remains unresolved.
- NO newly authorized production DML, backend deploy, Nginx reload, PM2 restart, timetable POST unblocking, source content publication, or external witness forgery.

## School1 Attendance / Starter 19 October independent live read-only finding

- Production attendanceRoutes.js is byte-identical to current source; it contains transactional batch integrity checking and a savedCount response. Historical Starter save bug cannot simply be assumed still present without a genuine UI session.
- Real PostgreSQL READ ONLY data for 19 October 2026: **321 active School1 students**, **317 distinct students marked**, **four unmarked**. Exactly **four students enrolled on the same date**; all are in Starter, 48 active Starter / 44 saved, with **no duplicate 19-Oct Starter attendance rows** and **zero previously enrolled active School1 pupils unmarked for that date**.
- Independent pure assps_attendance_coverage_readonly.py reports only aggregate school-class counts, distinguishes newly registered unmarked from prior roster, never emits student names/IDs or infers missing present/absent. Eight plus focused negative unit cases run successfully.
- A no-record Starter complaint from 28 September cannot be treated as proven fixed merely from these 19-Oct database rows, and browser display parity still requires genuine authenticated acceptance. No student was auto-marked, no attendance record fabricated and no history backfilled.
- Automated unified read-only release fence now has **9/9 current operational evidence sections PASS**, including class attendance counts, at 19 October sample. The verdict remains RELEASE_HOLD because backend source conflicts, protected Paper Studio/Academic approvals, off-host DR, real roles, source privacy and print acceptance are still unresolved.

## Privacy-safe continuity of work

- The mission worktree inherits an already-public repository history with potentially sensitive image/media content; do not push this inherited branch publicly. The latest Core work is committed locally and separately archived root-private with checksum receipts. GitHub Issue #4 coordination describes provenance, counts and release conditions only, never attaches the vulnerable asset or secrets.
- Next isolated Core integration needs to honor newer parallel branch integration/assps-zero-human-unified-master-20261019@6ce32e0 and the newly deployed First Term Exam9 four-trigger migration. Do NOT replay that migration or overwrite peer agent's worktree; reconcile exact SHA and verify latest descendant before any cutover.
