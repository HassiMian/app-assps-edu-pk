# ASSPS Phase 5 — Academic Review Workspace and Biology 9 editorial activation

Release candidate date: 2026-10-08 UTC.

## Canonical ownership

The teacher-facing Paper Workspace and PaperDocument/ScoringPlan pipeline remain
canonical for paper creation. This Phase 5 review workspace lives inside the
existing Question Bank route and its current versioned backend. No parallel
Paper Editor or duplicate storage model is introduced.

## Inherited production boundary

Phase 5 is developed **only** as a forward delta after the production-certified
Grade 9–10 independent review gate (`1c92a5ca04cadfe59aa9f436c55d65e9478f2be6`).
It must be forward-ported onto the latest live backend+frontend production
release after confirming ancestry and concurrent agent changes; never deploy
this development worktree or revert newer Printer/Fees/Results work.

## Scoped workflow

1. Authorized principal/admin opens `/question-bank/academic-review` from the
   existing Question Bank. Teachers are blocked from the review route, and the
   backend independently enforces authentication, school context, user roles
   and tenant-bound row access.
2. Reviewer filters Grade 9 or Grade 10, subject and pagination. `created_at`
   plus immutable `id` makes seeded-page ordering deterministic despite
   simultaneous seed timestamps.
3. Exact provisional `json_seed` Question Bank item is linked to its immutable
   question master/revision via metadata-only intake, **without** duplicating
   the legacy question or granting approval.
4. The question is prepared for independent review; only an identified
   academic reviewer different from the original author/revision author may
   attest source image, exact textbook edition/SHA, chapter, curriculum,
   scientific answer/key, language and originality.
5. Reviewer may instead return the current immutable revision for correction,
   recording an audited explanation and retiring that revision's old review
   mapping. The original question author may then correct stem, individual
   options, answer/key and marks. Both the original Question Bank row and a
   new immutable version commit in **one tenant transaction**.
6. Revision-bound academic approval is recorded without publication. A
   **different** authenticated school releaser must promote the exact current
   question to ready; backend rechecks source SHA, answer and option parity,
   current content hash, reviewer identity and school scope.
7. A successful review cannot silently publish a changed question, and
   unapproved questions are excluded from teacher-accessible approved bank
   selection.

## Biology 9 Chapter 1 editorial pilot

`ASSPS_BIO9_CH1_ORIGINAL_PRACTICE_DRAFT_20261008.json` preserves 27 original
practice drafts (12 MCQ, 12 short, 3 long). The companion
`ASSPS_BIO9_CH1_ACADEMIC_REVIEW_DOCKET_20261008.json` identifies each draft
by immutable content checksum and binds its *curriculum context* to the
verified 2025–26 Biology 9 English PDF source record `pectaa-catalog-009`.

**All 27 remain explicitly unreviewed, unapproved and ineligible for automatic
production import.** A hash-confirmed source identity and chapter location are
not independent answer-key validation or permission to reproduce a textbook.
The reviewer must inspect authentic source pages under appropriate rights,
check academic correctness, and sign each latest question revision before
any governed publication. No fictional reviewer attestations are supplied.

## Tests and release boundary

- Pure client evidence, source filtering, unapproved correction and version
  checks: 9/9 PASS.
- Biology 9 pilot provenance and 27-item review docket: 3/3 PASS.
- Tenant-local provisional intake HTTP: PASS (no duplicates, no approval,
  no unassigned teacher access; stable paginated data).
- Rejected question -> original author atomic corrected revision -> fresh
  independent review and separate final-release lifecycle HTTP: PASS.
- Existing Question Bank and governance regression suite: 19 checks PASS;
  the remaining historical Grade 9/10 HTTP test passed separately on its
  explicitly allowed disposable DB name. No production test writes.
- Real Chromium admin/reviewer UI exercise on isolated Vite preview and
  clone PostgreSQL: login, subject filter, safe intake, status transition,
  independent review form, return-for-correction and atomic author
  revision-save, **without** automatic approval: PASS.
- Production Vite frontend build completed successfully after integrating the
  route; screenshot proofs held in isolated test artifacts.

Production release requires current HEAD/remote verification, fresh rollback
snapshots, unchanged official First Term templates, Chromium printing, full
School SaaS regression, tenant/RLS review, staged alternate-port smoke and
postdeploy protected-route/error monitoring. A physical printer is **not**
certified by Chromium/PDF rendering alone.
