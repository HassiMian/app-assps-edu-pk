# ASSPS Paper Generator — Phase 3G REAL isolated PostgreSQL18 + synthetic backup/restore acceptance
Date: 2026-10-02
Parent: cb62128e64d0ad38b338cd0ea3e1743b06b7c1a0, pushed clean Phase 3F.
Isolated feature: feat/real-isolated-pg-and-restore-phase3g-20261002.

## Source-native protection continues unchanged
Exact original ASSPS user-approved Paper Generator source content, print/PDF/A4 patterns,
numbering, marks, paper layout, Urdu Jameel Noori, tables, answer lines, diagrams and
student/examination data MUST remain protected. No original/reference paper can be
transformed into a new renderer or auto-approved from synthetic tests. Independent Phase3D
original user DATA JSON + native preview PNG + native A4 PDF + manifest and HUMAN visual
inspection are STILL outstanding. Any future new PaperDocument is an opt-in separate DRAFT.
Phase3G changes no frontend, source paper data, print/preview CSS, active backend routes
or config/migrations, production/legacy RLS and no already-approved school paper.

## Environment and absolute isolation observed on CYBERSPACE
- Installed PostgreSQL18 Windows service already existed and listened on port 5432.
  DID NOT connect to, query, restart or edit that service, its databases or credentials.
- Existing binaries (initdb,pg_ctl,psql,createdb,pg_dump,pg_restore) used to initialize a
  NEW independent data directory under %TEMP% with an unpredictable GUID and own marker.
- A separate one-use PostgreSQL cluster listened ONLY on 127.0.0.1:55439, with
  randomized SCRAM credentials generated in memory for synthetic admin and restricted
  assps_p3g_app role; no keys/credentials entered repo or output manifest.
- Strict runner checks dedicated port free, exact new data-directory ownership marker,
  C: free-space at least 2 GB and explicit RUN_SYNTHETIC_ONLY action. DDL blocks
  any target not named assps_paper_phase3f_ci on the intended port/listen address,
  or any target having pre-existing schools/users/paper_documents/paper_revisions tables.
- No npm download: NODE_PATH uses previously installed frontend node-postgres module.
  No active backend database.js imported and no generic DATABASE_URL fallback.
- Dummy schools 51 and 52, fake actors 11 and 12, deliberate same paper ID draft-001,
  one protected APPROVED reference and separate concurrent-001 fixture ONLY.
  NO student rows or genuine school paper data were used.

## Real test result — not mocked
1. Tested actual server catalogs under separate restricted app role: FORCE+ENABLE RLS on
   paper_documents and paper_revisions, strict USING/WITH CHECK policy, non-superuser
   without BYPASSRLS, denied revision UPDATE/DELETE grants, lossless TEXT, composite PK/FK
   and SHA-256 consistency CHECK at database layer. Independent strict auditor accepted
   structure as CANDIDATE_FOR_INDEPENDENT_REVIEW_ONLY, never approved/cutover-ready.
2. Without transaction-local app.paper_school_id, both tables expose ZERO rows.
   Scoped school 51 cannot read school 52 even with identical draft-001 ID; transaction
   ROLLBACK clears tenant scope automatically; school 52 sees only its own record.
3. Direct approval-column mutation is permission denied. Cross-school audit INSERT
   blocked by RLS OR the independent immutable-revision trigger (observed actual
   rejection came from the trigger before the SQL RLS error).
4. Real SERIALIZABLE Phase3E/3F adapter commits school 51 DRAFT revision v2->v3 and
   immutable v3 audit (exact previous SHA) in ONE transaction, preserves school 52
   source and protected approved-001. Stale v2 retry rejected. Independently scoped
   school 52 can safely advance its own same-named draft-001.
5. Real competing SERIALIZABLE writers on SAME v1/concurrent-001 produced exactly
   ONE success, ONE rejection and exactly ONE immutable v2 audit. No duplicate
   revision and no silent repair.
6. Even privileged direct UPDATE or DELETE to an immutable revision is rejected by
   actual database trigger; approved original source row remains byte-for-byte same.
RESULT: real synthetic isolated database integration 7/7 PASS, 0 FAIL, exit 0.
Additional independent existing Phase3F *real* read-only catalog test 1/1 PASS.

## REAL synthetic backup AND distinct-database restore evidence
- Took pg_dump -Fc custom archive from assps_paper_phase3f_ci AFTER the tests,
  validated archive listing with pg_restore --list, created NEW empty separate
  assps_paper_phase3g_restore_ci in that SAME isolated temporary PostgreSQL cluster,
  ran pg_restore --exit-on-error into the separate DB.
- Node independently queried both DBs and compared EVERY ROW/FIELD in synthetic
  schools, users, paper_documents and paper_revisions (including exact original
  native_json_text UTF-8, SHA-256 for every paper/revision). Also matched strict RLS
  policy definitions, ENABLE/FORCE flags and 2 revision triggers in restored DB.
- Result: real restored synthetic data and metadata verification 1/1 PASS, exit 0.
- Custom archive size: 16,726 bytes.
- Retained exact archive SHA-256:
  86100d44144245fce11e3f1c4d8aa337cfceb2d195da62c2be904f555bd37277
- Only self-created stopped cluster DATA directory removed after verified pg_ctl STOP.
  Post-run port 55439 listener count = ZERO; existing port 5432 still had two listener
  bindings. Small fictional-only archive, pg.log and non-secret evidence manifest
  retained outside Git at:
  %TEMP%\assps-phase3g-ephemeral-6e374326dd15402fa7044f54b05a906e\
  synthetic-phase3g-result.json and synthetic-only-PG18-backup.dump
- The synthetic archive is NOT encrypted. It proves the mechanism and deterministic
  restore on fake data ONLY. This is NOT a backup of genuine school information, not
  proof of a production encrypted backup and NOT authorization to run a migration.

## Repository implementation
- ops/paper-staging-review/phase3g-DISPOSABLE-ONLY-schema.sql:
  exact target/port/pristine DB hard guard followed by disposable-only synthetic
  schools/users and two native-paper tables; CHECK raw UTF-8 SHA, school composite
  PK/FK, append-only trigger, seed/chain validation trigger, forced strict RLS,
  restricted app grants. NOT added to auto migration directory.
- ops/paper-staging-review/phase3g-run-disposable-ONLY.ps1:
  explicit opt-in, port preflight, random isolated cluster, short-lived credentials,
  independent SQL validation, real tests, pg_dump + fresh database pg_restore,
  SHA/no-secret manifest, stop and safe cleanup of ONLY marked test cluster data.
- al-siddique-backend/src/tests/paperStagingDisposablePostgresPhase3G.test.js:
  real strict RLS, source-native SHA, serializable CAS, cross-school colliding ID,
  approved reference lock, contention and privileged audit trigger coverage.
- al-siddique-backend/src/tests/paperStagingRestorePhase3G.test.js:
  separate DB exact raw data/digest/policy/trigger and FORCE RLS restoration proof.
- al-siddique-backend/src/tests/paperStagingDisposableSafetyPhase3G.test.js:
  static checks on target/schema hard guard, no source/prod/migration import,
  no package install, dedicated only-127.0.0.1:55439 and opt-in skip behavior.
- The source module paperStagingRevisionAdapter.js and ALL existing frontend are
  UNMODIFIED in Phase3G. Phase3D original screen/print tests (43/43) remain inherited.

## Acceptance history (transparent)
First disposable run correctly stopped on missing pg dependency from isolated backend
node_modules; fixed by reusing already installed frontend pg via process NODE_PATH.
Second disposable run 6/7 due exclusively to inet_server_addr() returning 127.0.0.1/32,
not host 127.0.0.1; test corrected using PostgreSQL host(inet_server_addr()).
Third disposable run all actual database tests executed; a cross-school INSERT was
correctly rejected by the revision trigger rather than RLS's error-message wording,
so test now explicitly accepts either independent protection path.
Final run: real integration 7/7 PASS, independent read-only catalog 1/1 PASS,
separate real synthetic backup/restore 1/1 PASS, successful safe STOP+cleanup.
After the successful run, only NON-FUNCTIONAL test/safety refinements were made:
single-client catalog queries sequenced to avoid pg@9 deprecation warning,
runner requires mandatory explicit synthetic action and a minimum 2 GB C: free.
No DDL, transactional adapter, backup/restore comparison or native-source logic changed.

Final default-no-DSN offline regressions (Phase3B+3E+3F+3G):
45 tests total, 42 PASS, zero FAIL, 3 intentionally SKIPPED genuine Postgres tests
which ran independently and passed in the explicit isolated runner. Node tests and
PowerShell script syntax PASS.

## Remaining REAL production-adjacent blockers (DO NOT silently claim complete)
1. Principal must select and independently visually approve the genuine original
   working paper DATA baseline, full native screenshot and A4 PDF with Phase3D manifest.
2. A persistently authorized, explicitly NON-production real staging DB must have a
   separate documented inventory; this ephemeral synthetic DB is not it.
3. Actual encrypted genuine school/staging backup plus verified restore must exist
   BEFORE reviewed migration, with strict authorization and recovery rehearsal.
4. Security NOTE: PostgreSQL custom app.paper_school_id is SETTABLE by an arbitrary
   SQL-capable app DB principal. Strict RLS + trusted adapter + parameterized SQL
   are defense-in-depth but NOT cryptographic tenant attestation against arbitrary
   injected SQL. A future production candidate must adopt an independently
   non-forgeable school identity binding (e.g. strictly mapped per-tenant role or
   trusted privileged context mechanism) and prove it under adversarial integration.
5. The original existing legacy RLS migration 005_rls_policies.js still has a
   permissive fallback; it remains unchanged here and cannot be copied to new tables.
6. Review real target school/users key types and grants, DDL/trigger/security definer,
   authorized original source import policy and opt-in draft creation.
7. No production deployment, original renderer cutover, exam/marks rewrite or
   auto conversion permitted from these synthetic results.

Continue Phase 3H from this exact branch: actual principal-approved source package,
non-forgeable tenant identity review, reviewed persistent staging/backup/restore and
user-approved opt-in DRAFT integration. Preserve Phase3G synthetic evidence and
all original native paper patterns.
