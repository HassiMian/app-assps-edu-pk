# A223 — pinned live-backend safety forward-port, explicitly review-only

**Production HOLD. No live modification, app restart, DB write, authorization bypass or cleanup.**

## Source custody and why a normal cherry-pick is unsafe

The current live backend is the running server at
/var/www/apex-backend/src/routes/attendanceRoutes.js.

Its SHA-256 during the A223 preflight was:

    13a15287442c3db5ed7494e1f448cff402232cdc8196a222b918f78945bb81fd

This file has 1,049 lines, compared with 809 lines in the older canonical GitHub branch at A222. The **live server already contains additional safeguards** absent from the earlier branch: teacherStudentScopeClause, authenticated teacher assignments, a restricted inactive-student skip, an authorized student map named persistableRecords, and transactional notifications after commit. Never replace that deployed file with the older A222 candidate; it would discard safeguards. An A213 source cherry-pick on the current main branch also produced conflicts, so no automatic import was approved.

## Narrowly scoped marker attribution issue

The live bulk POST attendance route currently records an authenticated teacher's user ID, but for non-teacher roles can prefer client-supplied marked_by over the authenticated user's ID. This creates a possible audit-attribution spoofing path. A legitimate Principal/administrator delegation workflow may require attribution to the *actor and delegate separately*; this must be explicitly designed and approved, not implicitly conflated.

The A223 Python source forward-port is SHA-bound to that exact observed live route and performs three changes **in an isolated private evidence file only**:

1. Add reference to the existing reviewed helper attendanceMarkerIdentity (pure function).
2. Stop destructuring client-supplied marked_by for bulk writes.
3. Derive markedByUserId only from the authenticated actor. Missing/invalid identity returns HTTP 403 after ROLLBACK.

It asserts that all teacher assignment, tenant scope, active/inactive student, transaction and unrelated mark-by-GR handlers remain unchanged. Changes are rendered as a small unified diff in the adjacent A223_LIVE_ATTENDANCE_MARKER_SURGICAL_REVIEW.patch file; source is pinned and refuses to apply if live bytes change.

## Reproduce engineering evidence (NEVER run on production routes)

    python3 ops/release/a223_live_attendance_forwardport.py \
      --out-prefix /root/workspace/assps-mission-20261107-a223-private/A223_PINNED_LIVE_FORWARDPORT

    python3 -m unittest discover -s ops/release/tests -p 'test_a223_live_attendance_forwardport.py' -q

    A223_REVIEW_ROUTE_PATH=/root/workspace/assps-mission-20261107-a223-private/A223_PINNED_LIVE_FORWARDPORT_ROUTE.js \
      node --test ops/release/tests/a223_live_route_mocked.test.cjs

The Node harness uses an in-memory fake Express Router, fake Postgres client, fake school/tenant data, fake WhatsApp and fake teacher assignment service. It evaluates the actual generated JavaScript route under a VM and tests handler control flow. **It is NOT an integration test against a real restored database, authenticated Principal session or actual external messaging provider.**

## Strict release gates

- Restore and independently validate the full database **off-host**, including full school data, roles/global password login, owner/ACL/RLS policy, tenant negatives and rollback. A same-VPS restore is not sufficient.
- Recover at least 16 GiB free root space before a large production build/restore/import. Existing disk reserve remains critically below guard.
- Reconcile live backend source SHA into an actual reviewed canonical release branch while preserving teacher/tenant/inactive-student safeguards and currently deployed Diary/Paper/Lesson Planning behavior. Do not replace existing live routes with GitHub main without ancestry review.
- Confirm intended roles and audit attribution policy for staff marking on behalf of another employee.
- Run full **isolated restored DB** route tests: authorized teacher/principal save and real negative tenant/scope/role writes, duplicate/inactive student rules, transaction rollback, and notification behavior.
- Fix **all four actually published** AttendanceModule Nine-to-Pre Nine fallback chunks, then run real browser and authenticated owner/teacher acceptance, verify actual import graph and preserved historical First Term checksum.
- Resolve 58 original Saved Paper ID provenance (9 newer IDs, 7 conflicts) and 220 students missing teacher-subject evidence. No approval can be inferred from source code.
- Core alone deploys under ASSPS GitHub Issue #4 after signed source provenance, reviewed rollback and all acceptance evidence; this audit source never deploys.

## Remaining runtime security risk

A222 observed runtime apexos_user database and public-schema CREATE privileges changed from previously false to true. It still owns 73 protected FORCE-RLS tables. Even with FORCE RLS, ownership/DDL is not correctly segregated; the change's grant actor is unknown, and there is no proven direct RLS data bypass. Any fix needs Core-owned reviewed role/DDL migration and compatibility tests, not an audit-agent production GRANT/REVOKE.

## Audit claims

The A223 source patch, VM tests and explicit SHA comparison are engineering controls; they do not verify an authorized staff user's positive live workflow or constitute permission to deploy. This branch and its generated private source are review-only. Do not publish or merge without Core signoff.
