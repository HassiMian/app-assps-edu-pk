# ASSPS Architecture V1 — Forward-only production release certification decision

**UTC audit: 2026-10-08. Decision: HOLD — do not enable or deploy the restricted database feature yet.**

## Baseline, scope, and provenance

- Verified live **frontend and backend** release metadata both identify commit `25536200ff1d891fedf1adb0c7155e943d3372e1`, from `release/paper-results-v1-prod-final-20261008` at the certification checkpoint. Both may evolve independently in the future, so confirm each exact SHA again before a release.
- Security integration is forward-ported to isolated branch `feat/archv1-forward-privileged-path-seal-20261008`, descended from this exact live commit. No stale historical Paper Generator or Assessment Studio branch was deployed.
- Architecture V1 is preserved: manual creation/editing remains independently functional; canonical `PaperDocument` and unified teacher Paper Workspace remain authoritative; Question Bank governance, curriculum/ScoringPlan, independent academic release and immutable results, A4 RTL/LTR print, and tenant isolation remain release invariants.
- Requested red-team reference `/opt/assps-editor-worker/early-years/docs/ASSPS_PAPER_ASSESSMENT_ARCHITECTURE_RED_TEAM_20261004.md` was **not present** at the stated VPS path; do not claim review of that missing original.

## Implemented in forward candidate (not production)

1. Feature-gated separate PostgreSQL Paper connection pool (`PAPER_RESTRICTED_DB_ENABLED=true`) with explicit unique login, password, optional separate host/port, and transaction-local `SET ROLE apex_paper_runtime`. This code requires **NOINHERIT, NOSUPERUSER, NOBYPASSRLS**, ability to SET only `apex_paper_runtime`, no privileged app-role membership, and no direct Paper Vault or Question Bank SELECT privileges. The separate login does **not** silently fall back to the SaaS `apexos_user` login.
2. HMAC-protected, transaction-bound tenant + actor scope. Signing includes server-verified school, session DB login, actor ID, actor role, short expiry, nonce and PostgreSQL transaction ID; PostgreSQL `SECURITY DEFINER` verifier owns the protected signing secret. Altering `app.tenant_id`, actor role, signature or replaying it across transactions fails closed.
3. Authenticated restricted database routing for canonical Paper Studio, Assessment Studio, Question Bank, legacy `/api/paper/vault`, and release-bound Assessment Results. The result-entry role is isolated to a scoped teacher/results workflow. Academic release remains a principal/admin authority; teachers cannot approve or publish through the release route.
4. Read-only restricted Paper/Question/Curriculum access for the mixed-use Global Search and cognitive Lesson Planning routes. Unrelated students, fees, timetable and attendance queries retain their separate normal SaaS connection. A fail-closed SQL guard catches unsigned legacy protected-table queries, **as defense in depth, not as a replacement for DB RLS**.
5. 26 tenant-scoped Paper/Assessment/Results/Question/Curriculum/assignment tables with `ENABLE/FORCE RLS`; separate signed school, actor-ownership, governed Question Bank mutations and release-authority policies. SQL table inventory and JavaScript privileged-path guard are parity-checked.
6. Verified-allowlist WhatsApp/JARVIS Paper Vault **read-only** calls can use signed service context. Legacy WhatsApp direct paper creation/import and unreviewed Question Bank inserts deliberately reject under secure mode, avoiding an academic-governance bypass. This is a documented functional restriction pending a canonical approved replacement.
7. Clone-only SQL rehearsal to expand `users_role_check` to support `result_entry`; the existing production constraint does not include this role, so a controlled production migration remains required.

## Actual executed evidence

| Gate | Evidence | Result |
| --- | --- | --- |
| Forward-only source base | Verified against backend production SHA `25536200...` | PASS for candidate ancestry at branch creation; recheck before deploy |
| PostgreSQL production clone restore | Independent `pg_dump -Fc apexos` / `pg_restore --exit-on-error`; 87 base public tables | PASS |
| Signed clone schema | 26 FORCE-RLS tables, 52 allow/guard, 27 Question Bank governance, 8 actor-ownership, 3 release-authority policies; 92 total including clone bootstrap | PASS |
| SQL/app protected table inventory | 26 signed SQL tables = 26 protected app-query table entries | PASS |
| Signed tenant/actor replay and role tests (peer-based staging) | 8/8 actual PostgreSQL tests | PASS for earlier disposable dual-role peer configuration |
| Production-equivalent **independent** restricted LOGIN | Strict NOINHERIT/no other DB roles/no direct grants code implemented, but separate password login provisioning was blocked by remote execution safety checks | **NOT VERIFIED — BLOCKER** |
| Strict login configuration and unscoped query guard | Separate config tests 3/3, inventory/signature parity 2/2 | PASS (does not replace independent login test) |
| Authenticated Paper Studio and Assessment HTTP | Assigned teacher create/edit, peer/cross-school deny, stale revision 409, principal review, unauthorized publisher/academic release deny, governed capture | PASS on isolated clone |
| Results HTTP | Result clerk create 201, read 200, foreign school 404, stale result revision 409 | PASS on isolated clone with rehearsed `result_entry` schema |
| Global Search and Lesson Planning | Principal/teachers in two distinct schools, scoped Question Bank and Curriculum signals; forged/unscoped SQL refused | PASS on isolated clone |
| WhatsApp/JARVIS Paper tools | Verified OWNER read; role spoof rejected; direct ungoverned writes refused | PASS for restrictive behavior; replacement write workflow pending |
| Backend targeted unit suites | 18/18 plus 43/43 current canonical DOCX model parity | PASS |
| Current frontend isolated deterministic build | `npm run build`, exit 0 | PASS |
| Real Chromium A4 PDF | English and Urdu A4 dimensions and PDF bytes verified on current frontend source | PASS, 2 documents |
| Real Chromium DOCX downloads | English and Urdu RTL OOXML downloaded and inspected | PASS, 2 browser cases |
| Real Chromium durable personalized print UI | Finalize, create job, duplex-safe queue/printing status | PASS, 1 case with mocked HTTP responses |
| **Physical printer** output/spool | No verified connected printer on this VPS/workstation | **NOT VERIFIED** |
| Running production backend | PM2 explicit PORT=5000; local/public `/health` HTTP 200; `release-smoke.sh` PASS | PASS for currently deployed baseline, not candidate |
| Full fees/attendance/auth + every non-Paper module after **candidate** release | Not run with a dedicated independent login, and no candidate deployed | **NOT VERIFIED** |
| Production rollback snapshot, no-reverse deploy, post-deploy Chromium/DB smoke | Not performed because deploy gate remains HOLD | **NOT VERIFIED** |

## Critical interpretation / mandatory remaining gates

- Production `apexos_user` remains **BYPASSRLS**. A properly isolated Paper runtime needs its own credential, no other database role membership, strict RLS grants and no privileged SQL fallback. It is **not** sufficient to merely `SET ROLE` from the BYPASSRLS login.
- The earlier peer-mode HTTP proof had a temporary `asspsworker` account with membership in both `apex_app_runtime` and `apex_paper_runtime`. This is **not** a production-equivalent dedicated login. The latest source deliberately rejects such dual-role identities. Remote safety checks blocked provisioning of a distinct SCRAM test login, so do not misrepresent prior peer-mode tests as certification of the stricter source.
- The direct JARVIS paper ingestion path remains disabled under secure mode until it creates canonical PaperDocuments and routes individual candidate questions through academic governance. No loss of other JARVIS tasks is intended, but full functional regression is not yet certified.
- Run and validate migrations/permissions on a fresh **owner-preserving** clone with an independent password-authenticated NOINHERIT/NOBYPASSRLS login. Add printer spool/device proof, complete role/tenant/results/JARVIS regressions, and run attendance/fees/login/full SaaS smoke.
- Immediately before any deployment, compare exact *new* production/frontend/backend SHAs and ancestry; create verified frontend, backend, DB and configuration rollback snapshots; verify deterministic bundles, isolated migration and alternate-port server; keep production PM2 backend PORT=5000; on success run post-deploy HTTP, genuine browser, A4, DB integrity and printer checks, rolling back immediately on a failed gate.
- Do not promote these clone-only test SQL scripts directly as production migrations. Production role constraints, schema changes, credential provisioning, secret rotation and least-privilege grants require appropriately reviewed versioned migrations and deployment controls.

## Cleanup evidence

The disposable database `assps_archv1_rls_seal_20261008` was dropped after testing; its signing fixture removed; the staging listener at 5035 was stopped; temporary global role memberships to `asspsworker` were revoked (membership count zero). Live production database `apexos`, production assets and PM2 backend were left unchanged. Existing official school papers and Question Bank records were not modified by the candidate deployment (none occurred).

**Release decision remains: HOLD.** The forward branch is a verified and preserved **security candidate**, not a certified production release. Do not set `PAPER_RESTRICTED_DB_ENABLED=true` in production or revoke `apexos_user BYPASSRLS` without the missing proof and reversible rollout.
