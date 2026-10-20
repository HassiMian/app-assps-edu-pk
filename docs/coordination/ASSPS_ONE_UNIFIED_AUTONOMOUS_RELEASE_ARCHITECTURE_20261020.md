# ASSPS — ONE Unified Autonomous SaaS Completion and Release Mission

Mission: ASSPS-ONE-G0-G12-20261020
Release owner: SaaS Core and Production Master.
Policy: 0% routine user, teacher, and school-staff technical work. No bypass of legitimate security, academic approval, third-party access or physical verification. One integration programme and one final release verdict; the stages are not separate missions.
Current verdict: SOURCE QA ACTIVE / PRODUCTION RELEASE_HOLD; no unified deployment certified.

## Immutable invariants
- Never reset, truncate, reseed or overwrite First Term results, marks, real zeros, papers, result cards, fees, attendance, saved plans, or current student records.
- Before any rollout, attest the actual served frontend and effective backend separately against full source ancestry. Historical release metadata does not prove effective runtime SHA.
- Preserve tenant RLS under non-BYPASS roles, authenticated signed actors and real School2 denials. Never loosen permission checks to pass a test.
- Never overwrite other agents' dirty worktrees, force-push shared branches, publish private school media into Git history, or deploy older source on top of newer production.
- Treat synthetic browser and fixture tests as source evidence; do not equate them with authenticated real-user acceptance, physical Urdu print, independent academic approval, or disaster recovery.

## Current read-only production baseline
- Host srv1769723; frontend active root /var/www/assps-resultcard-nazra-purged-20261019, current served index SHA256 3c74d3be652b41549ef2129eaacec4c341c05c2118597e308edffd17a33726a9.
- Nginx and backend online; last observed PM2 apex-backend PID 1355767. Actual backend deployed source commit UNKNOWN and not certified.
- Storage approx 18 GiB free / 82% used, above 12 GiB preflight floor before subsequent build and backup load.
- apexos main DB last verified read-only: 326 students / 322 School1; 1,854 exam rows, 1,853 School1 protected Exam9 rows; 224 numeric zeros, zero SQL NULL, four live protective history triggers.
- Exactly 54 active timetable-verified teacher grants with zero excess School1 grants; 405 timetable rows, three lesson plans, zero published. Fee audit earlier observed 905 challans and 213 transactions without integrity anomaly.
- The 20 October schoolday 321 previously registered active attendance records were unsaved at close; do not fabricate attendance or create defaults.
- Existing critical backup bundle: four checksums and three gzip checks passed, but off-host recipient-decrypted independent full RESTORE of BOTH main and signed PG clusters remains unverified.
- Backend source drift at current scanner baseline: 18 conflicts / 171 live-only files. Frontend: 198 extraneous legacy assets and failed attestation; indiscriminate replacement/deletion forbidden.
- Current unified read-only release gate reports RELEASE_HOLD / exit 2 / 18 unresolved mandatory items.

## One execution architecture: gates and dependencies
G0 COORDINATION: Read issue #4, its issues #1/#2/#3, both October 8 handoffs; enumerate clean/dirty worktrees and active owner branches. Evidence: immutable source ownership ledger.
G1 PROD TRUTH: Verify live Nginx roots/hash, PM2 cwd/build, API health, both databases and independent frontend/backend commit ancestry. Evidence: separate live SHA attestations.
G2 DATA FREEZE: Baseline exam-zero/null/trigger checks, students, fees, teachers, timetable, Diary and Paper; full safe backups, checksum, signed evidence. Evidence: exact read-only aggregate deltas and untouched records.
G3 SOURCE RECONCILIATION: Compare backend live-only 171 and conflicting 18 paths, frontend asset closure; forward-port ONLY reviewed missing logic onto clean descendant, never wholesale replace runtime.
G4 SECURITY: Reproduce actual signed actor/HMAC, non-BYPASS PG RLS, Principal/Teacher positive access and independent School2 negative access on legitimate authorized credentials and isolated PG. Synthetic tests alone remain HOLD.
G5 SCHOOL CORE: Attendance correct teacher/class status and fail-closed absence behavior; official bell schedules, 54 grant mappings, 405 timetable entries, teacher collisions and complete 8-period guarded day SAVE, admissions and fee ledger.
G6 LESSON/DIARY: Authenticated LessonPlanDocument workflow including rejected HTTP200 false-success, revision CAS, scope, save-reopen-print, no accidental local draft replacement, teacher grant/academic coverage and publish/delivery rules; Daily Diary full end-to-end.
G7 FINANCE: Receipts/challans/payment transactions, no duplicate financial operation, notices, tenant-specific views, log redaction; school WhatsApp phone-bound identity and isolation from unrelated trading/financial agent logic.
G8 PAPERS AND RESULTS: Paper Studio owner must approve canonical Paper Workspace/Document, existing official papers/result cards, marks, MCQ/short/long, Urdu/Jameel Noori RTL, Times Roman English/math, PDF/DOCX and physical A4 parity.
G9 ACADEMIC AND CONNECT: Independent Grade IX-X edition/page/medium/topic provenance and 59 approvals; only approved revision snapshots can be consumed. Connect must be a tenant-filtered client, not a second academic database.
G10 DR AND ROLLBACK: Perform encrypted offhost dual-PG independent restore, roles/RLS and data-count proof; disk threshold; immutable versioned frontend/backend staging; complete reversible compatible migration and switch-back procedure.
G11 RELEASE CANDIDATE: Every owner contract accepted, exact source ancestry, reproducible frontend/backend builds, signed DB migrations in disposable PG, browser/auth/RLS, pressure, print, ledger and protected result regressions. All mandatory gates must pass.
G12 CUTOVER/CERTIFICATION: Recheck backups, perform controlled immutable compatible deployment, Nginx -t, canary/API/PM2, real Principal/Teacher/School2 denial and full results zero/NULL parity, then attest actual live frontend/backend SHA. Roll back on any regression.

Dependency DAG: G0 -> G1 -> G2; G2+G3 -> G4; G4 -> G5/G6/G7; G3 + independent Paper owner + Academic owner -> G8/G9; all preceding plus G10 -> G11 -> G12. Parallel source-only work allowed ONLY in isolated worktrees; one integrated candidate and one release certificate.

## Exactly 18 mandatory unresolved gates at this checkpoint
1. Full-day attendance roster unsaved after close.
2. Mounted school WhatsApp legacy financial coupling.
3. WhatsApp sensitive message/phone logging privacy.
4. Signed live webhook phone-scope proof.
5. Lesson Planning academic coverage/publication.
6. Live backend would lose code in whole-tree replacement.
7. Active frontend orphan/legacy assets.
8. Served frontend sidecar/attestation mismatch.
9. Signed frontend/backend provenance.
10. Genuine Principal/Teacher/School2 authenticated browser.
11. Real signed HMAC actor plus effective RLS.
12. Reviewed real-scoped timetable migration.
13. Independent 59 source approvals.
14. Off-host decrypted independent two-cluster restore.
15. Physically witnessed Urdu A4 output.
16. Paper Studio result template owner approval.
17. Cross-module attendance, fees, notices, Connect.
18. Public repository sensitive Git history.
All remain fail-closed until independently proven, not merely asserted. While any HOLD remains, prohibit production promotion and removal of the guarded timetable ingress quarantine.

## Test and release evidence standard
Per gate record: ID, owner, base full SHA, candidate full SHA, exact environment and invocation, output/test counts, pass/fail/hold, evidence SHA256, rollback expectation.
- Unit: strict server-response acknowledgement ID/revision, rejection/false success, draft identity, timetable optimistic snapshot, zero-vs-null, fee/tenant invariants.
- Node/HTTP: synthetic role/tenant and denial fixtures. Do not claim real School2 login from mocks.
- PostgreSQL: disposable version-matched migrations + rollback; FORCE RLS and non-BYPASS, exam triggers and protected history.
- Chromium: synthetic intercepted API tests including negative HTTP200; separately real role login/reopen/save/print under approved access, no unauthorized login shortcut.
- Build/static: exact lockfile dependency installation, Vite build, production-safety checker, no unexpected media or extra assets.
- Release: signed hashes of frontend root and backend process code, dual DB backup+restore, protected grade/result card/Paper Studio print acceptance. A passing source test NEVER proves deployed.

## Rollback strategy
Before change: preserve current served index hash, Nginx root, versioned frontend assets, effective backend runtime fingerprint and process configuration (secrets redacted), current migration status, PostgreSQL roles/policies/triggers and School1 protected row/zero counts.
Take immutable pre-release backup and independently restore both clusters on offhost test target. Stage compatibility first, not destructive database replacement. Switch immutable roots atomically only if release gates pass. On auth/RLS, marks, fees, attendance, paper, health or artifact drift: stop rollout, switch application bits back to independently verified prior roots and processes, preserve newer DB school events and reconcile schema forward. NEVER restore an old database over newer school records. Postrollback repeat live hashes, tenant denial, counts and smoke.
Produce a single final certificate only after live acceptance; otherwise explicitly record RELEASE_HOLD with remaining gates and no deployment claim.

## Current isolated source change
Branch integration/core-unified-plan-save-ack-20261020 starts from clean Core 16cf6dcc7008; defensive Lesson Planning API adapter requires success:true, valid persisted identity and positive strictly increasing server revision. Negative responses keep the editor draft intact. Node and Chromium synthetic tests and build are source evidence, not actual role/production acceptance. Paper Studio ownership/branch reconciliation remains required before integration.

No production SQL DML/DDL, live files, service restarts, deploy, protected assets, or academic publications are authorized by this planning document.
