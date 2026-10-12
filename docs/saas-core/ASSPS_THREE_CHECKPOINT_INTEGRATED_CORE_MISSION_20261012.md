# ASSPS SaaS Core — Integrated Three-Checkpoint Mission (12 October 2026)

**Scope:** SaaS Core-owned source hardening + source QA, live *read-only* integrity and operational checks. No SaaS production deployment or student-data modification. Coordinate under GitHub Issue #4.

## Canonical baseline and deployment boundary

- GitHub Core release `release/firstterm-core-security-unified-20261011` = `00da1e296c3116086a1d1e98c272eb0534e4ee8e` (remote `ls-remote` verified).
- Clean candidate `/root/workspace/assps-core-candidate-00da1e29-clean` at same SHA.
- Isolated Core fix branch `fix/core-clone-parity-global-role-awareness-20261012`; previous verified QA commits `144b29d3`, `16e4c394` retained.
- Production frontend `8b5d370e0a91e86f5c7c136bbf49521ab1e15147`; legacy backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`; green signed Marks Entry backend `1b0541af75526b2840e7403bc8193cd1c540a811` on loopback 5091.
- Existing Marks Entry is scoped GO. **Do not interpret this source-only branch as a production deployment or certify full backend replacement.**

## Checkpoint 1 — Canonical Core source and operational reliability

The isolated release-source auditor was previously repaired to target the actual clean candidate, check remote SHA and reject dirty worktrees. Additional implementation adds exact endpoint codes to the `tls_app_and_connect` gate for actionable failure evidence without weakening fail-closed behavior. Frontend and API public HTTP200 and green internal HTTP200 were observed, but intermittent public API latency was reproduced.

Added a one-shot, no-auth, no-write TLS-validated diagnostic `ops/release/core-infrastructure/public-api-path-diagnostic-20261012.py`, comparing public IPv4 and IPv6 paths with local Nginx TLS SNI and local Connect upstream. Samples have bounded timeouts and no scheduling. This differentiates a public-path latency symptom from a consistently slow local upstream **without claiming confirmed Cloudflare/provider root cause**.

One measured probe yielded public IPv4 times 5.758s/3.208s/0.124s and IPv6 times 0.164s/0.114s/3.659s (all HTTP200), while local Nginx TLS 0.027s and local upstream 0.006s were HTTP200. Strict latency verdict **HOLD**; production availability cannot be certified from one healthy curl.

## Checkpoint 2 — Trusted school identity boundary

Hardened Core `al-siddique-backend/src/middleware/tenant.js`:
- Reject school IDs parsed from prefixes or numerical coercion (`2abc`, `2e3`, fractions, negative/zero, unsafe integers, objects/arrays, etc.).
- Authenticated scoped users' school claims outrank conflicting request fields; request headers/query alone cannot select their school.
- Unauthenticated header/query cannot claim a school; protected backend-assigned identifiers remain available for legitimate compatibility.
- Authenticated platform roles' explicit school-selection behavior is retained; endpoint authorization remains independent.

Added 7 isolated negative/security unit tests. **This middleware change is in an isolated Core source branch only, NOT deployed.** Full route-by-route non-BYPASSRLS migration must be certified before public backend cutover.

## Checkpoint 3 — VPS capacity, live finances and protected regression

- Root filesystem `/dev/sda1` ext4, ~48 GiB available capacity total, 90% used and approximately 5.1–5.2 GiB free. Underlying virtual disk `/dev/sda` remains 50 GB; 100 GB provider expansion has NOT happened.
- Inode utilization ~23%; free RAM around 2.9 GiB; no active swap I/O thrash sampled.
- Browser caches ~863 MiB Playwright + ~505 MiB mobile browser resources are used by ongoing agent/QA work and were deliberately preserved. Question Bank source cache ~6.4 GB and database backup sets preserved. No destructive cleanup.
- Read-only school integrity: 318 students, 12,180 attendance rows, 898 challans, 129 payment ledger entries; Class Eight 11, Pre-Nine 0; seven core relational anomaly signals zero.
- Read-only accounting: ledger sum disagreements 0, latest cumulative-paid disagreements 0. Exactly 53 unique exception challans remain for qualified accountant reconciliation; signal categories overlap (14 paid > nominal, 23 nominal balance differences, 13 gross balance differences, 36 nominal/gross differences). Do not auto-adjust school invoices or cash ledgers.
- `exam_results` remained 2 existing historical rows; no synthetic school marks written.

## Executed QA and limitations

- 12 Core Python suites **70/70 PASS**, including production-readiness diagnostics and restored-clone global role parity checks.
- 8 isolated Node security/teacher HTTP test modules **29/29 PASS**, including 7 new school-ID tests. Test dependencies reused from installed backend packages; no database test fixture writes.
- Marks Entry synthetic Chromium **11/11 PASS**; Result Cards class/section Chromium **ALL PASS**; blank/zero print **16/16 PASS**; protected frontend templates **6/6 PASS**.
- Vite production build exit 0 (~3.56s) in isolated source tree; NO frontend deployment.
- Live anonymous `/api/exams` returned HTTP401 and public Marks UI HTTP200. Nginx `-t` PASS. Network port 3000/5000 isolation service active; direct off-VPS WAN probes in prior P0 report only, not newly repeated here.
- Restored-clone verifier PASS for 77 protected tables and 212 original policies; live signed pre-cutover audit PASS, but full release explicitly remains uncertified.

## Remaining gates and exact next production actions

1. **Full RLS cutover HOLD:** legacy production `apexos_user` still has `BYPASSRLS`. Authenticate every route group under genuinely least-privileged roles and test isolated restore with genuine signed session/tenant and role denial. Do not revoke a working live role or replace backend until all legacy routes and rollback pass.
2. **Public API path latency HOLD:** investigate intermittent public edge/transport latency with hosting/edge evidence while the local TLS and local upstream remain healthy. Keep strict release readiness fail-closed; no speculative restart.
3. **Storage and institutional dependencies:** provider-side 50→100 GB expansion is not executed and may entail billing; confirm expansion and backup before any online `/dev/sda` partition resize. Human accountant signoff on 53 financial cases; authentic school marks save/reload and generated official Result Cards must use authorized real data, never fabricated marks.

**Final verdict:** `MARKS_ONLY_SCOPED_GO`, `FULL_BACKEND_HOLD`, `NEW_SOURCE_TESTED_NOT_DEPLOYED`, `NO_SCHOOL_DATA_WRITES`, `NO_PRODUCTION_RESTARTS`, `NO_SCHEDULED_TASKS`.
