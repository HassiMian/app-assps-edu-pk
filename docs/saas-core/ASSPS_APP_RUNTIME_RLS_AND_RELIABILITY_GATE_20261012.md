# ASSPS SaaS Core — Next Three-Checkpoint Closure, 12 October 2026

## Scope, release provenance, and protection

- This source-only continuation starts from exact reviewed Core SHA `169bb6d9c5203a59471bf7ac14f58e20305068e4`, derived from `9b90359c`, in a new isolated branch and worktree `/root/workspace/assps-core-rls-grant-rehearsal-20261012`.
- Canonical production release branch remains `00da1e296c3116086a1d1e98c272eb0534e4ee8e`; live frontend `8b5d370e`, legacy backend `16ab8f34`, signed green backend `1b0541af` unchanged.
- Paper Studio, Grade IX-X, and APEX Connect source/worktrees and school records were not changed. This audit does not authorize production migrations or privileged role cutover.

## Checkpoint 1 — Genuine RLS release blocker beyond table privileges

Read-only clone catalog inspection shows 4 of 4 sampled financial/student/personnel business tables lack `apex_app_runtime` SELECT grants in the disposable restored clone. However, the existing legacy `app_runtime_school_access` and `app_runtime_school_guard` policies also use session-configured school and super-admin flags without signed-context verification. Consequently adding grants alone would be unsafe.

A narrowly scoped PostgreSQL transaction in the **disposable clone** demonstrated the unsigned/privileged-session policy risk using *aggregate counts only*. The temporary grant and proof-only signed restrictive policy were rolled back; a follow-up catalog check showed the temporary policy/grant absent. The validated `core_security.signed_school_allowed(school_id)` restrictive guard blocked the unauthorized aggregate visibility in this clone proof. **No production database or permission change occurred.**

Added `ops/release/core-infrastructure/app-runtime-policy-readiness-20261012.py`, a read-only fail-closed catalog verifier on production or disposable clone that requires signed restrictive RLS guard coverage for `students`, `attendance`, `fee_challans`, and `employees`. Both existing catalogs correctly return `HOLD`, with four missing signed guards; 5/5 pure negative regression tests PASS. Integrated production + clone gates into the existing one-shot runner; full runner execution in this continuation was blocked by platform safety control, so new combined-suite PASS is NOT claimed.

**Release remediation requirements:** Implement a vetted additive signed-context policy for every Core-owned sensitive relation, establish genuinely non-BYPASS app login credentials, provide necessary table/sequence privileges only after tenant-isolation tests, verify authentication bootstrap and platform admin semantics separately, and prove authenticated positive + unauthenticated/forged negative behavior on an isolated clone. Never treat a policy-name match as complete end-to-end release certification. No blind grant, production role revoke, or replacement of port5000 occurred.

## Checkpoint 2 — Public API reliability

A fresh bounded one-shot HTTPS diagnostic showed both IPv4/IPv6 public API `/health` samples HTTP200 with expected sub-second completion, while local TLS and Connect loopback also returned HTTP200. Historical intermittent multi-second requests remain documented; a passing short sampling window does not establish the edge-network root cause or guarantee no future recurrence. No Nginx/PM2/firewall restart or modification performed.

## Checkpoint 3 — Capacity, school records, and finances

- `/dev/sda` provider disk still 50GB; `/dev/sda1` ext4 root remains ~48GiB usable, approximately 90% occupied and 5.0GiB free. No 100GB provider-side expansion; no protected archives, Question Bank caches, or concurrent worktrees deleted.
- Read-only School1: students318, attendance12180, fee challans898, payment ledger129, First Term Eight11, Pre-Nine0; 7 of 7 record consistency checks PASS.
- Read-only finance: zero ledger-vs-paid or latest cumulative-payment mismatch. 53 overlapping historical invoice signals remain for authorized school accountant; no automatic financial adjustments.
- `exam_results` historical production count remained 2 in previous immediate live check. No production synthetic marks were entered.

## Evidence and certification

The prior exact-source mission on SHA `169bb6d9` independently reported 14 Python suites 88/88 PASS and 10 Node modules 51/51 PASS, plus Chromium Marks Entry and Result Cards regressions, Vite build and data audits. These are **prior-run evidence** and are not falsely repeated as newly run tests. This continuation itself ran 5/5 new policy-verifier unit tests, production + clone read-only catalog gates, clone-only rollback-contained security proof, bounded public HTTP diagnostics, and repeat live school+finance integrity audits. The all-in-one runner attempt was blocked by platform safety checks; no circumvention or fake PASS.

**Final decision:** Existing signed Marks Entry remains `SCOPED_GO` based on earlier acceptance; full backend replacement `HOLD_SECURITY`, source-only QA `TESTED_NOT_DEPLOYED`, provider capacity `HOLD`, financial reviewer adjustments `HOLD`. Preserve the production school data and existing rollback paths.
