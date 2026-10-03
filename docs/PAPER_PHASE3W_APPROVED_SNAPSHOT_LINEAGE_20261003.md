# Phase 3W — Lossless Approved-Snapshot Lineage (3 October 2026)

Parent: signed provider Phase3V final commit `454e3be`.
Branch: `feat/paper-approved-revision-lineage-phase3w-20261003`.
Scope: isolated academic-source reference propagation; no new production routes or paper writes.

## Exact gap closed
Before this phase, Phase3Q's selection fingerprint knew an optional projection revision,
but `composeCurriculumPhase3PPreview()` did not forward it into the original-record handoff.
Phase3R therefore used an absent `approvedSnapshotRevision` even when a version existed upstream.
Passing a bare revision number was also not an acceptable replacement for genuine signed identity.

## New read-only source binding
`editorV2/curriculumPublicationLineagePhase3W.js` exports
`attachReadOnlyPublicationLineagePhase3W({projection,snapshot})`.
Only an unchanged supervised Phase3P projection and Phase3V-shaped publication report are
accepted. The helper compares complete selected academicRecord values to corresponding
original published records; rejects duplicate, missing, draft or changed academic records;
and checks identity/cohort, Full/ALP selection, both verified book IDs and PDF checksums.
Carries `publicationId`, positive `snapshotRevision` and 64-char signed `recordsDigest`.
The resulting projection and lineage are marked `UNVERIFIED_CLIENT_ONLY`,
`serverPublicationApproved:false`, and `printApproved:false`: no browser-side approval is trusted.

## Phase3P → 3Q → 3R
Phase3P now rejects an orphan revision without publication identity, and forwards the entire
read-only lineage in its unsaved source-preserving handoff. Original bilingual academic records
remain intact. Phase3Q's source fingerprint includes the lineage and revision; stale topic
selection fails if upstream publication revision/ID/digest changes.
Phase3R validates the complete triplet, carries it in immutable `sourceIdentity`, and preserves
a separate unpinned local-only preview with all three fields null if no publication exists.
School/tenant authorization is NOT acquired by supplying client-side lineage metadata.

## Server-side re-verification
Phase3S requires a signed Phase3V provider result's current publication ID and records digest
to match the authored document, in addition to its existing independently checked revision,
tenant/school/cohort, book hashes, original source ledger, review and marks invariants.
Missing/forged ID/digest is rejected before the repository receives any CREATE request.
Existing Phase3S synthetic tests were updated to use complete handoff provenance.
Phase3V integration tests now verify forged publication IDs and digests are rejected.

## Negative tests / expected behavior
- Fresh verified source pin flows through Phase3Q selection, Phase3P preview and Phase3R draft.
- Same textbook/questions but a later approved publication revision invalidates old selection.
- Forged edition, selection, book checksum, selected answer/text, reviewer status, signature hint,
  publication ID, digest or orphan revision refuses local composition or server staging.
- Local-only unpinned preview stays editable but is never publication, print or save authorization.
- Existing V13 official paper objects, archived reference papers and Question Bank stay unmodified.

## Current release gate
Only synthetic signed publications were available for this implementation/test checkpoint.
The separate Curriculum worktree has not yet published the authoritative verified bilingual
school-scoped snapshot. A real server-controlled read-only projection endpoint and durable
current-head resolver are NOT wired into live frontend routes. Phase3S/3T production factories
and Phase3U disposable SQL activation remain disabled. DO NOT create artificial academic approval.
Before enablement: complete Issue #1, verify real official edition equivalence and reviewer
evidence; configure private signature key custody, school/tenant auth, atomic SQL snapshot pin;
run end-to-end provider -> authoring -> actual staging PG -> approved print parity and rollback.

## Verification
Six new Phase3W tests and the historical Phase3O–3V suites passed together:
**92/92 focused tests PASS, zero skipped or failed** using low-memory serial execution.
These results do not imply a completed production build, real approved Curriculum publication,
or actual Phase3S/3T PostgreSQL connector integration.
