# ASSPS Assessment Results: authoritative student identity — 2 November 2026

## Verified live backend fix
Previously Assessment Studio result-save accepted a client-supplied arbitrary
studentKey, studentSnapshot and caller-supplied resultId without a student-table
verification in the write transaction. A school-scoped assessment release was
insufficient to prove that the result belonged to a particular student.

The protected live backend now, before any assessment result insert/update:
- resolves studentKey to a real integer school student ID (numeric or student:ID),
  rejecting roll-number/name/ad-hoc keys;
- queries active students by school_id + student primary key within the SAME
  database transaction, after tenant RLS context is set;
- requires exact normalized class and section agreement with authoritative
  release metadata, including explicit subject and section metadata;
- rejects mismatching client-provided student identifiers/cohorts;
- stores only server-owned student snapshot fields;
- normalizes both accepted key forms to one canonical student ID before hashing
  the stable result ID and rejects a caller-controlled mismatched resultId;
- fails closed if release/student roster identity cannot be established.

Verified on deployment: Node 136/136 combined regression including 12 new tests,
PM2 restart, HTTPS health/login 200, unchanged academic/result checksum.
A root-only production pg_dump and original source rollback copy were created.

## Scope/limitations
This is a SOURCE REVIEW SNAPSHOT of verified live code. The old canonical source
repo lacks equivalent current Assessment Studio integration; do not copy files
straight into older server or merge to main without integration/rollout review.
There are currently zero production assessment result records and zero roster
snapshots. The two existing Assessment Studio release records lack authorized
cohort metadata; writes for those legacy synthetic releases are intentionally
refused by the guard. Frontend compatibility and genuine Teacher/Principal
account-level Save–Reopen–Edit–Print acceptance remain HOLD.

Historical First Term grades, results, November vouchers and academic approvals
were NOT altered. The 7/16 academic release gate remains HOLD.
