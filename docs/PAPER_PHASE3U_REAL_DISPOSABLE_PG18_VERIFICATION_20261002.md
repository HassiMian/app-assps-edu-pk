# Phase 3U — Disposable PG18 new-authoring storage verification

Date: 2 October 2026. Parent: Phase 3T commit `bf7916d`.
New isolated branch: `feat/paper-disposable-db-phase3u-20261002`.

## Added files
- `ops/paper-staging-review/phase3u-new-authoring-DISPOSABLE-ONLY.sql`
- `ops/paper-staging-review/phase3u-run-new-authoring-DISPOSABLE-ONLY.ps1`
- `ops/paper-staging-review/phase3u-native-smoke-DISPOSABLE-ONLY.ps1`
- `al-siddique-backend/src/tests/newAuthoringDisposablePhase3U.test.js`

These are NOT automatic application migrations, production routes or school data changes.
Existing paper V13/Canonical v2, Phase3O–3T sources and the active Curriculum worktree stay untouched.

## Physical schema prototype — purpose-specific, real PostgreSQL semantics
1. Exact database, port, listen address, admin session and pristine-table guard BEFORE DDL.
2. Two separate synthetic school/tenant bindings to authenticated `session_user`, protected
   by NOLOGIN purpose-only identity owner; no RLS authority from request headers/GUC.
3. Private FORCE-RLS approved snapshot and a SECURITY DEFINER purpose-only publisher lock;
   scope additionally checks independent session school AND tenant; holds row FOR SHARE.
4. Separate drafts/revisions with composite school/tenant keys, source snapshot FK,
   composite actor FK, database-recomputed SHA-256 from exact native UTF-8 TEXT.
5. BEFORE UPDATE draft guard preserves original sourceIdentity/sourceLedger and monotonic
   draft revision; publication revocation blocks even direct credentialed draft mutation.
6. Revision insert trigger checks exact current draft bytes/SHA and previous immutable SHA;
   revisions reject UPDATE/DELETE even from a privileged SQL role when triggers are enabled.
7. Tenant role can SELECT/INSERT its scoped draft/revision and update only permitted draft
   columns; no direct published-snapshot SELECT/UPDATE or revision UPDATE/DELETE grants.

## Executed on a brand-new synthetic-only PG18 cluster
Host `127.0.0.1`, port `55443`; database `assps_paper_phase3u_ci`.
School 51 / tenant-51 / actor 110 and School 52 / tenant-52 / actor 120 are fictitious.
First guarded schema run succeeded, then test stopped because node-postgres was not installed
in this checkout. No dependency was installed/downloaded. Temporary cluster was cleaned.
Second run used the installed native `psql` client instead; runner exit code **0**.

### Actual native PostgreSQL checks PASS
- Correct session-user-derived school+tenant; forged `app.paper_school_id` did not change it.
- School 51 saw only its matching publisher lock; School 52 could not see School 51's
  published source or draft. Direct snapshot/identity table grants were denied.
- Inserted one independent DRAFT and matching immutable revision in a transaction.
- Exact native-text SHA independently recomputed by database; Urdu JSON code points
  round-tripped to the expected UTF-8 bytes.
- Performed revision 1 -> 2 update and linked exact previous SHA in immutable audit.
- Stale revision returned no changed row. Direct SQL replacement of sourceLedger and
  UPDATE of prior revision were rejected by their database triggers.
- Revoked publication. Subsequent publisher lock and direct SQL draft mutation failed.
- Created native `pg_dump -Fc` archive, catalog-inspected, restored to second fresh
  database `assps_paper_phase3u_restore_ci`, and verified **1 draft / 2 revisions**.
- Stopped ONLY the marker-owned test cluster, removed test data, cleared ephemeral
  password variables. Afterwards port 55443 listener count = **0** and test `data`
  directory did not exist. Existing PostgreSQL instances/port 5432 were not accessed.

### Recorded synthetic evidence
Backup archive size: **34,769 bytes**.
SHA-256: `c7a5437c62f65f6a7645213453b7e75351b18c21880298cbb7d8e69146204b07`.
Source manifest resides outside Git under the uniquely generated, marker-owned
`%TEMP%/assps-phase3u-ephemeral-bdf1a16bc8f64ce9a6384cece341b765/synthetic-evidence.json`.
Only fabricated content appears in this archive. It is NOT a real institution backup.

### Current verification boundary
Physical schema/trigger/RLS verification uses actual native `psql`; it does NOT
instantiate the Phase3T JavaScript repository using a real node-postgres connector.
Phase3T's separate synthetic transaction tests verify adapter SQL and return contracts;
actual JS-to-PostgreSQL end-to-end integration remains a distinct release gate.
Phase3U's published binding uses a synthetic fixture digest, not independent approval
from the real Curriculum agent. Client snapshots alone cannot authorize publication.

## NOT approved for production
1. Await independently audited full bilingual approved Curriculum provider, exact record
   and textbook checksums, registered topics, publication/revocation monotonic revision
   (GitHub coordination Issue #1); currently only reviewed chapter/topic DRAFT work exists.
2. Independent schema and grant review with real release tenant requirements and a
   thoroughly reviewed migration/rollback. This disposable SQL must NEVER be run on live DB.
3. Provision purpose-scoped real credentials securely, then actual Phase3S -> Phase3T
   repository integration with real native adapter, no demo/mock auth path.
4. Prove concurrent CAS, approval revocation race, backup restore, cross-tenant bypass
   denial and owner attribution in an independently authorized staging environment.
5. Complete browser E2E and Urdu/English print parity, ensure archived reference papers
   and original data remain immutable; release via a reviewed feature-flagged integration.

Verification scope: 8 new Phase3U static-contract tests; preceding Phase3O–3T had
63 passing targeted tests. Full application suite/build and production rollout are separate.
