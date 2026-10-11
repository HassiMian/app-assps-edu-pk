# ASSPS Core: 11 October 2026 agent BLOCKED handoff reconciliation

**Status: `ASSPS_AGENT_DB_HANDOFF_BLOCKED`; `RELEASE_CERTIFIED=FALSE` and `PRODUCTION_DEPLOYMENT=HOLD`.** This is a SaaS Core follow-up to the Windows-agent report, not a database/HTTP acceptance certification.

## What agent actually established
The agent worked at Windows `DESKTOP-MUH720M`, local Git SHA `0866106a5ec376404173a6441d22f71b1adbc120`, with source/route checks PASS. Windows could not reach the private PostgreSQL services on VPS loopback 5432/55432 and possessed no authorized SSH access. Network probes against Cloudflare edge are NOT a test of database availability on the VPS. It did NOT execute V2 SQL, provision the restricted login, start green, or perform rollback. Correct status was BLOCKED.

## Fresh VPS read-only independent reconciliation
Executed directly with available, permitted VPS inventory access: live `apexos` PostgreSQL port5432 still has 0 signed policies and 0 `core_security` schemas; isolated restored test `assps_backup_restore_check_20261011` port55432 has 212 public policies and 0 `core_security`; PM2 `apex-backend` and `apex-connect` online. Live frontend release-meta SHA `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`; backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`. Live signed runtime remains unprovisioned. No live mutation performed.

## Corrections to agent report — do not copy its operational commands verbatim
1. Agent claimed `DROP SCHEMA core_security CASCADE` in rollback. **Actual reviewed committed source uses `DROP SCHEMA core_security RESTRICT`;** `CASCADE` is not approved.
2. Agent proposed VPS path `/root/workspace/app-assps-edu-pk`. Actual isolated combined Core RC worktree verified here is `/root/workspace/assps-core-firstterm-production-rc-20261011`; independently establish the current worktree again before DBA execution.
3. Agent referred to green service port4000. The staged marks-only Nginx upstream is **loopback port5091**. Its use still requires a separately reviewed/approved green startup configuration.
4. Its sample hard-coded `ASSPS_CLONE_SCHOOL_ID=1` is an assumption, not certified actor/school identity. Derive permitted disposable fixtures from the isolated clone and verify explicitly.
5. It proposed passing HMAC and password values as psql `-v` command arguments and shell environment exports. This can expose sensitive information via process listings, history, debug logs or CI command capture. Use approved protected secret input and scrub test credentials. Do not disclose keys in reports or Git.
6. V2 SQL **has not been executed**. Static tests cannot establish runtime privilege safety or rollback; never treat agent's phrase 'Hardened V2 SQL Architecture PASS' as a database security gate PASS.

## Core additional hardening on the integrated RC
The additive migration preflight now rejects **both** pre-existing signed restrictive and permissive policies, and rejects an already existing dedicated runtime role rather than inheriting unreviewed global grants. Postflight checks exactly 77 `RLS ENABLED + FORCE` protected tables, 77+77 scoped policies, `NOINHERIT/NOLOGIN/NOBYPASSRLS`, zero unexpected parent role memberships, **zero** CRUD privileges on unprotected public tables, and no direct SELECT on two protected Paper tables. The test suite now checks these fail-closed invariants (5/5 static tests PASS). The one-command unified release preflight recognizes 5+ passing source tests but correctly exits 2 because live signed security and genuine school role acceptance are absent.

## Authorized operator handoff: exact safe scope
- Use an explicitly authorized **Hostinger VPS local shell or SSH session**; verify OS identity, correct host and actual Git RC, filesystem headroom, clone port/database and production live baseline. The Windows agent alone cannot execute the mission.
- Independent qualified DBA must review current committed V2 migration and rollback source again after new hardening. Supply test-only HMAC/SCRAM credentials through protected secrets controls, not displayed command arguments; never reuse school passwords.
- First run and reverse V2 **only on explicitly approved disposable clone** on port55432, using actual PostgreSQL grants and observed return codes. Validate role security, HMAC positive/negative tests, forced RLS, 10 unprotected tables, two Paper exceptions, pool/JWT/bootstrap, and complete rollback to exact catalog baseline. Never swap original production login or modify live roles while this stage is incomplete.
- If operations are blocked by host safety authorization, obtain normal channel approval. **Do not evade safety checks via another tool or disguised command.** Report exactly which privileged step remains blocked and who has authority to approve it.
- After proven sandbox tests, Core/DBA can plan separately approved additive live security provisioning, fresh backup/rollback, genuine school principal/teacher positive/negative browser tests and scoped Marks-only deployment. Preserve Paper Studio/Connect/Academic worktrees and live user records.

**Outcome:** An independently checked, strengthened but still **untested-on-DB V2 migration** and accurate operator directions. No human signoff or production certification has been fabricated.
