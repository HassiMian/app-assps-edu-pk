# Phase 3V — Signed, audited Curriculum publication acceptance (3 October 2026)

Parent: Phase3U commit `568fd4e`. This is a DORMANT, staging-only, server-side provider.
Files: `al-siddique-backend/src/services/papers/approvedCurriculumProviderPhase3V.js` and
`al-siddique-backend/src/tests/approvedCurriculumProviderPhase3V.test.js`.
No app route, seeding, new database migration, historical paper rewrite or production deployment.

## Current upstream finding
The separate Curriculum worktree was observed at `6fb16e5`: reviewed bilingual Chapter 1
topic DRAFTS, not a versioned independently published approved record collection.
The IX Urdu Biology manifest still flags edition/cohort equivalence for verification; several
official-book chapter/exercise indexes are pending; liveSeedCount=0.
GitHub coordination Issue #1 has no approved-snapshot handoff comment as of this checkpoint.
Consequently this phase must NOT expose real question data or label draft content approved.

## Exact future publication contract (trusted server-only)
`createPhase3VApprovedProvider` receives only backend-owned injected ports:
`resolveCurrentHead`, `readPublication`, `readPublishedRecords`, `publicKeyRegistry`, `clock`,
plus explicit isolated development gate. None of these ports can be supplied by browser requests.
`resolveCurrentHead` returns current authoritative school+tenant, publicationId, revision,
PUBLISHED_APPROVED status and SHA-256 of canonical publication payload.
`readPublication` returns complete publisher-signed payload and Ed25519 signature.
`readPublishedRecords` returns the independently reviewed academic records with full original
English/Urdu answer/evidence. The pinned public key is from a separately controlled backend
registry, scoped to signed authority and publication validity window.

Publication payload discriminator: `assps-curriculum-signed-publication-v1`.
Required values: schoolId/tenantId, publicationId, monotonically current revision, signingKeyId,
official curriculum authority/grade/subject/textbook/edition/syllabus version,
Full or exam-year-verified ALP selection, both official book IDs and SHA-256 checksums,
the Phase3T source-binding digest, bilingual canonical chapter/topic registry, record count,
SHA-256 of canonical sorted original academic records, publication timestamps, independent
author/reviewer IDs, review completion and evidence ID. ALP additionally requires independent
board/year exclusion evidence in the signed payload; Full requires explicit null ALP policy.

## Fail-closed verification before Phase3S
1. Look up current school+tenant-scoped publication head through backend-only resolver.
2. Load exact publication version; require independent PUBLISHED_APPROVED row/status.
3. Verify complete identity, source books, approved revision, board ALP policy and validity window.
4. Recompute canonical publisher payload SHA and the Phase3T full bilingual binding digest.
5. Verify Ed25519 signature against backend-pinned issuer key, never a client-supplied public key.
6. Fetch original records separately, reject draft/mismatched academic review, duplicate IDs,
   unverifiable Urdu/English source PDF hashes, chapter/topic registration drift, missing answers,
   or MCQs with mismatched option IDs/correct answer. Recompute signed records digest.
7. Recheck the current publication head after records read; reject concurrent withdrawal/replace.
8. Emit ONLY Phase3S's `approvedProvider` object with `SERVER_INDEPENDENT_AUDIT` origin;
   there is no paper save/print authorization granted by the client-side payload or test labels.

## Executed regression
14 Phase3V focused tests passed with newly generated synthetic Ed25519 test keys.
Includes Phase3S dependency injection with a synthetic approved academic record and proof that
unpublished status never reaches repository creation; no actual Curriculum publication was seeded.
The real Ed25519 private signing key is NOT stored in repository, frontend or test fixture file.
Production construction is explicitly refused. Existing Phase3O–3U targeted suite was 71/71.

## Pending upstream and production gates
- Curriculum owner verifies IX Urdu Biology edition equivalence to intended English cohort and
  independently reviews complete official chapter/topic/exercise maps; establish canonical IDs.
- Publish a durable signed envelope with independent author/reviewer evidence and genuine
  official source bytes/checksums. No draft, synthetic or visual preview can substitute.
- Privately provision server key custody/revocation, durable current-head resolver and publication
  registry, with monotonic revision and atomic snapshot pinning at SQL write time.
- Carry approved Phase3V revision into the Phase3P/3Q preview and Phase3R `sourceIdentity`.
- Run Phase3S -> Phase3T actual node-postgres integration on independent staging (the current
  checkout had no `pg` package; Phase3U physical SQL was tested with native psql instead).
- Execute teacher ownership, two-school/tenant concurrency, source-revocation races, rollback,
  complete Question Bank coverage and bilingual print parity before ANY live route/deployment.
