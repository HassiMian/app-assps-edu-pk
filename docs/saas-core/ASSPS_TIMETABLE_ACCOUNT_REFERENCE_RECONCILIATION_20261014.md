# ASSPS Timetable 2026–27 — account reference reconciliation candidate

Scope: School 1 reference timetable only. This does not approve, grant, or publish teacher marks permissions. SaaS Core exclusively owns final production release.

## Actual live source facts observed

- Two source hashes: 14 October uploaded photo `263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589` (42 rows: 40 class lessons, 2 assembly/break) and Class IX document `e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724` (16 rows, Nine/Usman and Nine/Fatima).
- Source photo's printed footer says academic year **2024–25**. Current user instruction adopts schedule for operational **2026–27**. Both are separately preserved; never falsify the original photograph or pretend it stated 2026–27.
- School1 active enrollment has sole Blue section for each of Four/Five/Six/Seven: 32 teaching timetable rows can be linked to these **current** section facts; no source photo section value existed.
- Nine already has actual Usman and Fatima sections (16 rows). **Pre-Nine has zero enrolled students and no attested section**: preserve all eight unassigned-section rows; do not confuse it with Class Nine or assign Blue.
- Existing 56 `employee_teaching_subject_evidence` records are separate from grant/approval. **43** active-user uniquely matched candidate references; **6** provisional Miss Nazra (active name with inactive homonym) and **7** missing identity (5 Miss Maryam + 2 Miss Ausa) are excluded. Names are never guessed: Miss Ausa is not automatically Miss Aqsa.
- At QA capture Exam9 had **1,762 real records and 213 genuine zero scores**. Official teacher assignments and verified staff review remained zero. These counts may increase with genuine school operation.

## Safe two-stage owner handoff

`ops/release/timetable/005_reviewed_reference_identity_link_20261014.sql` is owner-review candidate only. It binds **43** uniquely active Core user IDs to timetable reference rows (not official marks grants), resolves **32** reference sections to Blue with an explicit provenance note, leaves all `staff_identity_reviewed=false`, leaves `teacher_class_assignments` unchanged, and fails closed on source revision, enrollment conflicts, identity revocations and invalid role/tenant. Existing grades, student records, paper maximum approvals and Exam9 scores are untouched.

**Do not deploy under APEX Connect authority.** SaaS Core must review signoff, full source ancestry, concurrency conflicts, final backup and canary rollback before any production migration. Subsequent official staff/class/section/subject assignment still requires exact authorized Principal/Admin signed approval and full security acceptance.

## Independently executed QA on disposable PostgreSQL 55432

- Live consistent `pg_dump` restored as `apex_timetable_link_qa_20261014` (isolated, private).
- Candidate migration exited 0 with `UPDATE timetable section=32`, `UPDATE evidence section=32`, `UPDATE timetable teacher_id=43`, zero teacher grants or staff-review changes.
- Negative gate: QA-only active `Isma Mustafa` teacher login disabled; rerun rejected six revoked user links and aborted transaction (expected failure). Identity reinstated in QA; idempotent rerun returned three zero updates and PASS.
- `006_qa_only_revert_reference_links_20261014.sql`: 43 teacher references, 32 section/evidence updates reversed transactionally, leaving real marks unchanged.
- Independent restored baseline fingerprint parity: timetable 58 `e57cc4faf380ec8a00f5158c23ce39e8`, staff evidence 56 `971565a807b23221367a2aaf9966e25f`, Exam9 marks 1762 `375b31080167b0e4e989867c1b76e6c6`; all equal after QA-only reversal.
- Python static guard test 4/4 passed, SQL idempotence and negative security gates executed.
- NO production SQL DML, teacher grant, role/password update, result overwrite, security weakening, Nginx switch or release was performed by this candidate.

Publication blocker: source patch is VPS-local until genuine Core repo write authorization succeeds. GH issue #4 is the central coordination record.

## Safe operator-run live acceptance (added after forward-port to current Core)

`ops/release/timetable/007_readonly_reconciliation_gate_20261014.sql` has
`BEGIN TRANSACTION READ ONLY` and returns a truthful
`HOLD_REFERENCE_METADATA_RECONCILIATION` before metadata promotion, or
`PASS_REFERENCE_ONLY_NOT_TEACHER_AUTHORIZATION` if exactly the reviewed 43
reference identities/32 unique enrolled Blue sections are present with no
official teacher grants. It never issues an academic release certificate.
It reports *dynamic* currently saved Exam9 scores and genuine numeric zeros,
rather than assuming the school's marks uploads are frozen.

First verify Core current HEAD, live source revisions and staff evidence,
obtain SaaS Core release authority and latest consistent backup, and review
the two SQL scripts on isolated copy. Only Core deployment owner may execute
005 on live DB. The reference-only gate 007 is useful both before and after,
but DOES NOT replace signed Principal/teacher sessions, approved paper maxima,
final role/school isolation, and Class Eight protected result-card workflow.
