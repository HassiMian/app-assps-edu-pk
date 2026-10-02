# ASSPS Paper Generator — Phase 3E Staging-only Paper Revision Preflight
Date: 2026-10-02
Parent: a32bc5bf29d07733703aef9c2dfbb6b899a025a8 — verified pushed clean Phase 3D.
Isolated branch: feat/staging-paper-revisions-phase3e-20261002.
Status: OFFLINE/FAKE-DB STAGING PROTOTYPE ONLY; NOT a production release, not a migration.

## Principal's immovable source-native contract
The original previously approved paper design, text, marks, order, question grouping, RTL punctuation,
fonts, tables, answer lines, diagrams, A4 preview/PDF and editor functionality remain authoritative.
There is NO automatic PaperDocument conversion, paper restyling, source rewrite, approval or deployment.
Any future edit must be to a separately opted-in DRAFT copy with full immutable original retained.
Earlier 3A 101 exact repository-source hashes, 3B real saved browser snapshot, 3C Early Years
source overlays and 3D DATA+native screen/PDF evidence remain separate and preserved.

## Findings from read-only checked-in code investigation
- Backend active DB integration: al-siddique-backend/src/config/database.js uses node-postgres Pool
  and starts a connection attempt at import time. DO NOT import it from offline tests/preflight.
- Existing production-style backend startup app.js/server.js imports config/migrate.js and can
  auto-run its migrations unless AUTO_MIGRATE_ON_BOOT is false. Phase 3E intentionally adds NO
  new import to app.js/server.js, no active migration and no routes.
- Existing paperRevisionPolicy.js Phase 3B is a pure authorization + optimistic-lock PREPARE
  contract; it does not execute SQL, issue backend requests, or claim live paper_documents exists.
- Checked-in migrations currently contain Question Bank and exam workflows; absence of native
  paper_documents in checked-in migrations is NOT evidence of absence/presence in a live DB.
- Environment variable PRESENCE probe from current remote development shell: NODE_ENV, DB_HOST,
  DB_USER, DB_NAME, DATABASE_URL all NOT SET; backend src/.env absent in this isolated Git clone.
  We did not query a production/staging database, view password/connection strings or inspect
  any private tenant rows. Actual schema, grants, backups and restore status remain UNKNOWN.
- Generic tenantClause helpers that accept school_id OR tenant_id should NOT be reused for the
  new strict (school_id, document_id) ownership constraint.

## New dormant adapter: paperStagingRevisionAdapter.js
CommonJS module in al-siddique-backend/src/services/papers/. Exports:
- assertVerifiedStagingGate(gate)
- appendStagingDraftRevision({connect,gate,actor,paperId,expectedRevision,
  expectedNativeSha256,proposedNativeJsonText,verifiedPlatformSchoolId,
  platformScopeVerified})
- SQL static parameterized query contract (for review/fake driver tests).
Does not import config/database, have credentials, expose Express API, use tenant request headers
or run a migration. The future VERIFIED server-side bootstrap MUST inject an isolated staging
connector and trusted gate; a user-submitted gate flag is never evidence. Default no gate = reject.

Gate requires actual independent sign-offs for: explicitly confirmed non-production database,
reviewed live/staging schema inventory, verified encrypted backup, tested restore, independently
server-authenticated school scope, two-school isolation verification, and actual principal
approved original baseline+native A4 screenshot/PDF independently reviewed. The test uses
synthetic TRUE fixtures to exercise transactional logic, NOT to attest these facts live.

In one SERIALIZABLE transaction it locks the independently school-filtered existing DRAFT
paper row, reuses Phase 3B teacher/owner/role/source-protection checks and exact raw native
JSON SHA / expected revision CAS, verifies that the corresponding previous IMMUTABLE
paper_revisions seed snapshot exists with the same SHA, performs one parameterized DRAFT-only
CAS UPDATE (school_id, paper ID, revision, SHA, status and source_protected checked), appends
one full native text revision with old/new hash in paper_revisions and COMMITs. Any missing
seed, failed UPDATE RETURNING, bad audit INSERT, changed revision/source/owner or hash causes
ROLLBACK and no successful response. Both update and append must be ONE transaction.
If ROLLBACK itself fails the adapter raises a separate explicit quarantine-grade error.

Newly created draft copies and their initial v1 snapshots are a SEPARATE later bootstrap,
not this revision append function. There is no implicit migration of current browser papers
and no route to call this adapter on production.

## Read-only schema investigation asset
ops/paper-staging-review/schema-inventory-READ-ONLY.sql contains ONLY:
BEGIN TRANSACTION READ ONLY, short local query timeouts, PostgreSQL catalog/information_schema
metadata queries for schools, users, possible existing paper_documents/paper_revisions,
foreign keys, columns, indexes, RLS policies and extension presence, followed by ROLLBACK.
No SELECT * from schools/users/students, no actual native paper text, no INSERT/UPDATE/CREATE/
DROP, and no filesystem dump of credentials. Not executed by this phase: requires verified
authorized target and manual review first.

## PROPOSED schema contract — NOT AN APPLIED MIGRATION
Review actual read-only inventory BEFORE authoring any migration. Suggested DDL only after
confirming the existing schools.id/users.id types, public schema grants, RLS implementation,
existing table name collisions and backup/restore:
- paper_documents: (school_id, id) PRIMARY KEY; school_id explicitly verified; native_json_text
  TEXT (exact authoring bytes, not JSONB re-serialization); native_sha256 CHAR(64);
  revision integer >=1; status DRAFT/APPROVED/LOCKED; source_protected BOOLEAN default TRUE;
  original_source_paper_id, source_family, created_by, updated_by, timestamps.
- paper_revisions: (school_id, document_id, revision) PRIMARY KEY, composite FK to document,
  exact native_json_text TEXT, native_sha256, previous_native_sha256 (nullable only for v1),
  actor_id, change_kind, recorded_at; append-only DB trigger and REVOKE UPDATE/DELETE from
  app role. Initial revision v1 should be inserted with its draft seed transaction, never
  inferred retroactively by a browser import.
- Explicit DB tenant RLS and restrictive app grants. The future trusted transaction MUST
  SET LOCAL app.school_id from verified session/actor, not client input, in addition to
  its explicit SQL WHERE school_id and composite PK/FK; audit super_admin verified scope.
- Store original approved teacher references separately as IMMUTABLE evidence if ever imported,
  preserving original native renderer and exact approved 3D manifest. Never infer APPROVED from
  self-attested manifest hash or an AI-generated screenshot.
- DDL must be reviewed for constraints, data limit, race safety and deterministic transaction
  recovery on two separately seeded schools before staging migration. DO NOT put this proposal
  under existing config/migrations/ (which may auto-run on server startup).

## Offline acceptance / outstanding gates
- Pure fake node-postgres transaction tests cover school-ID collision isolation, verified-stage
  prerequisite rejection BEFORE connect, successful v2=>v3 draft append, owner and platform
  verified school, missing/diverged audit seed, stale second writer, concurrent failed CAS,
  DRAFT-only/source-protected invariant, failure or malformed audit RETURNING and rollback
  even after draft UPDATE, malformed request, source self-approval and rollback failure.
- This fake connector proves only application branch/SQL contract and rollback intentions.
  It cannot prove PostgreSQL constraints, row locks, trigger immutability, real RLS, serializable
  concurrency handling or physical disaster recovery. Those REQUIRE an actually provisioned
  isolated staging database, manual schema review and encrypted backup+restore gate.
- Current actual principal-approved browser paper DATA+PNG+PDF+3D manifest still not captured/
  independently reviewed here. No live schema/backup verified. Therefore append adapter remains
  DORMANT and no staging/production SQL was executed.
- Later Phase 3F: authorized read-only schema inventory on an isolated staging target, verified
  backup/restore evidence, reviewed migration (explicit gated manual apply), multi-school
  PostgreSQL integration tests, signed original human visual comparison and only then
  cautious opt-in self-service Draft PaperDocument revisions. Production cutover is separate.

## Final Phase 3E offline acceptance
- Combined pure Phase 3B + 3E staging/policy/catalog suite: 26/26 PASS; node --check PASS. Covers school isolation with identical paper ID, stale CAS, immutable seed, owner/super-admin scope, rollback after audit failure, no production connection and oversized multibyte Urdu payload (UTF-8 byte bound checked BEFORE connect).
- No PostgreSQL connection was made. Fake-data prerequisites are TEST FIXTURES, not evidence that staging backup, real RLS, DB constraints, restore or principal's original-paper visual signoff have happened.
- Phase 3D 43/43 original frontend screen/print and 61/61 mixed regressions are inherited; Phase 3E leaves the complete frontend tree unchanged, verified by Git tree identity before commit.
