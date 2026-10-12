# ASSPS SaaS Core — Actual Fresh Backup Restore and Role/ACL Recovery Readiness

**12 October 2026 · Core / Production Master · GitHub issue #4**

**Certification result:** `DATABASE_DATA_AND_RLS_RESTORE=PASS`; `RESTORED_APP_ROLE_ACL=HOLD`; `REQUIRED_CLUSTER_GLOBAL_ROLES=HOLD`; `FULL_BACKEND_ROLLBACK_CERTIFIED=FALSE`; `PRODUCTION_CHANGE=NONE`.

## Current release provenance and protection

- Canonical Core remote `release/firstterm-core-security-unified-20261011`: `00da1e296c3116086a1d1e98c272eb0534e4ee8e`.
- Current isolated Core source branch: `fix/core-rls-clone-candidate-and-ops-20261012`, continuing after reviewed source `c17d4eadff5eae70afee58eb2a4742e28bbcea2f`. This new milestone changes Core-owned ops/QA/docs only; Paper Studio, Grade IX–X and Connect development kept separate.
- Live frontend `8b5d370e0a91e86f5c7c136bbf49521ab1e15147`; legacy backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`; signed green Marks backend `1b0541af75526b2840e7403bc8193cd1c540a811`. Production /marks, Connect /health, green /health all HTTP200 at verified baseline.
- Production `apexos_user` remains `BYPASSRLS`, live `pg_policies` count 368, historical `exam_results` count 2. No production migrations, service reloads, RLS changes, student marks or fee writes performed.

## Gate 1 — Actual isolated physical restore completed (not merely dump inspection)

1. Protected fresh consistent PostgreSQL `pg_dump -Fc` at `/root/assps-release-backups/core-certification-20261012T171242Z/apexos.dump`, mode0600, SHA256 manifest verified. Dump TOC has **1,637** objects and **368** RLS policy entries.
2. Separate localhost PostgreSQL **port55432**, not production5432, dedicated database `assps_core_restore_verified_20261012` created using a fresh UTF8 template0. Archive temporarily staged in secure mode0600 PostgreSQL-only `/dev/shm` storage; backup itself stayed untouched.
3. Controlled `pg_restore --no-owner --no-acl --exit-on-error` into the dedicated database finished with explicit **exit code 0**; restore error log empty. Unlike an earlier streaming attempt with ambiguous pipe exit, this is a direct file-based verified command with clear return code.
4. Read-only aggregate comparison between actual production5432 and actual restored55432 at the observation checkpoint:

   | Metric | Live | Restored |
   |---|---:|---:|
   | Students (all) | 322 | 322 |
   | Attendance rows | 12,181 | 12,181 |
   | Fee challans | 901 | 901 |
   | Fee payment transactions | 129 | 129 |
   | Exam result rows | 2 | 2 |
   | RLS policy records | 368 | 368 |
   | Public base tables | 88 | 88 |
   | FORCE RLS tables | 78 | 78 |

   The **full canonical ordered RLS definition digest** (including roles, USING and WITH CHECK clauses) matches `0e24bd705bc27f455788c985860b8ea5` (MD5, comparison checksum not cryptographic release signing).
5. New `verify-fresh-restore-data-parity-20261012.py` compares these read-only aggregates and catalogue definitions while refusing unexpected source/restored database identities; source negative tests check student/marks drift, missing FORCE RLS, and changed policy definitions. Actual result **PASS_RESTORE_PARITY_ONLY**.

After verification the temporary in-memory archive staging was deleted, original backup SHA256 verified again, and an earlier redundant *Core-created disposable* partial-rehearsal database was removed from the test cluster only. Verified clone retained in localhost55432 for auditable read-only inspection; its PUBLIC database CONNECT/TEMP privileges were revoked and its restored signed-context HMAC key was rotated to a *synthetic test-only* value. The pre-hardening restore parity report is preserved, SHA256 sealed under root-only `/root/secure-archive/assps-core-rls-qa-20261012/`. Rotating the private signing key means credential bytes are intentionally no longer equal to the production snapshot, while schema, student counts and RLS policy definitions remain preserved. **Never use this clone as production or as a source of authorization tokens.**

## Gate 2 — Read-only role/ACL restoration blocker proven

The restore deliberately used `--no-acl`, hence a successful physical database restore does **not** imply user-role privileges are restored. For **75 permitted Core relations**, source production roles `apex_app_runtime` and `assps_marks_signed_runtime` have SELECT/INSERT/UPDATE/DELETE on **75** each, while the restored database has **0** grants for all eight role/operation combinations. New `verify-fresh-restore-acl-parity-20261012.py` returns **HOLD** instead of falsely certifying a running application. Missing grants must be addressed through reviewed global role provisioning and controlled restore ACL replay, not unverified production privileges.

The fresh backup TOC declares **176 ACL entries**: 155 owned by `apexos_user`, 6 by `apex_paper_owner`, 15 by `postgres` (including 2 DEFAULT ACL). The protected PostgreSQL test cluster lacks global roles `apexos_user` and `apex_paper_owner`. Source `apexos_user` is privileged with `BYPASSRLS`; this role must **not** be blindly recreated in an operational replacement. New `verify-fresh-restore-global-roles-20261012.py` returns **HOLD** with exact missing owners and privileged-role mapping requirement. `pg_dump` archives alone do not capture cluster-global roles; safe, reviewed cluster globals and database-local grants require separate recovery contract.

Both fail-closed checks now run in the unified Core release verifier. Each has standalone negative tests and emits no school identities or secret values. These are *separate access/recovery blockers*, not an instruction to expand production role grants or disable RLS.

## Gate 3 — Retained release boundaries and exact next requirements

- Protected Paper Studio worktrees and documents untouched, including 2 Paper data relations excluded from Core app/Marks role privileges. Independent Paper QA/Academic verification/Connect source remains separate; no source rebase, forced push or production cutover.
- Existing signed Marks Entry scoped GET/POST routing retained. Offline Marks Chromium/browser/print tests remain source QA and do not establish a real authenticated principal/teacher First Term marks Save→Reload→official Result Card lifecycle.
- VPS still a **50 GB virtual disk** with root `/dev/sda1` around 91–92% used and 4.3–4.4 GiB free. No provider 100GB expansion. No protected worktrees/backups/browser runtimes/Question Bank sources deleted; at most a Core-created duplicate 27MB test database and in-memory staging were cleaned after proof.
- Remaining production backend blockers: live full-app signed role 77 guards absent; privileged legacy `BYPASSRLS` login; original restore grant gap; insufficient disk headroom. Real signed-login positive/negative tenant HTTP workflows plus independent protected module release and genuine marks teacher approval still required.
- **New distinct recovery blocker:** archive application grants and global role ownership cannot yet replay onto the test cluster without an independently reviewed least-privileged mapping. Data/RLS recovery PASS does **not** authorize untested backend replacement/rollback.

**Executed QA:** 30 Core Python suites / **208 of 208 tests PASS** on the current isolated worktree, including fresh restore data-parity, missing ACL, missing cluster-global role and release fail-closed contracts. The complete combined Core/Chromium/Vite runner was **blocked by platform safety checks before execution in this mission**; this mission does not claim a new combined runner PASS. Prior published backend/Chromium results remain prior evidence, not re-executed proof. The standalone actual restore to the isolated database explicitly returned `pg_restore exit=0`, and the read-only restored data + policy parity gate returned PASS.

**Verifiable source evidence:** updated Core Python scripts, negative policy tests, private SHA256 manifest for separate data-parity, ACL-gap, globals-gap JSON reports and `pg_restore` log. No PII or credentials committed to Git.

**Final decision:** `SOURCE_AND_ACTUAL_DB_RESTORE_TESTS=PASS`; `FULL_DATABASE_ACCESS_ROLLBACK=HOLD`; `FULL_BACKEND_PRODUCTION_RELEASE=HOLD`; `EXISTING_SIGNED_MARKS_ONLY=SCOPED_GO`.
