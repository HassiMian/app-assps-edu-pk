# ASSPS Paper Generator — Phase 3F strict paper RLS + isolated staging catalog
Date: 2026-10-02
Parent checkpoint: f5dbf438eef43f833d2ae2adbba7ed358b73639e (Phase 3E pushed/clean).
Feature: feat/strict-paper-rls-phase3f-20261002.
Status: OFFLINE SECURITY IMPLEMENTATION ONLY. Live PostgreSQL integration SKIPPED by default.

## Immovable original-paper contract
Previously approved ASSPS papers are the reference authority, including exact question content,
numbering, user edits, marks, options, tables, answer space, Urdu/English direction, fonts,
images, and page/print/PDF layout. No code in Phase 3F alters an existing original, renderer,
PaperDocument schema, original Early Years V2 files, official 43 V13 papers, paper store,
Exam workflows or print CSS. A new edited paper requires an opt-in DRAFT copy and separate
principal-reviewed Phase 3D original JSON + native preview PNG + A4 PDF + evidence manifest.
DATA_CAPTURE_ONLY and EVIDENCE_COLLECTED_UNVERIFIED are not release approval.

## Source-derived RLS security finding
The existing checked-in al-siddique-backend/src/config/migrations/005_rls_policies.js uses
the legacy tenant_isolation_policy, including:
  current_setting('app.rls_enabled', true) IS DISTINCT FROM 'true'
  OR current_setting('app.is_super_admin', true) = 'true'
  OR school_id = NULLIF(current_setting('app.tenant_id', true), '')::int
That first OR branch allows tenant-scoped access through that policy when app.rls_enabled is
not 'true'. It must NOT be copied to paper_documents or paper_revisions as an authoritative
security boundary. This Phase only diagnoses the legacy condition; it does NOT modify or
deploy a new policy on existing production tables.

## Phase 3F new fail-closed design (DRAFT staging contract, NOT applied DDL)
The future new-paper DB role must be a non-superuser with NO BYPASSRLS. Both paper_documents
and paper_revisions must be permanent base tables with ENABLE and FORCE ROW LEVEL SECURITY.
Require one independently reviewed strict policy per new table: both USING and WITH CHECK
must equate school_id to the transaction-local, server-authenticated
current_setting('app.paper_school_id', true) value (NULL/absent means DENY, never permit).
There must be NO extra permissive policy, OR-based fallback, disabled-RLS exemption,
unchecked super-admin shortcut or tenant ID supplied by request headers/UI.
The draft policy shape FOR REVIEW ONLY (the next SQL is EXPLANATORY, NOT installed):
  FOR ALL USING (school_id = NULLIF(current_setting('app.paper_school_id',true),'')::integer)
  WITH CHECK (school_id = NULLIF(current_setting('app.paper_school_id',true),'')::integer)
The future migration must separately review real schools/users PK types, grants, index design,
composite (school_id,id) primary key, composite
(school_id,document_id,revision) revision primary key and same-school composite FK,
native_json_text TEXT exact authoring bytes, immutable audit trigger, source_protected
DRAFT restrictions and backup/restore. Current inspected role must not hold UPDATE/DELETE
on paper_revisions. More restrictive DB grants/ownership are required for formal approval.

## Files and code
- paperStagingRevisionAdapter.js: after BEGIN SERIALIZABLE and BEFORE any paper SELECT,
  use PARAMETERIZED SELECT set_config('app.paper_school_id',verifiedActorSchool,true)
  on the same transaction/connection. Reject missing/mismatched transaction-local result.
  The explicit WHERE school_id and Phase 3B authorization+CAS checks still apply.
  A failed COMMIT has an uncertain outcome and quarantines the PG connection via
  client.release(error), even when subsequent ROLLBACK appears successful. A failed ROLLBACK
  also quarantines the connection, raises explicit error, never reports success.
- paperStagingRlsAudit.js: pure, no database import. Reviews independently retrieved
  catalog metadata: RLS ENABLE/FORCE, base relation, non-bypass role, one strict policy
  with USING+WITH CHECK, presence/non-null columns, lossless native TEXT,
  (school_id,id) + (school_id,document_id,revision) composite PKs and same-school FK,
  and no audit UPDATE/DELETE grant. Detects the legacy fail-open policy in checked-in source.
  Its best possible status is STRUCTURE_CANDIDATE_REQUIRES_INDEPENDENT_SIGNOFF;
  approved=false and authorizesSqlExecution=false ALWAYS, even for perfect fake metadata.
- ops/paper-staging-review/phase3f-strict-paper-rls-READ-ONLY.sql: manual-only SELECT
  on PostgreSQL system catalogs, information_schema, policy and current-role metadata.
  Starts BEGIN TRANSACTION READ ONLY and ends ROLLBACK; short statement/lock timeouts.
  Does NOT read actual tenant/paper/student rows, native paper JSON or credentials.
- paperStagingReadOnlyPostgresPhase3F.test.js: optional read-only integration harness.
  Without BOTH an exact independent opt-in and staging DSN, SKIP with DB NOT CONTACTED.
  With opt-in, it only accepts a loopback target DB named assps_paper_phase3f_ci,
  opens a read-only transaction, rechecks actual current_database() BEFORE catalog queries,
  and feeds real metadata to pure auditor. Never imports active config/database.js,
  creates/changes schema, inserts, updates, commits DB writes or prints credentials.
  It does not attest backup/restore or human approval; schema candidate remains review-only.

## Offline acceptance actually executed
- Combined Phase 3B/3E/3F backend suites: 39 tests total,
  38 PASS, 0 FAIL, 1 deliberately SKIPPED real PostgreSQL catalog test.
- Includes failure-path coverage: missing RLS scope blocks BEFORE read, two schools with
  colliding paper IDs, optimistic CAS and immutable audit, missing seed, strict policies,
  extra permissive policy OR-bypass, unsafe DB role, missing composite FK, JSONB instead
  of exact TEXT, real legacy fail-open migration detection, screenshot/backup gates,
  commit-uncertainty and rollback-failure connection quarantine.
- Scoped Node syntax checks PASS. No active DB connection was opened in this phase.
- The synthetic test gate flags DO NOT prove real inventory/backup/restore/RLS.

## Actual work still blocked pending independent evidence
1. Obtain the principal's ACTUAL original selected paper native DATA baseline, native screenshot,
   native A4 print PDF and the Phase 3D manifest and perform independent human visual comparison.
2. Verify the target is a separately isolated staging DB; do not use production or the app's
   active auto-connecting database pool.
3. Read actual schema/grants/RLS with the manually reviewed READ-ONLY inventory; do not silently
   assume new paper_documents/paper_revisions already exist.
4. Prove encrypted backup AND a separate restore test under authorization and log evidence.
5. Human review strict schema/RLS/append-only migration separately; no auto-migration hook.
6. Seed two fictitious schools, deliberately colliding paper IDs, a DRAFT revision v1 and
   immutable original references ONLY in isolated staging; run real PG concurrency/RLS tests.
7. Independently approve original visual/print parity before considering an opt-in new renderer.
8. No production deployment or original-paper replacement under Phase 3F.

Phase 3G continuation: complete independently authorized real staging/catalog/restore evidence
before any reviewed DDL apply, then real two-school PG integration with strict RLS and
append-only/audit/CAS. Maintain original native renderer until explicit signoff.
