# Mission A314 — Live SaaS Authentication and Recovery Evidence

Date: 14 November 2026. Immediate execution; no scheduled automation.

## Verified production
- Public backend JSON health /api/: HTTP 200.
- Backend apex-backend online. PM2 restart counter observed at 24.
- Nginx logged four upstream connection refusals on 14 Nov at 04:03-04:04 UTC against exams results and Saved Papers requests, coincident with PM2 fork-mode SIGINT restarts. Exact restart initiator is unproven.

## Real database backup recovery
- Latest archive: /var/backups/assps-critical-20261114T013132Z.
- Archive checksum manifest and two compressed PostgreSQL backups passed checks.
- Actual apexos SQL extracted from today's pg_dumpall and restored into an ephemeral PostgreSQL 16 instance (UNIX socket only; no TCP listener).
- Temporary DB needed the original name apexos for final DATABASE grants; following correction SQL completed to end-of-dump. One trailing psql unrestrict client-state warning occurred from partial reentry after SQL execution.
- Restored: 100 public tables, 605 users, 335 students, five schools. Aggregate counts matched live; restored schema export and pg_amcheck passed (323 public indexes).
- VPS evidence: /root/secure-archive/project-continuity/automation/A314-isolated-db-restore-20261114/RESTORE_EVIDENCE.json.
- Isolated cluster was stopped and deleted. No school records modified.
- Application-level authenticated recovery remains unverified.

## Isolated editor worker recovery
- Service user asspsworker lacked a readable SSH configuration for its Git remote alias github-assps and continuously failed DNS resolution.
- Only that isolated repository's remote was changed to https://github.com/HassiMian/app-assps-edu-pk.git. Read-only fetch with the worker account succeeded and local/remote main HEAD matched.
- Worker not restarted; no automation created. Subsequent downstream worker verification timed out; full worker certification not claimed.
- Reversal details are in the secure archive file EDITOR_WORKER_REMOTE_ROLLBACK.txt.

## Live-source drift and lockout bug
- Live authentication SHA-256: 1abd3329be4c69577aebfcecf8d9bf92b96da4aadd68d0594cccf5c026b6fbe0.
- Proposed live-source SHA-256: ad030bf477e1e05f01143a14ed9a04c1e0700095c1da5c249ddf30c6606215b6.
- ops/patches/a314-production-auth-lockout-ttl.patch is against exact live source, not git-main.
- Live code has MAX_LOGIN_ATTEMPTS=15, no-store auth middleware and production fail-closed school lookup. Git-main/A312 sources differ and must not overwrite live without parity review.
- Live source FAILS 2/5 deterministic clock-based lockout aging tests: one additional bad password after 15-minute expiry re-locks immediately, and idle counters remain forever. Narrow candidate passes 5/5 without changing attempt thresholds.
- Candidate NOT deployed. A controlled, no-gap backend release strategy is required; production is single-instance PM2 fork.

## Unresolved
- Three school-1 active accounts have nonstandard non-bcrypt credential shapes (one admin, two teachers); no passwords read or reset.
- SMS reset configuration not verified. Genuine principal login and authenticated Saved Papers save/edit/reopen/print are not certified.

## No scheduling
- One Windows job was autoqueued by external connector while workstation unavailable. Queued ID win-1794630887-895008 explicitly cancelled before dispatch and pending queue confirmed at zero.
- No mission scheduling, production restart, DB mutation, backup deletion, or frontend cutover.
