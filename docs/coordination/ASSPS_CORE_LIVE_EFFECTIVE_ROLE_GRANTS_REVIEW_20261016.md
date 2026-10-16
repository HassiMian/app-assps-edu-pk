# ASSPS Core — fresh PostgreSQL effective role grant graph audit (16 Oct 2026)

## Authority and scope
Exact clean base source: `integration/core-paper-font-guard-20261016@13ac2be49e8d0aa6939c82f510aa4bbc65caf2a7`. Core-owned isolated audit changes only; NOT a new production release candidate, NOT signed independent RLS/School2 user acceptance, NOT a database migration.

Previously published coordination issue #4 documents an official 6/13 signed security HOLD. This tool MUST NEVER be consumed as an override for any failed official gate. It provides unsigned catalog corroboration for the effective-role-grants portion and detects future privilege escalations without manufacturing signed external receipts.

## Independent actual execution
Run from this branch, on authorized VPS, using read-only catalog queries:

```bash
python3 ops/release/core-infrastructure/verify_live_role_membership_grants_20261016.py
python3 -m unittest discover -s ops/release/core-infrastructure -p 'test_verify_live_role_membership_grants_20261016.py' -v
```

At verification:
- Real PostgreSQL `apexos`, local Unix socket, port 5432. The query uses `runuser -u postgres` solely for catalog visibility and `PGOPTIONS=default_transaction_read_only=on`; static SQL never retrieves student records, password hashes or tokens.
- 6 existing roles checked for `rolsuper`, `rolbypassrls`, `rolcreaterole`, `rolcreatedb`, `rolreplication` and intended login status.
- 3 exact direct membership edges and their inherit/set/admin flags checked; worker `assps_ai_worker_login → assps_core_ai_worker` cannot SET ROLE, whereas signed core/marks logins each have only their intended runtime edge with NOINHERIT.
- 48 actor/table `has_table_privilege` combinations checked for exact DML privilege signatures over protected results/students, restricted administrative tables and queue tables; students and exam_results must both have `FORCE ROW LEVEL SECURITY`.
- Live status: `ROLE_GRAPH_PASS_UNSIGNED_NOT_RELEASE`, exit 0, `productionChanged:false`, `releaseAuthorized:false`.
- 15/15 real hermetic Python regression tests PASS, including unexpected role edge, privileged role, login data permissions, worker student data read, FORCE RLS loss, missing grant and malformed evidence.
- New pull-request/push CI job runs *only hermetic fixture tests*, not the VPS command. No CI success claimed without an actual remote workflow result.

## Limitations
- This is a role-catalog/effective-permission audit only. RLS policy predicates are separately validated by the signed-catalog drift probe; catalog membership equality is **not** signed HTTP user/tenant acceptance.
- Real independent School2 + unassigned-subject denial, signed effective grants and rollback/recovery, signed restricted transport, reviewed live backend adapter, persistent authenticated worker, current officially adopted backup are still release blocking.
- If any scoped role/table is added, update and review the exact policy. Fail closed on unrecognized or removed grants instead of silently expanding scope.
- Never run this query under a production app request; audited admin catalog visibility does not confer application access.

## Production safety
No SQL DDL/DML, service restart, Nginx reload, deployment, student marks edit or physical print. Other agents' worktrees, historical backups and existing accepted live assets preserved.
