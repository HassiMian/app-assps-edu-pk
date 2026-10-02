# Paper Generator Phase 3T — Role-Bound New-Authoring Repository Contract

**Status:** dormant code + synthetic transaction tests, not a live DB migration or publication approval.
Parent Phase 3S: `d8a43b8`. Independent feature branch: `feat/paper-role-bound-repository-phase3t-20261002`.

## Scope and ownership
- New: `al-siddique-backend/src/services/papers/newAuthoringRoleBoundRepositoryPhase3T.js`.
- Tests: `al-siddique-backend/src/tests/newAuthoringRoleBoundRepositoryPhase3T.test.js`.
- Existing official V13, Canonical V2, Phase3O–3S, historical paper staging and active apps stay unmodified.
- Curriculum owner alone publishes real, independently audited bilingual records and approved source revisions.
- No Express route, database import, credentials, migration or production connection is present in this module.

## Privately provisioned trust boundary
Trusted backend bootstraps the adapter with an explicit school/tenant -> single-purpose connector registry.
Each connector must login as `assps_p3t_school<schoolId>`; duplicate connector or credential mappings fail.
The FIRST query independently checks `session_user`, `phase3t_session_school_id()` and
`phase3t_session_tenant_id()` against the trusted school and tenant. Wrong login is quarantined
before BEGIN; no school/tenant identity may be taken from a request header/body or forgeable GUC.
Role principals must have no SUPERUSER, BYPASSRLS, CREATE on public, or other-tenant membership.
An independent, purpose-only NOLOGIN owner holds private login-school-tenant bindings and functions.

## Authoritative snapshot binding
`authoringBindingSha256(sourceIdentity)` is the SHA-256 of the fixed-order tuple:
curriculum authority, grade, subject, textbook ID, edition, syllabus version, Full/verified ALP mode
and exam year, both book IDs, and both independently verified PDF hashes.
The Curriculum publisher MUST produce the exact same digest and pin a monotonic revision in
`new_authoring_approved_snapshots_staging`. The tenant login MUST NOT have snapshot UPDATE grants.
The adapter invokes `phase3t_lock_published_snapshot(school,tenant,bindingSha,revision)`
within the same SERIALIZABLE transaction as draft CREATE or CAS UPDATE. This function must be
SECURITY DEFINER with fixed search_path, private session-user scope verification,
and a parameterized SELECT of the matching **PUBLISHED_APPROVED** row held **FOR SHARE**
until commit. The function returns one matching revision, otherwise no row.

## New relations (review proposal ONLY; do not apply automatically)
1. `new_authoring_approved_snapshots_staging`: school_id, tenant_id, immutable binding_sha256,
   approved revision, status. Composite key (school_id,tenant_id,binding_sha256,revision).
   Curriculum-only publication role writes/revokes; tenant credential only EXECUTEs the narrow lock function.
2. `new_authoring_drafts_staging`: composite PK (school_id,tenant_id,draft_id),
   created_by and updated_by with composite same-school actor foreign keys, DRAFT status,
   source_protected=FALSE, revision>=1, exact native_json_text TEXT and native_sha256,
   approved_snapshot_revision plus approved_binding_sha256; composite FK to the approved snapshot.
3. `new_authoring_revisions_staging`: composite PK (school_id,tenant_id,draft_id,revision),
   exact native text/SHA, previous SHA, same-school actor_id, INITIAL_AUTHORING or DRAFT_CAS_REVISION,
   FK to its own school/tenant draft. Reject UPDATE/DELETE at both trigger and privilege level.

Required SQL-level guarantees: FORCE ROW LEVEL SECURITY for drafts and revisions, independently
verified session-user school AND tenant predicates in USING and WITH CHECK; no permissive bypass OR.
Native text is limited to 5 MiB UTF-8, and database recomputes SHA-256 from exact TEXT (not JSONB).
Revision insert guard checks revision 1 has null previous hash, subsequent previous SHA equals
the immutable preceding revision, and inserted native text/hash match the current draft.
Snapshot pinning and source ledger identity cannot change on an UPDATE (restricted columns/trigger).
Principals must not be table owners or inherit publication/admin roles. Review catalog/grants separately.

## Repository operations (injected into dormant Phase 3S only after all gates)
- `createExclusive`: verify authenticated session, BEGIN SERIALIZABLE, lock published snapshot,
  insert exactly one DRAFT without collision overwrite, append INITIAL_AUTHORING revision, COMMIT.
- `loadScoped`: verify login, use READ ONLY transaction and explicit school/tenant/draft filters;
  return exact native bytes and verify hash. Phase3S rechecks current provider approval/ownership.
- `casUpdate`: lock approved revision, lock original draft FOR UPDATE, compare revision and old
  native SHA, prohibit sourceIdentity/sourceLedger/selected-question changes, update exactly one draft
  with revision+1, append linked immutable revision, COMMIT. On any failed row check, ROLLBACK.
- A failed COMMIT has unknown outcome: discard/quarantine connection, inspect scoped record before retry.
  There is no blind automatic retry and no saving to legacy Question Bank or official paper corpus.

## Hard gates before ANY real PostgreSQL test / feature-flagged route
- Explicit original Curriculum Issue #1 handoff: authentic PUBLISHED_APPROVED record snapshot,
  independently audited bilingual source, chapter/topic IDs, provider snapshot and revision semantics.
- Owner-reviewed dedicated disposable database schema, constraints, trigger, identity functions,
  least-privilege grants, security-definer source-row lock, immutable publication role and FORCE RLS.
- Independent backup/restore exercise; two school/tenant logins with negative cross-scope tests.
- Actual native SHA/Urdu-byte fidelity, concurrent CAS and revocation-vs-save race test using real PG.
- Phase3S feature flag, authenticated endpoint and production rollout remain disabled until signed off.

Unit results are from a **synthetic fake PostgreSQL client** only; neither this document nor passing
mock tests establish that the proposed physical tables, RLS or provider are deployed/approved.
Current Phase3S and Phase3T factories explicitly refuse NODE_ENV=production.
