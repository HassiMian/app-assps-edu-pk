# ASSPS SaaS Core — Actual Three-Gate Production Certification Outcome

**Date:** 2026-10-12 · **Authority:** SaaS Core & Production Master · **Coordination:** GitHub issue #4

## Final decision: SCOPED MARKS GO / FULL BACKEND HOLD

This document records **genuine tests and explicitly withheld claims**. A successful local source build, synthetic browser fixture, or database-owner signing simulation is **not** evidence of a completed authenticated production release. No unified backend production deployment was performed.

### Verified source identities and isolation

| Component | Verified SHA | Status |
|---|---|---|
| Canonical remote Core release `release/firstterm-core-security-unified-20261011` | `00da1e296c3116086a1d1e98c272eb0534e4ee8e` | Unchanged |
| Source-only Core security parent | `b1a2b07b057384e9cf100050c7b88aea00f93f5f` | Clean source ancestry |
| This Core certification branch | `fix/core-rls-clone-candidate-and-ops-20261012` | New Core-only QA source, separate worktree |
| Live frontend | `8b5d370e0a91e86f5c7c136bbf49521ab1e15147` | Unchanged, HTTPS200 |
| Live legacy backend | `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9` | Still privileged legacy login, HOLD for full replacement |
| Live green Marks backend | `1b0541af75526b2840e7403bc8193cd1c540a811` | Existing scoped signed RLS, loopback5091 |

A separate Core-only policy/readiness test from sibling commit `224fee87b880bbbc31fbeb15401aff5db350d41a` was **forward-ported** into this isolated branch, without touching that agent's branch. All Paper Studio, Grade IX–X and APEX Connect active WIP was preserved. The newer Paper-owned release-candidate branch is not treated as an automatic full SaaS deployment source.

## Checkpoint 1 — PostgreSQL RLS: actual combined 77-table policy rehearsal

**TEST ENVIRONMENTS ONLY:** The dedicated Core QA PostgreSQL cluster listens on port **55432**, separate from live PG5432. Clone `assps_core_rls_guard_qa_20261012` contains an already-restored snapshot, and the operator did not mutate student/fee/attendance rows. A test-only synthetic HMAC key was used in this clone, not the production secret.

The new narrowly guarded clone-only SQL rehearsal starts with precise DB/port/user verification, preserves existing signed Marks role membership, and extends the `core_signed_tenant_guard` to **both** `assps_marks_signed_runtime` and `apex_app_runtime` for all 77 protected tables. Exactly **73** school-ID-based and **4** tenant-key-based predicates were inspected, plus FORCE RLS and helper privileges. App-runtime SELECT grants were reconciled for **75** protected relations; two protected Paper document relations deliberately remained excluded. Changes were limited to the Core-owned disposable clone.

**Read-only combined catalogue verifier: PASS**, confirming app runtime 77/77, signed Marks runtime 77/77, FORCE RLS 77, valid restrictive policy predicate structure and non-login/non-BYPASS runtime role. An actual PostgreSQL **operator simulation** of a signed runtime transaction returned only the intended school aggregates; a different school or tampered tenant ID was denied. This was *not* a genuine least-privilege PostgreSQL LOGIN or role/HTTP authenticated acceptance test.

**LIVE production:** signed restrictive application-runtime guards **0/77**. Existing signed Marks runtime policies remain preserved. Full backend production policy certification **HOLD**; do not apply clone SQL to production or revoke legacy privileges without full verified migration/rollback.

**Real LOGIN limitation:** a subsequent test using a separate synthetic-only QA database and unique non-BYPASS login could not execute its signed-login test through a platform safety check. **No passing result was invented.** The temporary QA login was set to **NOLOGIN**; its generated credentials and bootstrap evidence remain root-only (0600), never committed or shown publicly.

## Checkpoint 2 — Authentication, Marks and application QA

Final **one-shot integrated runner** finished:

- **22 Python test suites / 146 tests PASS**, including 77-policy source contracts, fail-closed production/clone comparison, QA grant boundaries, restore parity, financial integrity, method-split security and release authority.
- **10 Node backend security suites / 51 tests PASS**, synthetic-only/mock identity, actor/teacher permissions, signed envelope, tenant SQL and Marks HTTP contracts.
- Synthetic Marks Entry Chromium **11/11 PASS** and Result Cards class/section Chromium PASS.
- Blank-vs-zero and print fixtures **16/16 PASS**; **6/6 protected templates PASS**.
- Frontend Vite build **EXIT0**. No compiled artifact was deployed to live Nginx.
- The final runner reports **13 read-only gates: 9 PASS, 4 HOLD**. Exit code **2** is intentionally fail-closed: `source_qa=PASS`, `read_only_gate_holds=4`, `full_backend_release=HOLD`, `production_change=NONE`.

**Genuine login/browser gap:** read-only web navigation did not expose an authenticated principal Marks Entry session. Therefore there is **no verified real teacher/principal save → reload → Result Card print** for new First Term marks in this mission. Do not insert synthetic marks into live `exam_results`.

**Method-split evidence:** live Nginx maps and scoped location files match the reviewed Git source byte-for-byte. The existing Marks signed route handles approved GET exam catalog/grade settings/results and POST exam results, while POST exam creation, PUT grade settings and DELETE exam ID still use legacy backend. `verify-live-marks-methods-20261012.py` **PASS_SCOPED_METHODS_ONLY**, not full backend approval. Altering legacy exam-management mapping blindly would break existing school operations; it was not changed.

## Checkpoint 3 — Infrastructure, backup and school-record preservation

- Public app, API and private green health returned HTTP200; `nginx -t` PASS; `assps-private-node-ports.service` active. **Independent remote Windows workstation** found direct TCP3000/5000 blocked or timed out while both public HTTPS origins returned HTTP200.
- One-shot IPv4/IPv6 API latency diagnosis passed this mission, but previous public-path tail latency spikes remain a reliability observation rather than a solved/verified root cause.
- `/dev/sda1` ext4 root filesystem around 90% full with **~4.8 GiB available** on provider virtual `/dev/sda` **50 GB**. The `<6GiB` headroom gate correctly **HOLD**. No Hostinger plan purchase, provider expansion, partition resize, backups purge, Question Bank source cache deletion, browser runtime cleanup, or other agent worktree cleanup was executed.
- Protected production database backup `firstterm-20261011T073058Z` mode0600 hash validated with `sha256sum -c` **PASS**. Non-destructive `pg_restore -l` catalogue readable; previous independently restored clone parity verified. These are restore-readiness checks, **not** an executed production cutover/rollback.
- Live read-only integrity checks: school1 **318** students, **12,180** attendance rows, **898** fee challans, **129** ledger entries; no payment ledger sum mismatch. Exactly **53 unique** historical finance-review challans still need accountable school financial sign-off; no automated balance changes.
- Live `exam_results` remained **2 historical rows**, not touched by synthetic tests. Live RLS policies **368**, legacy `apexos_user` remains `BYPASSRLS`.

## Four active fail-closed release HOLD gates

1. **Original restored baseline clone:** `apex_app_runtime` SELECT grants absent in the untouched original restoration; dedicated guarded clone PASS does **not** erase this baseline discrepancy.
2. **Production full77 signed app RLS:** required live application-runtime signed restrictive guards remain missing, as verified by the exact 77-policy catalogue gate.
3. **Production backend login:** deployed `apexos_user` still has BYPASSRLS; full signed, least-privileged backend must be tested and independently certified before cutover.
4. **Disk reliability:** ~4.8GiB free, below signed release-readiness threshold; provider storage upgrade/preserved backups mandatory for full migration headroom.

Additional *independent* certification requirements: genuine signed principal/teacher HTTP acceptance with denied cross-tenant reads/writes; protected Paper Studio/Grade IX–X/Connect integration reviews; genuine marks save/reload/print; authorized finance exception adjudication; actual release-time backup and verified rollback plan; final browser acceptance on new live backend.

## Final production authorization

`EXISTING_MARKS_ONLY_SCOPED_GO`; `CORE_SOURCE_AND_CLONE_POLICY_QA_PASS`; **`FULL_BACKEND_PRODUCTION_RELEASE_CERTIFIED=FALSE`**; `PRODUCTION_DEPLOYMENT=NONE`; `REAL_SCHOOL_DATA_MUTATIONS=NONE`; `SCHEDULED_AUTOMATIONS=NONE`. The project must not weaken these gates or silently reroute signed Marks traffic to a privileged legacy backend to claim success.
