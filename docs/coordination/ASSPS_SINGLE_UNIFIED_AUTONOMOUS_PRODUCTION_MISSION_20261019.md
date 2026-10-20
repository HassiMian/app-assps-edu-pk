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

## Finance / protected ledger independent read-only checkpoint

- Core payment test with genuine mutation intentionally requires a disposable fee QA Postgres database and must never be pointed at the school production cluster. No test payments created, no challan updated.
- Read-only live School1/all-school fee aggregate: 905 existing challans, 902 School1 challans, 213 append-only payment transaction rows. Six anomaly classes checked: negative challan/transaction values, orphan payments, cross-school payment-to-challan mismatch, wrong-student link, and decreasing cumulative paid amounts. Every anomaly count is **zero** at the current snapshot.
- The separate assps_fee_ledger_integrity_readonly.py exposes only aggregate counts and checks minimum historical record survival, while allowing future legitimate fee challans and payments. No student names, identities, receipts or amounts copied into report.
- Integrated fee ledger validation into unified gate. As of 19 October the actual live checker has 10/10 operational evidence sections PASS; 12 unresolved release holds remain (including authenticated receipt/workflow browser acceptance). Source-only synthetic tests are not proof of actual payment operation or merchant reconciliation.

## CURRENT PHASE 2 — immutable frontend clean-artifact closure (19 Oct 2026, source-only checkpoint)

Source workstream for the SAME unified mission: audit/core-unified-front-closure-gate-20261019, branched independently from clean Core checkpoint 41ca216c to avoid modifying parallel agents' source files.

- New file-level source packaging checker ops/release/unified/verify_frontend_artifact_closure_readonly.py independently attests the private source Vite tar and SHA receipt, all 98 asset SHA256s, and 98/98 actual served live counterpart bytes. Zero missing, zero mismatched. Active Nginx root also contains 198 additional files: 196 JS, one CSS and one JSON sidecar. Harmless HEAD for one retired JavaScript chunk returns HTTP200, meaning old code remains directly accessible; this is a release integrity and stale-cache concern, not automatically a personal-data disclosure.
- Unified read-only release fence now has 11/11 implemented operational categories PASS and separately enforces active_frontend_has_public_legacy_or_extra_artifacts as RELEASE HOLD. Its actual verdict stays exit2 RELEASE_HOLD with 13 unresolved release gates; no fake metadata repinning.
- New private staging helper ops/release/unified/stage_private_frontend_candidate.py creates a root-only candidate outside /var/www, verifying prior build SHA and all staged file hashes, with no live Nginx edits. Upstream original 98-file archive retained; exactly one protected static school media file excluded from private proposal, producing 97 tested candidate files. One packaged frontend code reference still points to excluded media; protected Paper Studio authorization and document-print parity need separate resolution. Its private staging receipt clearly asserts safe_to_deploy=false.
- Selected pure Python offline adversarial tests 58/58 PASS, including malformed archive/unsafe paths, duplicates, missing asset, hash drift, safe private exclusion, and gate not accepting stale public assets; source production-safety check PASS. No production DML, Nginx reload, PM2 restart, user/staff tasks, GitHub public push, or live file deletion.
- For controlled promotion, enforce source-provenance and a strictly permitted static asset set, offer only genuinely authenticated tenant-scoped signature/document access, verify browser navigation and cached open sessions with owner Paper Studio, and keep prior Nginx root and rollback intact. Do not promote private sanitization artifact until all mandatory release gates pass.

This is source hardening within the previously adopted one integrated production mission, not a separate release.

## 19 October 2026 supplementary exam-attendance tenant-scope audit

An isolated, static, nonmutating release test now compares the two exam-result
attendance aggregates in the active live backend with the corresponding unified
candidate sources. The candidate groups and joins by `(school_id, student_id)`;
the live route presently groups/joins by `student_id` only. This is a release
hardening requirement; static differences alone do not establish actual cross-tenant
student disclosure. The unified readiness gate now explicitly HOLDS if either
backend is not school-scoped. Live school data, reverse proxy, PM2 and DB remain
untouched. Runtime confirmation still requires genuinely signed, authorized
Principal/Teacher/peer-tenant roles and effective RLS isolation tests.

## 20 October 2026 — Integrated academic delivery architecture and release dependency closure

This is an amendment of the SAME unified mission, not a standalone project or a
new deployment request. The execution controller is the **read-only integrated
release gate** `ops/release/unified/assps_unified_readiness_readonly.py`; each
candidate change must be reconciled against the active production build, its
rollback receipt, database integrity evidence, and authentically authorized
actors before changing live state.

### Unified component dependency order (one release train)

| Stage | Integrated services | Prerequisite evidence | Exit condition |
| --- | --- | --- | --- |
| A — Truth | Canonical Git history, current VPS runtime, immutable frontend/backend files, retired static assets | Source file ancestry and root-private SHA256 manifests; no unsafe public push | Unique source of truth per file and safe signed artifact provenance |
| B — Irrecoverable-data fence | Main `apexos` PostgreSQL, signed `asspssigned` tenant context, Exam 9, Exam 8 demo, academic assets, fees | Separate backups, off-host encrypted copy, two independently proven decrypted disposable restores, rowwise evidence and rollback rehearsal | Every protected historical record unchanged; no NULL/zero semantic drift |
| C — Actor perimeter | Principal, teachers, School 2, 85 forced-RLS policies, limited workers, API permissions | Genuine pre-existing identities and cryptographic signed actor context, not mocks | Positive and peer-negative browser/API acceptance, audit logs, scoped permissions |
| D — Academic truth | 405 timetable records, 54 verified active grants, Early Years, 59 Grade IX/X provenance groups | Signed source mapping, class/section/subject ownership, student privacy and schedule version control | No ambiguous teacher identities or unscoped subject slots; no invented academic approvals |
| E — Teaching workflow | Lesson plans, class/subject planner, diary, question bank, assessments, Paper Studio, Urdu PDF/Word | Source syllabi, teacher ownership, plan revision/sent-to-portal semantics, content approval | Save → reopen → retrieve → print parity on real authorized users in controlled paths |
| F — Operations | Attendance, fees, receipts, result cards, school documents/notices, admin dashboard, APEX Connect | Tenant isolation, row locking, payments ledger, term/result history, protected documents | Multi-module end-to-end authorized flows, denied peer access and accessibility/RTL checks |
| G — Deployment | Backend + frontend + Nginx + PM2 and rollback set | Signed artifact closure, 0 unintended deletions, 0 live-only source omissions, 0 unresolved private static references | Health+canary+cross-tenant+live DB fingerprint PASS; rollback path verified |
| H — Certification | Integrated tests and observation windows | Complete evidence matrix, offhost restore and genuine independent gates | RELEASE_GO only if no unresolved critical gates; otherwise HOLD without inventing a certificate |

### 20-Oct new evidence and explicit automatic gates

- Live Exam 9 protected set remains 1,853 results, 224 authentic zeros, zero NULL marks; source guard remains immutable. The School 2 Exam 8 historical demo result is distinct and protected.
- Teacher grants: 54 source-verified active, **zero unauthorized and zero duplicate**. All 54 approved class/section/subject grant keys match timetable subjects. Among these, 11 distinct timetable key groups carry a NULL `teacher_id` although approved user IDs exist; mismatched *nonnull* IDs = zero. These are unresolved identity projections, **not** authorization to update 11 rows.
- Eight additional Pre-Nine regular lesson rows have empty section while 8 corresponding approved grants target section `Blue`. Two other unmatched subject groups are administrative School-wide Assembly/Break; they must never become academic teacher grants.
- Three term lesson-plan records exist; **zero are `sent_to_portal=true`**. Term content, current enrollment/class/subject coverage, syllabus edition, publication and signed academic approval cannot be inferred from counts. Do not silently mass-create or publish lessons.
- Employee preferred display forms differ from legal user-account names; do not exact-match names or automatically mutate `teacher_id` without a verified stable identity mapping, transaction-level expected-snapshot check, full backup+restore and application acceptance.
- Active result attendance aggregation still omits school ID in two SQL projections while candidate includes `(school_id,student_id)`; never replace the entire live backend or declare this fixed in production on source-only evidence.

The integrated readiness controller now reports **17 unresolved fail-closed gates**,
including new timetable-teacher, unscoped Pre-Nine and lesson-publication
conditions. The three new gates are *within the one existing mission*; they do
not signal three separate projects. All counted evidence is collected with
`BEGIN TRANSACTION READ ONLY` and never modifies live records.

### Zero-human engineering automation boundary

Automate discovery, scoped source changes, targeted tests, migrations rehearsed
on isolated restored clones, observability, certificate aggregation, backup
verification and permitted release cutovers. Block and preserve live state
where a security authorization, authenticated external actor, physical paper
inspection or independent academic approval cannot be established by available
legitimate mechanisms. System cannot certify itself by creating mock principals,
peer-school credentials, faux off-host restores, invented source approval or
pretend Ricoh print results. Missing evidence is an explicit release HOLD.

### Backups, migration, rollback and exception discipline

1. Pre-migration lock: current release refs, PM2 map, Nginx config, two PG
   clusters' checksums and First Term row fingerprints, and media ownership.
2. Use **additive migrations** with nullable transitional columns; no global
   truncate, reset, delete, reimport of exam history or blanket teacher grant.
3. Rehearse exact migration and rollback in a nonproduction restored clone using
   the immutable authentic data, then compare Exam 9 rowwise and School 2 guard.
4. For any teacher-ID repair, require single `(school_id,class,section,subject)`
   approved source, stable teacher-user and employee association, non-null
   display preserved, optimistic concurrency check, audited rows and restoration
   receipt; no change on ambiguous or blank-section tuples.
5. Stage a complete protected asset manifest. Prevent unsafe removal of 198
   extra live frontend assets and retention media until ownership, references
   and rollback have been reconciled. Stage backend with 17 differing and 171
   live-only paths preserved, not wholesale replaced.
6. Only roll forward after scoped auth+peer-denial acceptance, effective RLS,
   academic workflows, print/PDF/Word parity, staged HTTP and independent
   restore prove complete. If gates fail, freeze writes/cutover as applicable
   and use verified preflight rollback strategy without losing new records.
7. Evidence receipts are root-private by default; never publish school images,
   private logs, tokens, user identities, secrets or protected media to public
   Git history.


### 20-Oct continuation: storage headroom and timetable room snapshot parity

All of this work remains inside the original, single unified release mission.
The audited VPS root filesystem has roughly 7.67 GiB / 8.0% space available.
A read-only storage check now includes `/`, `/var/backups`, and
`/var/lib/postgresql` in the unified fence. The engineering minimum for a
release rehearsal is 12 GiB and 12% free; this is a conservative staging
threshold, not a guarantee that an off-host dual-cluster restore can succeed.
Currently this introduces an explicit capacity HOLD; no backups, databases,
source worktrees or project files were deleted or rotated to manipulate it.

The live timetable backend now has an additional optimistic snapshot contract
binding `room` in both read queries, input validation and SHA256 digest.
The isolated audit candidate forward-ported exactly this contract, without
changing live state. Candidate room is no longer silently defaulted to an
empty value, and tests verify that changed room invalidates stale snapshots.
This brings two live-source conflict paths to byte-for-byte parity in the audit
worktree (18 canonical candidate differences vs 16 audit-worktree differences),
while leaving 171 independently-owned live-only paths untouched. The canonical
unified release candidate and active production are not altered by this work.

Controlled source tests executed: 85 hermetic Python release gate tests,
36 simulated timetable/lesson unit+HTTP tests, 31 synthetic identity and
examination tests, and 23 Paper Studio/Diary/attendance/examination contract
tests, all passing (175 individual test cases). These tests are not genuine
Principal/Teacher/School2 signed browser acceptance, witnessed Ricoh printing,
independent editorial approvals or an off-host decrypted restore. The release
remains HOLD, with 15 reported gates including capacity, provenance and the
previously unverified external acceptances. Existing Exam 9/First Term remains
immutable at 1,853 results with 224 genuine zeros and zero NULL marks.

### 20-Oct continuation: timetable combined-class occupancy closure

In the existing unified release train, a new read-only active schedule audit
checks all 42 day/class/section groups and 336 teaching-period records (seven
current classroom sections across Monday through Saturday). Every active
section has eight distinct numbered periods, a scoped teacher, and a nonempty
section. It found 12 timeslots shared by the same teacher across Four/Blue and
Five/Blue in English (Period 5) or Nazra (Period 8), all six school days.
These are the established combined-class pairing, not 12 unrelated double
bookings. The evidence rule is STRICT: exactly one Four/Blue and one Five/Blue
record, same teacher, subject, date, period, start/end, and room. Any other
same-teacher cross-class overlap is a release HOLD; detected unexpected
collisions = **zero**. The exceptional pair must not implicitly authorize any
other year, room, class, school or subject.

The integrated release gate imports `verify_timetable_collision_scope_readonly.py`
and fails closed if active teaching days are incomplete, teacher identity is
missing, periods are invalid, a section is unscoped, or unapproved teacher
overlaps appear. Structural checks do not confer academic approvals. The
isolated candidate `/workload` route was adjusted to return **physical teacher
timeslots** as `total_periods` while separately retaining `assignment_rows`,
and its clash SQL excludes *only* the exact known Four/Five simultaneous
teaching pairs. The equivalent query was verified with a READ ONLY transaction
against production: **336 class assignment rows, 324 unique occupied teacher
timeslots, zero unapproved clashes**. No live timetable or backend was edited;
full live authenticated teacher workload and user-interface acceptance remains
an unmet release prerequisite.

### 20-Oct continuation: all-school attendance save evidence and acquisition fail-closed

The same unified release programme now flags a **possible entire-school
attendance day without saved marks** after 15:00 Pakistan time on a Mon–Sat
schedule day. A live read-only observation on **Tuesday, 20 October 2026**
found 321 active pupils and **zero persisted attendance records for this date**,
whereas 317 rows existed for 19 October. This is **NOT** evidence that pupils
were absent, and without a verified holiday/operational attendance calendar is
not proof that marking failed. No attendance statuses were guessed or backfilled.
The gate records a distinct HOLD for investigation instead of incorrectly
reporting zero saved class alerts as an all-school PASS. Sunday, before-closing
observations and previously saved days are explicitly excluded from this alert.

Isolated backend `POST /attendance/mark` now executes its teacher-assignment
preflight before acquiring the database pool connection and acquires the
connection inside an error-handled `try` block. If the pool acquisition fails,
rollback and release are guarded against an undefined client, and a generic
non-sensitive error is returned rather than raw backend error text. The
original 100% batch write/persist-or-rollback invariant remains unchanged.
Source regression tests were added; this is **candidate-only** code and is
not evidence of a live school staff attendance login or successful attendance
save. The existing School1 First Term result records are protected exactly.

### 20-Oct lesson-plan coverage reconciliation — exact metadata without invented approvals

A new independent read-only coverage checker
`ops/release/unified/verify_lesson_coverage_readonly.py` compares all active
School1 `timetable_verified_20261019` teacher/class/section/subject grants
against the actual `lesson_plans` metadata. Live state on 20 October:

- **54 distinct authorized active class/section/subject groups** are verified.
- **3 existing school-wide lesson-plan rows**, **0 sent-to-portal**.
- **1 directly exact-matched class+subject candidate** (Class Five / Social
  Studies); **53 mappings have no direct exact-matched lesson-plan metadata**.
- **2 plan headings have no directly matching approved class+subject tuple**;
  broad labels such as Primary/Urdu-General and different subject languages
  require explicit academic reconciliation, NOT automatic publication.

The lesson-plan table lacks a section identity; even direct metadata matches
cannot certify per-section curriculum, syllabus pages, exercises, named
teacher acceptance, signed academic authority, or plan publication.
The new evidence is integrated into the ONE unified fail-closed release gate.
Missing coverage inspection fails operational preflight; the existing lesson
publication/content-approval HOLD continues. These counts describe only
metadata, not the true number of approved teaching lessons. Neither the
existing three plans nor 54 teacher permissions were modified, and no grade
IX/X provisional question-bank drafts were promoted or inferred as approved.

### 20-Oct security extension: mounted cross-product legacy boundary (READ ONLY)

A source-only inspection of active PM2 backend `/var/www/apex-backend/src`
confirmed that the school server mounts its WhatsApp route, while the live
route includes **two call sites to legacy financial execution/closure
functions** and **one automatic legacy scanner start**. This is a security
and separation concern because ARGUS research/mocks are NOT evidence that
all school production integration pathways are quarantined. It does **not**
prove that financial actions actually happened, nor is the school database
itself proven exposed by these call sites. No broker, scanner, account or
legacy module was imported, contacted, started, stopped or modified.

`verify_school_cross_product_boundary_readonly.py` provides metadata-only
static risk evidence; the single unified release gate adds a separate
**cross-product boundary review HOLD** if risk call sites remain in an
active mounted school route. Tests deliberately confirm an unmounted route
or absence of static signatures is **not** comprehensive runtime
isolation certification. Quarantine must preserve lawful school messaging
and student/teacher data while keeping autonomous financial capabilities
outside the school runtime. No live route was deployed or disabled during
this step because genuine authorized tenant acceptance, signed provenance,
backup/rollback and other mandatory release gates are still unresolved.

### 20-Oct next checkpoint: candidate-only school WhatsApp market-request boundary

The isolated `al-siddique-backend/src/routes/whatsappRoutes.js` candidate has
no direct legacy financial execution/closure or auto-scanner call sites, but
its general AI dispatch remained usable for explicitly financial-market
messages. A fail-closed, channel-wide pre-dispatch refusal now invokes
`isFinancialMarketRequest(text)` before both primary and fallback cognitive
handlers, and returns the school's existing scope-restriction message. This
does not use broker credentials or invoke the legacy financial runtime. The
owner has no exception for school-channel financial prompts. Normal diary,
admission, fee, and attendance questions remain unrestricted by this filter.

Pure offline tests cover explicit market intents, allowed school messages,
control-flow ordering, default refusal wording, and absence of direct broker
execution/scanner imports. The unified source-only guardian now separately
checks the candidate boundary while retaining its independent LIVE financial
coupling HOLD. The candidate may pass static checks; this never certifies
runtime containment or permission/RLS behavior, and is **not deployed**.
Only a signed, source-reviewed, rollback-ready release with real school-channel
acceptance can clear the active runtime risk. Existing academic databases,
WhatsApp message histories, and historical release archives were not altered.
