# ASSPS Core secure AI worker adapter — prohibited DML and role-escalation fix (16 Oct 2026)

## Authority, ancestry and impact
Core-owned isolated implementation based on clean `audit/core-effective-grants-role-graph-20261016@984655411a78cca7251e2102dd1751258c6f208d`, which itself descends from latest verified `integration/core-paper-font-guard-20261016@13ac2be49e8d0aa6939c82f510aa4bbc65caf2a7`. Backend worker module only; existing Paper Editor, Lesson, grades, fees, admission, marks and frontend untouched. **Not a production patch. Not a signed release.**

Previously reviewed `aiQueueWorkerDatabase.js` validated the queue actor and tested only SELECT rights on organizations/campuses/audit. It did not explicitly deny **any of SELECT/INSERT/UPDATE/DELETE** on students and exam_results, write privileges on the three administrative tables, or SET ROLE and role creation/replication/database-creation escalation. This is a source-level fail-open privilege-drift risk, not evidence of current live compromise. Direct read-only PG16 test with the real restricted `assps_ai_worker_login` returned expected USAGE true, SET false and prohibited table rights false.

## Implemented changes
- The signed Green worker session verifies PostgreSQL's actual per-connection/current_user account before **each queue command**, rather than trusting environment variables.
- `has_table_privilege(current_user, 'public.<table>', 'SELECT,INSERT,UPDATE,DELETE')` rejects **any** relevant prohibited permission on student records, examination marks, organizations, campuses and administrative audit logs.
- `rolcreaterole`, `rolcreatedb`, `rolreplication` must be false and `pg_has_role(current_user, workerRole, 'SET')` must be false. The worker's expected queue SELECT, signed role USAGE and independent login must still be true.
- Every boolean check uses exact `=== true` or `=== false` semantics: missing/null/string fields are DENIED. No sensitive account details emitted in errors.
- Existing Blue/legacy code path unchanged. The hardening requires a future separate signed Green candidate release, *not* an urgent live workaround.

## Reproducible evidence
- Fail-before on the original source with twelve Node22 fixture cases: **5 passed, 7 failed**, demonstrating unauthorized student/result DML, SET-role and advanced role flags could pass and the SQL was missing protections.
- Pass-after fixed source: **17/17 Node22 hermetic tests PASS**. Mocked Pool verifies deny-before-query, client release, benign worker acceptance, exact SQL predicate presence, missing/null/malformed identity fields, BYPASSRLS, SET-role and sensitive DML.
- Existing local config negative **5/5 PASS** and existing import isolation **2/2 PASS** when supplying preexisting installed `pg` via `NODE_PATH` solely for local test; no dependencies copied to worktree. New hermetic test needs no packages/network.
- Before claiming real worker runtime success, use isolated PG16 role/socket acceptance and review all dynamic queue routes with applicable real data policies. Mock execution is **not** live authentication or tenant HTTP evidence.

## Important release-stage consequence
The old root-private five-overlay backend stage contains the previous worker adapter byte SHA. The new source **deliberately invalidates** its source↔stage parity. Never alter an old signed review manifest to conceal that drift. Make a *separate* private stage and independently verify source SHA, original rollback archive, signed transport, all privileges, real teacher+School2 denials, 13/13 security and off-host restore. Never promote this branch directly.

Current public backend metadata `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`, Core frontend root original `760b232b... ` and saved marks 1,763 (213 true zeros) remain protected. **No database DDL/DML, PM2/Nginx restart, service promotion, printer job, authenticated principal impersonation or student data edits**.

## Review checklist
1. Independent reviewer checks exact changed code and all sensitive-table privilege names against *current* live schema.
2. Re-run hermetic unit tests, real read-only peer-role SQL, stage/rollback parity and cross-tenant/subject-denial tests.
3. Adopt only verified missing diff onto the latest Core descendant and rebuild isolated backend/Next/Vite candidates.
4. Retain official Core fail-closed signed release status HOLD until all required independently signed evidence is present.
