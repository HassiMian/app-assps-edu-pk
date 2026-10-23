# ASSPS Phase 2 & Phase 3 — Current largest mission security and academic checkpoint
Date: 23 October 2026. School1 / First Term Exam9. Isolated Core owner worktree.

## Actual school production security fixes
- Existing live /users signup guard (earlier same-day source hotfix) prevents generic Admin role escalation and Owner creation; privileged account password reset is scope-restricted.
- Discovered another parallel escalation in employee portal provisioning and low-level portal account service: submitted employee role was unconstrained and existing user ID could target a different stored role. Source now accepts only teacher/accountant on employee portal, low-level accepts teacher/accountant/student/parent, and mismatched existing account role is rejected.
- Surgically deployed precisely two additional JavaScript files to live backend with byte-verified root-only original backups and staged parser-verified replacements. Originals: portal SHA256 0b14815bdf17a5a3891b7e85ef4a0ee5f1f17ef9500ff0ffc6c77726c1c7aa6e, employee SHA256 4289485a0dbb9c1718fbcd2862f6326954761474f6613627b1e72724babe2015; patched: 357916f5446a40ef0a4712842521937515f39e2bf5ff36d2c9819a031e1d35fe and 8432a4df568c790ca5697d43677a4004d826be791b9d73aca53c524a57db75cd.
- Reloaded existing PM2 backend with explicit PORT=5000 to avoid earlier 8888 shell-injection collision. Source JS syntax valid. Confirmed runtime, without any DB write, denies owner, super_admin, admin, principal and school_admin in portal account service. Unauthenticated endpoints remain protected.
- New fail-closed live employee/staff portal guard probes included in 27-component release readiness. These are static and runtime-negative proofs; no authenticated school user cross-tenant behavioral receipt has been fabricated.
- Owner role database constraint remains unchanged on live and excludes owner; source migration 036 rehearsed earlier in isolated scratch and is NOT deployed live. School1 active owner role count 0, verified original Owner contact metadata missing. Any automatic promotion would be unverified.

## Academic data preservation and unexplained historical changes
- Live Exam9 school1 remains 1854 results, 215 saved numeric zeros, 6 perfect-score English Written rows graded D, 81 pending catalog subjects, no live marks/grade audit ledger.
- Oct22 verified snapshot had 224 numeric zeros. 10 changed result records identified by protected snapshot comparison: nine previously saved zeros became positive, one grade-only; no provenance established. No known authenticated user audit links them to a verified academic award; older Oct14 grade log not sufficient. No automatic rollback or approval.
- Real Exam9 original database immutability trigger and FORCE RLS remain active. PostgreSQL statement logging is off (log_statement none, log_min_duration_statement -1), making missing mutation-log evidence non-diagnostic; a single Oct22 immutability-error log entry was observed but does not attribute the ten changed records.
- A new private, keyed HMAC-SHA256 seal over CURRENT School1 Exam9 source rows was created in root-only mode0600 vault. Snapshot count 1854, zero215; HMAC 9abe4f5b53e3dacb95c98fbb0d0497faffb34e9765576280af0315a8ebef40a8. It is a FORWARD drift detector, not a new certified historical award master, not an approval, and never automatically rebaselines.
- Official First Term catalog remains 81 pending: saved data has 66 single-maxima candidates, 14 missing scored evidence and 1 conflicting Starter Blue English Oral maximum. Original GK Oral award sheet still missing; Retaj GK 0/25 unchanged. Historical extra Mover Computer row preserved.
- Source-only 034/035 marks/grade immutable append-only revision ledgers and 036 Owner role schema migration from previous missions remain uninstalled on live. No student/fee/result/role database mutations were performed in this mission.

## Verification and release decision
- Current mission focused Owner, marks, grade, catalog, protected templates and role regression test suite: 106/106 Node PASS.
- New 3 staff portal security gate fixtures PASS; 4 forward-HMAC snapshot fixtures PASS. Read-only runtime low-level forbidden-role test rejects 5 privileged roles without a DB write.
- Real read-only release readiness: 27 categories, 18 PASS, 9 FAIL, 21 unresolved; overall RELEASE_HOLD.
- Blocking gates: prior backup-gate hardcoding / offhost restore not certified; historical database baseline drift, frontend hashes/closure and real print parity, Owner account/role check, 81 official academic approvals, historic ten-change provenance, and signed live tenant denial.
- Source branch remains isolated and user academic data unchanged. No ChatGPT scheduled task created.
