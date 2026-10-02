# Phase 3S: Provider-Gated New-Authoring Draft Boundary

## Scope (isolated non-production; no deployment)
Based on Paper Phase3R commit `98c414e`. New backend module:
`al-siddique-backend/src/services/papers/newAuthoringDraftGatewayPhase3S.js`.
Unit tests: `al-siddique-backend/src/tests/newAuthoringDraftGatewayPhase3S.test.js`.
This module is NOT imported by Express/app.js, NOT wired to a route or an actual
PostgreSQL connector, and creates/modifies NO database schema or real school data.

## Privately injected trusted-server dependencies
- `authenticate(authenticationContext)`: resolve ACTIVE actor on the server.
  Only teacher, principal or admin with numeric user+school ID and resolved tenant ID.
  Service and unscoped platform accounts are deliberately ineligible.
- `approvedProvider({schoolId,tenantId,curriculumIdentity,selection})`: must independently
  audit the real published source and return exact bilingual approved records,
  source-book IDs/hashes, edition/cohort, ALP exam-year selection and monotonic revision.
  Client-side Phase3P/3R approved flags are never publication authorization.
- `isSchoolEnabled({schoolId,tenantId,feature})`: server-resolved feature enablement only.
- `repository.{createExclusive,loadScoped,casUpdate}`: ISOLATED role-bound storage port.
  It must enforce scoped school+tenant reads, unique (school,tenant,draft),
  revision=1 insert, atomic compare-and-swap on revision plus SHA and append-only revisions.
  It MUST verify the pinned `approvedSnapshotRevision` transactionally against
  the server-published snapshot; otherwise a withdrawal race between audit and commit remains.

## Fixed protocol
Each draft uses independent `PaperDocumentNewAuthoring` discriminator and protected
`NEW_AUTHORING_APPROVED_CURRICULUM` identity, never historic V13 migration hashes.
Original full English/Urdu academic records are compared exactly to authoritative
provider records; no question is seeded into the lossy legacy `question_bank` table.
Selected question IDs, original source ledger, edition, source book checksums and
selection remain immutable across draft revisions. Teacher-local changes may edit
working wording/options/marks while maintaining review flags and computed Attempt Any.
Stored native JSON text uses a 5 MiB UTF-8 limit and SHA-256.
`create`, `read`, `revise` use server-scoped actor; a teacher can read/revise only
their own draft. Save requires optimistic revision and exact previous SHA.
School principal/admin may access eligible drafts of their own institution.
Returned states never authorize printing, publication or existing-paper mutation.

## Mandatory activation requirements — NOT yet satisfied
1. Curriculum owner exports real authenticated revisioned approved provider (Issue #1).
2. Independent PostgreSQL catalog/RLS/grants review plus new-authoring table protocol.
3. Separate staging credential verified by immutable session login/school binding.
4. Encrypted backup, independently demonstrated restore and two-school adversarial tests.
5. Atomic snapshot-revision check at the SQL write boundary, teacher-owner attribution,
   collision-free CAS updates and append-only immutable audit on insert/revise.
6. Authenticated endpoint/feature flag with no production availability until release sign-off.
7. Urdu/English/MCQ parity, browser E2E, rollback and current production baseline review.

Current gateway additionally refuses construction when NODE_ENV is production.
No real provider response is present at this checkpoint; synthetic tests are NOT
evidence of publication approval or real PostgreSQL persistence.
