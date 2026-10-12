# ASSPS SaaS Core — Three-Gate Signed-RLS, Release Control and Reliability Mission

**Mission date:** 12 October 2026. **Owner:** SaaS Core & Production Master. **Central coordination:** GitHub issue #4. **Status:** source and isolated disposable QA only, no production code deployment. The public release must not treat a development green check as live acceptance.

## Exact source and live baseline

| Component | Exact SHA / state | Provenance |
|---|---|---|
| Canonical Core release | `00da1e296c3116086a1d1e98c272eb0534e4ee8e` | remote `release/firstterm-core-security-unified-20261011` |
| Parent reviewed Core QA | `169bb6d9c5203a59471bf7ac14f58e20305068e4` | clean pushed isolation and auth source |
| This independent Core branch | `fix/core-rls-clone-candidate-and-ops-20261012` | extends exactly the parent; no stale canonical redeployment |
| Live frontend | `8b5d370e0a91e86f5c7c136bbf49521ab1e15147` | `release-meta.json` on public Nginx root |
| Live legacy backend | `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9` | PM2 backend remains on port5000 |
| Live signed Marks green | `1b0541af75526b2840e7403bc8193cd1c540a811` | private loopback port5091 |

**Paper Studio, Grade IX–X Academic Master and APEX Connect remain independent.** This branch neither cherry-picks nor deploys their active candidates.

## Gate 1 — Actual database-enforced Core signed RLS rehearsal

A real weakness was confirmed **on a disposable PostgreSQL database**, where the legacy `apex_app_runtime` RLS rules relied on session-supplied authority; an unsigned session that asserted privileged state could obtain unauthorized aggregate visibility. Affected production feasibility requires further authenticated-entry testing: this is **not** proof that any external user exploited the running school application, and the protected green Marks Entry uses a different signed runtime.

The Core-owned isolated QA database `assps_core_rls_guard_qa_20261012` was created from an existing disposable restore on the dedicated local PostgreSQL test cluster **port55432** (27 MB-scale database). The clone is isolated from live PG5432. Its signing key was replaced **inside the QA clone only** with a fresh synthetic value; actual production signing keys and role definitions were never changed or exposed.

A DB-identity-guarded, idempotent **clone-only** SQL rehearsal was implemented for exactly four SaaS Core-owned tables: `students`, `attendance`, `fee_challans` and `employees`. It adds a signed, restrictive guard to `apex_app_runtime` without removing the existing `assps_marks_signed_runtime` guard. Only necessary SELECT privileges for the four test relations and signature helper usage are granted on the dedicated clone. Nothing in this SQL file may be executed on port5432 or another clone without explicit redesign and release approval.

**Observed actual PostgreSQL test, zero production writes:** unsigned access to these relations was denied after the signed guard; a separately constructed synthetic valid signature in a read-only transaction allowed School1 rows (318 students, 11,863 attendance records in this older restore, 898 fee challans, 18 employees) while School2 visibility remained zero. Changing a signed tenant claim without a new signature denied rows. The signed-role positive proof was executed through a protected **operator simulation** on the clone, not through a real non-BYPASS application login, teacher browser, or production session; full authenticated role/route acceptance remains outstanding. Detailed sensitive reproduction evidence is root-only, intentionally not published.

Added a READ-ONLY clone catalog auditor that verifies FORCE RLS, the app runtime's non-login/non-BYPASS attributes, signed guard membership for both runtime roles, exact table privileges and unchanged corresponding production guard membership. Static tests refuse non-clone database identities, altered table scope, destructive DDL and unauthorized grants. Both source tests and actual clone gate PASS.

**Never auto-promote this four-table rehearsal to all 77 protected RLS tables:** other table families include independent Paper Studio ownership, tenant-key policy variants, and distinct super-admin/bulk workflows requiring review.

## Gate 2 — Safe release authority and genuine QA

Created `legacy-backend-bypass-cutover-gate-20261012.py` to examine the **actual deployed login role** without showing credentials. It correctly returns HOLD while legacy `apexos_user` has PostgreSQL `BYPASSRLS`. A future restricted login is at most a provisional login check and not full authenticated browser/route certification.

The existing one-command integrated runner now includes both new read-only gates and **cannot declare full deployment approved merely because unit suites pass**. Even if every preliminary QA gate turns green in a future run, the runner must still exit nonzero and hold full replacement until a separate authenticated release certifier is implemented. A bounded retry is permitted only for a recognized localhost Vite fixture `ERR_CONNECTION_REFUSED` transport failure; assertion/security failures must still fail. An earlier full run had one such test-server interruption, and separate Marks Entry Chromium rerun passed. The latest integrated run passed without hiding the first failure.

**Actual final integrated run, source QA green with exit2 fail-closed release HOLD** (private evidence file under `/root/secure-archive/assps-core-rls-qa-20261012/`):

- 18 Python source suites / **114/114 tests PASS**.
- 10 backend Node security modules / **51/51 tests PASS**, no live database test fixtures inserted.
- Synthetic First Term Marks browser **11/11 PASS**; Result Cards class/section Chromium PASS; blank/zero print **16/16 PASS**, protected frontend templates **6/6 PASS**.
- Vite frontend build **EXIT0** (~3.40 seconds in final integrated run).
- All ten read-only release gates evaluated: **7 PASS, 3 HOLD**; final summary exactly `source_qa=PASS`, `read_only_gate_holds=3`, `full_backend_release=HOLD`, `production_change=NONE`.

The remaining three release holds are **(a)** missing `apex_app_runtime` SELECT grants on the *original* restored clone used by legacy gate, even though our new isolated guarded clone check PASS; **(b)** deployed legacy PostgreSQL `BYPASSRLS` login; **(c)** insufficient root disk free space below the six-GiB readiness threshold. No unsafe privilege revocation or deployment performed.

## Gate 3 — Network/storage and school record preservation

- Public app, APEX Connect `/health` and signed green health HTTP200 in multiple fresh checks; public IPv4/IPv6 latency one-shot sampling currently PASS, but earlier multiple 3–6 second public path spikes mean intermittent edge/network behavior is not independently proven permanently resolved. Local Nginx origin/Connect loopback health was fast; no speculative service restart or unrelated Connect change.
- `nginx -t` PASS, dual-stack firewall containment service active. Off-VPS direct-port block was independently evidenced by Connect Master earlier, not re-performed in this Core run.
- `/dev/sda1` ext4 on physical virtual device `/dev/sda`, **50 GB provider disk, ~48 GiB filesystem, ~4.9 GiB free / 90% used**. Provider 100-GB expansion remains pending; no protected Question Bank, backups, browser installations or other owners' worktrees deleted.
- Read-only production: 318 school1 students, 12,180 attendance records, 898 challans, 129 payment-ledger records; 0 payment-ledger reconciliation mismatches. Historical 53 unique finance-review cases remain under accountant authority. Live `exam_results` remains **2 existing rows** (zero new synthetic marks). Live signed policies total368; no SQL migrations or privileged role changes on production.

## Protection / release decision

**Existing signed First Term Marks Entry scoped GO remains unchanged.** Full backend replacement on port5000 = **HOLD**. Only the disposable QA cluster and owned isolated Core source were modified, using narrow clone-only grants and an ephemeral synthetic signing key. No live PostgreSQL writes, real grades, fees or attendance updates, service restarts, Nginx changes, production frontend/backend deployments, Paper/Connect/Academic changes, forced pushes or background schedules.

**Exact next full-release requirements:** migrate and test a separate non-BYPASS application LOGIN with signed HMAC session binding; prove positive principal/teacher and negative cross-tenant HTTP reads/writes on a disposable **synthetic-only** database before promoting every affected Core route; preserve protected Paper Studio/Grade IX-X/Connect contracts; resolve provider storage headroom; require genuine school marks save/reload/print and accountant approval on historical balances; verify backup, rollback and live acceptance. An operator-signed candidate and SaaS Core certification must precede any production backend switch.
