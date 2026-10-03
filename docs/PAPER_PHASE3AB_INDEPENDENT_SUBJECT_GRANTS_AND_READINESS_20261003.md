# Phase 3AB — Independent Teacher Subject Grants & Fail-Closed Curriculum Release Preflight

Date: 3 October 2026. Parent: Phase3AA `22b6491feee79a0070c6c341b080f48abbb46293`.
Branch: `feat/paper-independent-subject-grant-phase3ab-20261003`.

## What was checked before implementation
Official school middleware `al-siddique-backend/src/middleware/auth.js` exposes authenticated
`id`, `role`, `school_id` and `tenant_id` from school/user context. Those fields alone do
**not** establish an independent class/subject/edition teaching assignment. In this
isolated checkout there was no independently reviewed, school-scoped roster + subject
assignment SQL connector usable for Phase3X; the real connector remains a release blocker.
Separate Curriculum worktree was inspected **read-only** at HEAD `21d8fd5`.
Its `officialSourceManifest.json` confirmed IX Biology English/Urdu PDF byte hashes;
the English edition is 2025-26, Urdu edition remains `VERIFY` (`03.09.26` catalog label),
both chapter/exercise indexes remain `PENDING`, and `liveSeedCount=0`.
Neither verified binary hash is an academic approval, chapter alignment or exam paper release.

## New Phase3AB subject-grant resolver
`al-siddique-backend/src/services/papers/independentSubjectGrantPhase3AB.js` provides
`createPhase3ABSubjectGrantResolver` in DORMANT/nonproduction-only backend staging.
Explicit independent injected read-only ports:
`readSchool`, `readStaff`, `readAssignment`, `readCurriculumBinding`, trusted `clock`.
The enabling gate requires independently reviewed roster/assignment/curriculum mapping
and explicitly prohibits implicit principal/admin authorization. The module has no
Express mount, generic database import, HTTP fetch, INSERT, migration or school-data write.

To issue exactly the shape required by existing Phase3X `resolveSubjectGrant`, the resolver
requires every constraint below from server-owned independently reviewed registries:
- active, nonsynthetic/demo school with exact tenant and separately enabled authoring staging;
- active `human` teacher/principal/admin, exact school/tenant/actor/role, eligible staff roster;
- explicit ACTIVE assignment for THAT staff member, class, grade, subject and syllabus,
  valid time interval and independent nonself approver with source evidence;
- reviewed curriculum binding for the same assignment, subject reference, class, edition
  and syllabus version. Full textbook must be independently approved by default;
- ALP additionally requires independent approval tied to the exact examYear;
- all four authorities are reread and compared before returning AUTHORIZED, to refuse
  revoked/changed assignment, edition or staff role midway through an asynchronous request.
The resolver does NOT accept browser-provided roles or invent class/subject mappings.
Phase3X still requires independently authenticated actor identity and Phase3V signed source;
Phase3Y/Phase3S repeat their own current-school/academic verification at save/reopen.
Rereads are a defense-in-depth measure, not a substitute for transactional school tables.

## Official-source release audit (informational; never grants permissions)
`curriculumReadinessPreflightPhase3AB.js` assesses one grade + subject EN/UR pair and
independent operational review evidence. Its status is BLOCKED or
EVIDENCE_COMPLETE_NOT_AUTHORIZED; all `authorizes*` values ALWAYS remain false.
Academic items required: verified original EN and UR PDF checksums, edition review, both
independently verified chapter/exercise indexes, genuine separately reviewed published
question records, independent bilingual edition-equivalence evidence, genuine pinned
Phase3V verified signature. Operations items: key custody, real roster adapter, isolated
RLS credentials, institutional backup/restore, staff/student privacy, multi-instance
authoring-intent safety, bilingual PDF/Word/print parity, canary rollback review.

## Results against the live, separate Curriculum worktree's current manifest
Read-only Node audit returned `BLOCKED` with **20 explicit blockers**:
- `NO_APPROVED_LIVE_ACADEMIC_RECORDS` (manifest liveSeedCount=0);
- English PDF's edition approval not complete, chapter and exercise indexes pending,
  academic question publication pending (binary bytes/hash ARE verified);
- Urdu PDF edition is VERIFY, its academic edition approval, chapter/exercise indexes
  and published questions are pending (binary bytes/hash ARE verified);
- independently signed bilingual edition equivalence and genuine Curriculum publication absent;
- eight independently reviewed staging operational signoffs have not been supplied.
The audit did not modify the Curriculum worktree, approve drafts, overwrite terminology,
seed Question Bank, change Full vs independently verified ALP, or activate any route.
Urdu science terms must follow the actual Urdu-medium textbook, keeping technical
English loanwords where the book does, rather than word-by-word forced translations.

## Test and production boundary
17 focused Phase3AB deterministic tests cover approved grant shape, exact Phase3X →
Phase3Y authoring preparation, principal/admin explicit assignment requirement, roster
provenance, wrong school/tenant/role, self-review/expiry, year-scoped ALP, edition drift,
TOCTOU revocation, SQL/registry-port failure, current-source preflight BLOCKED state and
advisory status never granting print, storage, publication or deployment.
Independent school read ports remain UNIMPLEMENTED against a real institutional schema.
DO NOT call these fake test registrations real staff/teacher assignment records.
Production constructor/runtime remain disabled. Historical V13/Canonical V2 papers,
official question bank, separate Curriculum development branch and live DB are untouched.

## Explicit next-release blockers
1. Curriculum owner must finish IX Urdu edition/equivalence, chapter/exercise sources,
   independent per-question academic approval and durable separately signed publication.
2. Identify actual authoritative school/teacher/class/subject assignment tables;
   independently review, implement and verify read-only server ports and rollback.
3. Replace Phase3Y's process-local one-use intent store with an independently controlled
   multi-instance atomic staging design; do not enable routes before it is reviewed.
4. Institutional backup and key custody review, privacy response filtering and
   Urdu/English visual print/PDF/Word parity, before any production deployment.

### Final test acceptance (3 October 2026)
`node --test --test-concurrency=1` over Phase3O–Phase3Y plus Phase3AB: **135/135 PASS**,
0 failures/skips, exit code 0. New Phase3AB focused regression: **17/17 PASS**.
Phase3AA's 10 actual physical PostgreSQL race tests remain independently verified in its
previously pushed commit; they were not rerun during this low-memory Phase3AB phase.
The current independent Curriculum manifest was read without write access and returned
exactly 20 BLOCKED audit reasons. This document/report is NOT a grant or deployment approval.
