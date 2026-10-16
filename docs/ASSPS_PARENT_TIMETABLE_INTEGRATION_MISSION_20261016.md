# ASSPS Parent Timetable Integration — 2026-10-16
Status: ISOLATED IMPLEMENTATION / PRODUCTION HOLD (not deployed).

## Authoritative input
Principal-approved bell schedule: Mon–Thu & Sat 08:30–13:30; Friday 08:30–12:30 with NO break.
Staff timetable source: 58 records in public.timetable (56 class periods plus assembly/break), session 2026–27.
Imported timestamps are outdated; DO NOT use them for parent or teacher bell times.
All existing marks/results and teacher permissions remain unchanged.

## Audit baseline
- School ID 1; eight periods each for Four Blue, Five Blue, Six Blue, Seven Blue, Pre-Nine, Nine Fatima, Nine Usman.
- 13 of 56 teacher_id fields null. Two Miss Aqsa records can be unambiguously matched to the same timetable account; other mappings require identity authorization.
- teacher_class_assignments had 0 records. Do not fabricate teacher permissions.
- Starter, Mover, Flyer, One, Two, Three, and Eight have active roster records but no imported individual eight-period subject schedules.
- Pre-Nine must not automatically be equated with Eight.
- 313 of 318 students had parent IDs; unrelated parent-link gaps remain.
- Abida Yaseen and Adeeba Khan are DIFFERENT staff accounts. No fake staff login is permitted.

## Class incharge rules
Starter Blue + Flyer Pink: Miss Mubeen; exclude Miss Faiza from Flyer.
Mover Purple: Miss Laiba and Miss Abida as fixed teachers; primary incharge unassigned without first-period proof.
One Yellow: Miss Amina. Two Orange: Miss Aasia. Three Red: Miss Alisha.
Four onwards: first-period teacher within exact class and section; Eight unresolved.

## Mission phase verification
1. Read-only audit and recovery: DONE. Private JSON recovery snapshot at /root/assps-release-backups/timetable-parent-mission-20261016/prechange-snapshot.json ; SHA256 eb05e775bbd1b8018d2642a2a512da22a95b2a1b116be8577d29d0f8fa51e672.
   15-Oct full pg_dump archive readable; new full dump blocked by core_security/FORCE RLS. Do not bypass permissions.
2. Academic policy: CODE COMPLETE, ASSPS-only scope, source SHA allowlist, versioned approved times, incharges.
3. Authenticated API: CODE COMPLETE, linked parent children only, tenant and role isolation, Friday and regular teacher byDay mapping.
4. Frontends: CODE COMPLETE / PARTIAL QA; parent dashboard, parent reports, admin reference. Syntax and targeted lint passed; full typecheck timed out.
5. Release: HOLD — zero deployment or production mutations from this mission.

## Tests
11 expected: 4 timetable policy unit tests and 7 isolated mocked HTTP tests.
HTTP tests include unauthorized teacher denial, different parent no children, invalid weekday and cross-tenant failure.
NOT proof of real authenticated parent E2E in production.

## Release gates still open
- Full permissioned backup + isolated restore rehearsal and rollback.
- Verified junior staff identity, teacher_class_assignments, Class Eight vs Pre-Nine, primary Mover incharge and missing junior subjects.
- Verify real parent/teacher login and cross-parent/peer-school denial.
- Match current canonical Core+Connect deployed builds, full build/test regression, UI/print acceptance.
- Safe blue-green release with observed Save->Reopen->Parent View, Friday no-break and marks zero-vs-blank invariants.
- Unrelated results publication holds must not be bypassed.
