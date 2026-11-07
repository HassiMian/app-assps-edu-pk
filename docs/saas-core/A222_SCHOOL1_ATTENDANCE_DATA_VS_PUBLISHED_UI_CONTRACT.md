# A222 — School1 attendance data integrity vs published UI boundary

**Release HOLD. Review-only source contract; no production deployment or DB write.**

## Actual observed data

School1 currently has distinct active rosters: Nine Fatima (6), Nine Usman (9), Pre Nine Blue (12). Attendance records for each day November 3–6 2026 contain 6, 9 and 12 matching records, respectively. The read-only audit found zero duplicate student-date entries and zero foreign-school student links in the inspected School1 records.

The live published index has four application entry branches. Four MarkAttendance import-map replacements preserve Pre Nine identity. However, four directly imported AttendanceModule production chunks still carry unsafe Nine-to-Pre Nine section fallback without replacement. A clean database does not prove a safe live UI.

## Engineering gate

The A222 read-only SQL transaction collects only aggregate class-section counts, daily distinct attendance totals, duplicate date/student counts, orphan/cross-school join counts, status counts and active School1 total. No student names, student IDs, parent phone numbers, CNICs, addresses, passwords or raw attendance records are emitted. The gate checks direct published module evidence and never infers an authenticated Principal signoff from aggregate rows.

Execute using a fresh published graph evidence report:

    python3 ops/release/a222_attendance_data_integrity_gate.py --published-graph-json /root/workspace/assps-mission-20261107-a222-private/A222_FRESH_PUBLISHED_GRAPH.json --out /root/workspace/assps-mission-20261107-a222-private/A222_DB_VS_PUBLISHED_ATTENDANCE_CURRENT.json

    python3 -m unittest discover -s ops/release/tests -p 'test_a222_attendance_data_integrity_gate.py' -q

Exit status 3 means justified HOLD. Exit 2 means invalid evidence. This gate deliberately cannot promote any production release.

## Actual production closure — only SaaS Core after Issue #4 handoff

1. Reconcile the exact latest published application with coordinated A213 source candidate. Do not overwrite parallel agent work, Diary, Paper Studio or protected Lesson Planner.
2. Build one canonical candidate with all four unsafe attendance fallback imports eliminated; preserve the four safe MarkAttendance section identities and verify the actual HTML reachable code graph.
3. Run authenticated Principal and teacher acceptance for distinct Nine Fatima, Nine Usman and Pre Nine Blue identities, with negative cross-section and cross-school read/write probes. Synthetic browser harness results cannot substitute for those tests.
4. Require independent off-host PostgreSQL full data + global roles/password login + RLS policy + ownership/ACL restoration and sufficient real disk reserve, at least 16 GiB before an authorized release.
5. Require signed release provenance and independently verified rollback; only SaaS Core can promote to production.
6. Verify actual live indexed chunks and browser behavior after promotion and recheck First Term's protected historical checksum and attendance row integrity.

School class sizes may change. This contract measures active rosters dynamically instead of treating today's class counts as permanent. Absent dates are not interpreted as student absence. Any new legitimate attendance status requires a reviewed contract extension rather than an unsafe silent default.

No review branch, unit tests, local same-VPS restore or aggregate data observation authorizes production writes or deployment.
