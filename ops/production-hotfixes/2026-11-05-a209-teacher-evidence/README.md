# ASSPS A209 — Verified Teaching Evidence Parity (source review, no production changes)

## Why the current release cannot be certified

Actual School1 read-only evidence shows 329 active students in 13 class-section cohorts. Seven cohorts have 54 teaching subject candidates with (a) active teacher assignment, (b) active linked teacher + employee and (c) reviewed timetable bearing exact teacher/class/section/subject. Six lower-year cohorts with **220 students** have **zero active teacher assignments and zero reviewed timetable rows**: Starter Blue 56, Mover Purple 42, Flyer Pink 25, One Yellow 38, Two Orange 31, Three Red 28.

**Academic Setup contains 36 configuration-only subject mappings across these six cohorts (5/5/5/7/7/7).** These are usable as a review checklist, not as verified teachers, signed approvals or runnable assessment catalogs. Never synthesize teacher identities, subject evidence, academic signatures or saved student marks.

## Fix proposed in this review

The existing `/api/academic-approvals/assessment-catalog/cohort-coverage` endpoint previously treated any active teacher assignment as coverage, despite the signed assessment catalog staging pathway requiring a genuinely active teacher user, employee and reviewed timetable. This A209 source review aligns its school-scoped read-only SQL with the stronger predicates. It adds `verifiedTeachingPolicy`, `active_assignment_records`, `reviewed_timetable_rows`, `coveredCohorts` and `uncoveredCohorts`. The UI **fails closed** if a stale backend sends no strict verification marker, and surfaces each missing class's source counts. No stage/approve action exists here. The A208 incomplete-catalog 409 gate remains unchanged.

Evidence: `A209_STRICT_COHORT_COVERAGE.review.patch` is an incremental patch on top of A208's source candidate. Live backend is not modified; authentic Principal browser testing remains pending. `tests/a209-strict-coverage.test.cjs` mocks the source runtime and proves school scoping, teacher/employee/timetable predicates, 220-student coverage reporting and zero writes. Related tests: A208 cohort mock 16/16, A208/209 browser 3/3, Marks Entry 22/22; these are isolated tests, not a real authorization receipt.

## Verification dossier

The private aggregate-only CSV `/root/workspace/assps-mission-20261105-a209-private/A209_SCHOOL1_ACADEMIC_SUBJECT_EVIDENCE_DOSSIER.csv` lists 36 *existing* Academic Setup subject mappings for authorized school review without student/teacher names. Original School1 records are never edited.

## Release blockers

Authentic early-years teacher/employee/timetable evidence, all 13 cohorts in each relevant assessment or formally authorized scope, real Principal signatures, Assessment 1–4 approved offerings, Assessment 5 official creation, positive auth/staging acceptance, source provenance, 73 RLS ownership risk, off-host PostgreSQL data+role+ACL restore and disk safety headroom remain incomplete.

**RELEASE: HOLD. All changes review-only.**
