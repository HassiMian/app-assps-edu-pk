# APEX Connect — actual production worker read-only denial extension (2026-10-15)

## Source and authority
New Connect-owned, source-only evidence extension on clean descendant of `ops/connect-offsite-proof-failclosed-20261015` at `e7550d26b60fd7a9da588d47f9b66feb7884d481`. Do not modify owner-controlled Core/Grade/Paper branches or active /var/www. Exact canonical Connect parent `98f6dfcff72fbe9d46d227d5c1200d388300d3d5`.

## Real execution (NOT synthetic)
Executed official Core-owned `verify-live-restricted-ai-worker-20261015.py` using Core's root-only validated service-identity config; script performs actual production TCP/SCRAM authentication and SQL SELECTs only. Result: `technical_worker_candidate_status=PASS`, `public_worker_integration_status=HOLD` because the reviewed three-file source is NOT byte-identical in currently running Blue backend (worker file absent). The validated production password never printed or stored in report. Actual Core verifier JSON SHA256: `9ae7172a2c47b004eede5ab3de94ea4aed9c476567db8d4fd9796aabff3bfb35`.

Extended independent Connect read-only capability verifier `ops/connect/verify_worker_readonly_denials_20261015.py` uses only the Core-reviewed credential loader; it never prints credentials or mutates production. It exercises direct PostgreSQL `psql` SELECT/metadata probes against exact approved `assps_ai_worker_login` and `apexos`. Executed ACTUAL live identity, queue reads, sensitive-directory denied privileges and real denied SELECTs: **20/20 PASS**, `release_authorized=false`. No DB writes, DDL, SET ROLE or auth impersonation.

Synthetic adversarial `test_verify_worker_readonly_denials_20261015.py`: **15/15 PASS** (credential error redaction, forged superuser/BYPASSRLS, unauthorized queue, forbidden sensitive table grants, wrong errors, query timeout and mandatory release HOLD). This is additional to previously published **51/51 PASS** Connect route/first-login/offsite-proof tests and isolated disposable Postgres SCRAM adapter **8/8 PASS**.

## Offsite recovery and receipts
The current public Next `ONDwxEIZlx5onDIKY7wYf` archives were offsite SHA256-matched and all **2,977/2,977** regular files reconstructed on CYBERSPACE Windows. A separate concurrent Core/Paper agent also independently found **encrypted** offsite recovery copies for current Next, no-password PostgreSQL roles and production dump; their verifier reports `institutional_attestation_signed=false`. Do not treat a Windows technical receipt as an actual human reviewer signature. The Core institutional Ed25519 receipt intake `/etc/assps/connect-login-precutover-core-receipts.json` is absent, so the official six-item Core gate cannot pass.

## Release decision
Official Core+Connect source verifier **20/20 technical PASS** but **HOLD/exit2**. Current running backend still lacks reviewed AI worker adapter, and public role-neutral /dashboard is still admin-biased. Even actual worker SCRAM and permission checks are NOT equivalent to deployed backend worker transport or genuine independent School2/subject HTTP denial.

School-reported teacher first-login/Principal/School2/printer acceptance remains captured without asking staff to repeat routine trials, but independent source-bound signed session receipts have not been located. Previously verified teacher `must_change_password=true` state remains an account-specific unresolved discrepancy. Latest read-only Exam9 School1 result invariant = **1,762 rows, 213 genuine numeric zeros, zero NULL marks**; all protected school records stay untouched.

No production cutover, PM2 change, Nginx edit/reload, role migration, staff password change, marks modification, or forged approval. **SaaS Core alone** may promote after genuinely signed Core release acceptance and rollback/postflight with preserved Daily Diary font/row controllers, Lesson Planner and Paper/Grade contracts.
