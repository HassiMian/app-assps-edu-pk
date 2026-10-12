# ASSPS Core — Integrated Three-Gate Auth, RLS and Reliability Mission

**Date:** 2026-10-12  | **Owner:** SaaS Core & Production Master  | **Coordination:** GitHub Issue #4

## Release identity and protected workstream boundaries

- Canonical Core remote `release/firstterm-core-security-unified-20261011`: `00da1e296c3116086a1d1e98c272eb0534e4ee8e` (verified using independent Git remote ref).
- Public frontend static root `/var/www/assps-resultcards-class-isolation-8b5d370e` metadata commit: `8b5d370e0a91e86f5c7c136bbf49521ab1e15147`.
- Public legacy backend runtime metadata: `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9` (`apexos_user` retains BYPASSRLS).
- Signed green 5091 source previously verified at `1b0541af75526b2840e7403bc8193cd1c540a811`, carrying the restricted Marks Entry route.
- This work extends clean **isolated** branch `fix/core-clone-parity-global-role-awareness-20261012` from `9b90359c5274a0fb0dc5181106cd0e6486cf150e`. The canonical release branch remains unchanged, no cross-owner Paper Studio/Grade IX-X/APEX Connect integration or production deployment was attempted.

## Checkpoint 1 — Authentication and tenant-isolated query hardening

**Actual code changes:**

- Added `al-siddique-backend/src/services/security/strictSchoolIdentity.js` so auth and tenant middleware interpret school identity identically. Rejects numeric prefixes, exponent/fraction text, zero, negative values, booleans, objects, arrays, and unsafe integers.
- Updated `middleware/auth.js` to use shared strict parsing for trusted service school config, hydrated active-user identifiers and role-context school normalization; malformed values cannot silently be converted by `parseInt`.
- Updated `middleware/tenant.js` to reject invalid or conflicting authenticated school aliases even when a different request field appears valid. Signed/scoped user and school tenant claims now take priority over mutable request headers/query strings.
- Replaced the legacy SQL scope `(school_id = X OR tenant_id = Y)` union with `school_id = X AND (tenant_id = Y OR tenant_id IS NULL)` where both columns exist. The `tenant_id IS NULL` compatibility clause is restricted by the already-matched school ID. Single-column tables still receive the applicable school/tenant predicate. Missing authenticated school scope and tables missing tenant columns fail closed.
- Verified that auth platform role behavior is still distinct; restricted staff cannot select a different school via header or URL.

**Real live-data compatibility check, read-only:** for School 1, `students 318`, `attendance 12180`, `fee_challans 898`, `employees 18`, `exams 3`, `users 581` had identical old-OR and new-AND aggregate row coverage; zero mismatched tenant keys or same-key foreign-school rows in these six families. No school record was modified.

## Checkpoint 2 — PostgreSQL RLS denial and disposable-clone grant parity

Added `ops/release/core-infrastructure/unsigned-rls-role-denial-audit-20261012.py` with seven pure decision tests. Exact-role inspection uses bounded read-only transactions, `SET LOCAL ROLE`, role capability inspection, `row_security_active`, aggregate SELECT only, and automatic transaction rollback. No elevated production session context or signed secrets injected.

**Actual checks across four business tables** (`students`, `attendance`, `fee_challans`, `employees`):

| Environment | Role | Security outcome |
|---|---|---|
| Live PostgreSQL 5432 | `apex_app_runtime` | **4/4 PASS**: forced RLS active, unsigned rows hidden |
| Live PostgreSQL 5432 | `assps_marks_signed_runtime` | **4/4 PASS**: forced RLS active, unsigned rows hidden |
| Disposable restore 55432 | `assps_marks_signed_runtime` | **4/4 PASS**: forced RLS active, unsigned rows hidden |
| Disposable restore 55432 | `apex_app_runtime` | **4 HOLD**: missing SELECT grants on clone; no rows exposed but backend functionality unproven |

These checks prove **negative unauthenticated database row visibility**, NOT an authenticated signed-session functional release. Restored-clone parity of 77 protected table structures and 212 original policies PASS; live signed pre-cutover and movement security gates PASS, but explicitly do not certify full backend migration. Do not add indiscriminate grants to mask the gap.

Added full-platform read-only `tenant-key-consistency-audit-20261012.py` and eight tests. Across all tenants: `322 students`, `12181 attendance`, `901 fee_challans`, `20 employees`, `4 exams`, `585 users`; **zero** tenant-key mismatches, school orphans or duplicate school tenant keys. Only aggregates were printed.

## Checkpoint 3 — Reliability, protected QA and finance/storage

- Public HTTPS App, APEX Connect and signed green health checked successfully; Nginx config PASS. Host firewall v4/v6 TCP3000/5000 `eth0` REJECT exact rules verified present; `assps-private-node-ports` service active and enabled. No service restart or firewall adjustment.
- Enhanced certificate-validating one-shot API diagnostic with HTTP result, DNS, TCP connect, TLS and TTFB timings. Current bounded IPv4+IPv6 test returned HTTP200 in all samples, but previous multi-second public-origin path latency means durable provider/edge root-cause acceptance is **not proven**. No speculative network restart.
- Changed Core release readiness to WARN when free disk drops below 6 GiB even if reported percent is 89.x. Live root `/dev/sda1` ~48 GiB usable at ~89.5–90% occupied with **~4.99 GiB free**; underlying `/dev/sda` virtual disk remains 50 GB. `--strict` intentionally returns EXIT2 for capacity WARN. Hostinger 100 GB upgrade has not been purchased/executed and cannot be assumed. Preserve active Git worktrees, QA browsers, Question Bank cache, backups and historical school records.
- School 1 live read-only integrity: 318 students, 12,180 attendance, 898 challans, 129 ledger rows, Class Eight Blue 11, Pre Nine 0; seven relational/duplicate/negative checks PASS. `exam_results` preserved at 2 original rows (no synthetic writes).
- Finance read-only reconciliation: payment-transaction sums vs recorded paid amounts **zero mismatch**. Exactly 53 previously archived, overlapping fee exception records still need qualified school accounting review; no payment/challan edits were applied.

## One-shot mission runner and exact QA evidence

Added `ops/release/core-infrastructure/run-three-gate-core-mission-20261012.sh`: **one command** executes explicit allowlisted offline source tests, browser fixtures, Vite build and subsequent read-only production/clone gates. It never runs migrations, seeds production, changes network/services, or schedules background work. A HOLD always means fail-closed production release decision.

Actual combined invocation on VPS (full evidence `/tmp/assps-core-three-gates-one-shot-20261012.log`) completed with:

- **14 Python unit suites / 88 tests PASS**.
- **10 targeted Node security/teacher/tenant test modules / 51 tests PASS**.
- Marks Entry Chromium synthetic scenario **11/11 PASS**; Result Cards class/section isolation Chromium **PASS**.
- Zero-vs-blank/print 16/16 PASS; protected paper templates 6/6 PASS; Vite build EXIT0.
- Production signed precutover, clone baseline parity, tenant-key consistency, School 1 integrity and finance ledger read-only gates all **PASS**.
- **2 expected HOLD gates:** incomplete disposable clone `apex_app_runtime` grants (4 affected business tables) and VPS absolute filesystem headroom below 6 GiB. Public API sampling in this run PASS but historical spikes remain a reliability investigation item.
- Final one-shot `source_qa=PASS`, `read_only_gate_holds=2`, `full_backend_release=HOLD`, `production_change=NONE`; exit2 is intentional release-policy protection.

## Next authorized engineering gates — never conflate with these completed source checks

1. Full backend sign-in/bootstrap, fee, admission, attendance and employee route integration under independent least-privilege non-BYPASS runtime: provision a **fresh dedicated disposable** route-test clone with verified grants and signed tenant context, test cross-school denial and all ordinary-role successes, then capture safe rollback. Do not alter legacy production credentials before proving all routes.
2. Confirm provider-backed storage expansion and backup/fault recovery before any high-storage release cutover. Device is `/dev/sda1`, not `/dev/vda1`; partition resizing requires actual provider block device capacity expansion and verified snapshot.
3. Authenticated legitimate school staff Marks Entry save/reload and physical print acceptance require real authorized marks; accountant-reviewed corrections require actual finance sign-off. No synthetic production marks or automatic financial adjustments.

**Final:** Existing First Term Marks Entry and Result Cards scoped GO remain operational. **FULL_BACKEND_HOLD** due unverified legacy BYPASSRLS replacement, disposable clone grant/route acceptance, capacity and institutional gates. **This document and all fixes are source-only; no production deployment has occurred.**
