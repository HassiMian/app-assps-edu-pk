# ASSPS Unified Candidate — Disaster Recovery, RLS and HTTP QA Addendum (2026-10-19)

Production status: **NOT DEPLOYED — RELEASE HOLD**.

Integrated source base: `integration/assps-unified-live-reconcile-20261019@1753ad1d09ec5c95bafa667fa8b4a864bb33e7b8`, two parents preserve actual live frontend `f4a2a340f0b94d41fe152012079b55d7f82779f2` and protected secure Core `0c9b7063811571ec4224951a1fd09247930159f8`.

## New verified tests
- Source-level actual Express HTTP Timetable Save/Snapshot, fictional actors and mock DB, checks anonymous / teacher denial, peer-school blocking, eight-period validation, independent source attestation, stale revision rejection, tenant context, SERIALIZABLE transaction, exactly eight inserts and controlled commit.
- Selected backend Node/Express tests **105/105 PASS**, zero failures, covering school documents, HR privacy, Lesson scope, public branding and timetable. Earlier merged Lesson Chromium **2/2 PASS**, six protected Paper template integrity checks PASS.
- Current latest merged frontend Vite build PASS, zero touched-file ESLint errors, production-safety check PASS.

## Restore evidence (all tests on isolated Hostinger PostgreSQL 16)
Backup `/var/backups/assps-critical-20261019T013648Z`: all **4/4 SHA256** entries verified.
- Main `postgres-all.sql.gz`: independent disposable `pg_virtualenv -v 16` restore EXIT 0; 63 databases restored, `apexos` student count **322**, exam count **1,854**.
- Signed `postgres-asspssigned-55432-all.sql.gz`: independent disposable `pg_virtualenv -v 16` restore EXIT 0; 35 databases restored.
- The initial signed rehearsal failed because `pg_dumpall` contained a bootstrap `postgres` role ALTER that invalidated the temporary environment's localhost authentication. The corrected candidate script filters only CREATE/ALTER postgres bootstrap role and duplicated postgres DB creations, preserving all school data and other roles. Both restorable archives subsequently PASS, and ephemeral clusters were automatically dropped.
- Candidate script `ops/release/disaster-recovery/rehearse_dualcluster_disposable.sh` enforces isolated temporary data-directory check; script is not a production restore action.
- **Not independent offsite**. Hostinger local ephemeral recovery cannot certify disaster recovery after total VPS loss, RPO/RTO or geographically independent encrypted backup storage.

## Signed RLS rehearsal
- Current live apexos FORCE RLS count 85; previous 82-vs-85 delta is precisely three School Document family tables.
- Live `apexos_user` with `app.rls_enabled` unset SELECTs **18** School1 documents; with `app.rls_enabled=true` and `app.tenant_id=2` returns **0**. This is role-policy fallback weakness, not evidence of safe signed-actor isolation.
- Disposable main PG16 full restore tested a **rollback-only** tenant-only six-policy candidate from `ops/release/security/school_document_rls_tenant_only_disposable.sql`, with 0 docs for unscoped role, 0 for School2, 18 for scoped School1, 0 when RLS flag disabled. This test PASS.
- This is NOT a signed/HMAC actor enforcement proof: PostgreSQL session GUCs alone may be set by a sufficiently privileged client. Enabling stricter production policies without verifying all legitimate runtime read paths would break Notice Studio. Do NOT apply the rehearsal SQL to live database.

## Actual backend provenance risk
On live `/var/www/apex-backend/src` compared byte-for-byte to merged candidate source: 560 matching files, 29 differing files and 173 live-only files, including marketing services and operational modules. Therefore replacing the whole backend with candidate would overwrite newer live artifacts. Final release must use source reconciliation and protect live-only work.
Current deployed frontend and backend release-meta.json files still report historical Oct8 commit SHAs. No exact running backend commit attested.

## Outstanding blockers
- Real Principal and Teacher login, School2 denial, actual Lesson Save→Reopen→Print, Urdu Ricoh A4 hardware acceptance.
- 0 active teacher_class_assignments, 3 private lesson plans and 0 shared; 59 academic source candidates held with no independent Academic/Paper Studio signoffs.
- Approved official 16-Oct timetable PDF SHA attested; all 336 day-specific slots present, same teacher user ID 2386 for title-only Fatima/P7 mismatch; daywise source_sha256 remains 14-Oct digest for 336 rows. No live timetable DML was done.
- Live branded login public route returns HTTP404; reviewed fix source exists but has not been deployed.
- Independent encrypted offsite restore, signed RLS real actor tests, exact backend and frontend deployed release ancestry and genuine live acceptance must pass before final certification.
- No live student/exam/fee/timetable/teacher permission database mutation or frontend/backend/Nginx/PM2 deployment in this checkpoint.

**RELEASE HOLD.**
