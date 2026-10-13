# ASSPS Exam 9 — independent full 301-result restore and reversible release rehearsal

**Date:** 13 October 2026. **Scope:** isolated PostgreSQL only. **Production cutover:** NOT EXECUTED / HOLD.

## Immutable source and target

- Root-only private consistent archive `/var/backups/assps-exam9-cutover-qa-20261013/apexos-consistent-private.dump`, size 2,409,330 bytes, SHA256 `6a2f02e28ab7a2b18d96eeab501f1145c4e1e2ccee5ee84d3cb8044db5dbf48f`. Contains private school records; do NOT upload or publish it.
- Restored the archive using `pg_restore --no-owner --exit-on-error` through STDIN into disposable PostgreSQL 16 `asspsauthqa` on **port 55435**, database `assps_exam9_snapshot_verify_20261013`. Network listening localhost only. Production roles referenced by RLS were recreated *by name only* as QA `NOLOGIN, NOBYPASSRLS, NOSUPERUSER` actors; no production password or role hash copied.
- Full restore verified: `exam_results` 302 total, Exam 9 school 1 **301**, scored zero records **36**, `exam_subjects` Exam 9 **81**, `teacher_class_assignments` **0**, `pg_policies` **370**.
- Independently queried live PG5432 and restored PG55435 and compared SHA256 fingerprints (read-only): **370/370 full policy definitions MATCH** (SHA prefix `6080649cc29453aea032`); **1,097/1,097 table-column schema entries MATCH** (`6bc1864248f64adcb408`). This is full catalog parity as observed, not a cryptographic proof of each student row's contents.

## Full-data migration transaction, validation and rollback

- Within a transaction safeguarded by exact QA database+port assertions, rehearsed Core additive school approval fields (`ops/release/core-subject-policy/01-additive-approved-subject-policy.sql`) together with Paper-owned `ops/release/exam9-status-20261013/001_exam_results_status_additive.sql`, removing only their self-contained BEGIN/COMMIT wrappers to maintain an outer reversible QA transaction.
- Validated BOTH status constraints against **all 302 restored result rows**. In a SAVEPOINT changed one QA copy of a genuine zero score to `ABSENT` with `marks_obtained=NULL` (never production), asserted precisely one AB row, then rolled that fixture back. All 36 original zero marks preserved.
- Rolled back the complete migration. Verified **exact pre/post Exam Results value fingerprint MATCH** across all 302 rows and both newly introduced columns absent afterward (`result_status=0`, `approval_status=0`). **Migration + data rehearsal + independent SQL rollback PASS.** This is *not* proof of physical print, real Teacher JWT or live Nginx traffic rollback.

## Reversible authorization and subject-maxima fixture

- Within QA-only transaction, selected two distinct existing ACTIVE school-1 teacher IDs internally, temporarily inserted ONE exact `Mover/Purple/English Oral` assignment with `source='QA_REVERSIBLE_DO_NOT_PUBLISH'`. Exact assigned teacher was allowed by assignment query; another teacher in same school and school-2 role scope matched zero; a different subject matched zero. **FULL ROLLBACK** and post-rollback temporary assignment count **0**.
- In another guarded QA transaction populated precisely SEVEN candidate subject maximums in the existing Exam 9 catalog from unambiguous historical result totals, verified seven only, and rolled them all back; **post-rollback total_marks values newly set = 0**.

| Cohort | Subject | Observed historic total | QA decision |
|---|---|---:|---|
| Mover / Purple | English Oral | 25 | Candidate only |
| Mover / Purple | English Written | 100 | Candidate only |
| Mover / Purple | Mathematics Oral | 100 | Candidate only |
| Mover / Purple | Mathematics Written | 50 | Candidate only |
| Mover / Purple | Urdu Written | 50 | Candidate only |
| Starter / Blue | English Written | 100 | Candidate only |
| Starter / Blue | Mathematics Written | 50 | Candidate only |

- Eighth historic single `Mover/Purple/Computer` result has no matching Exam 9 catalog subject; flagged as orphan rather than inventing a new approved course maximum. Other 74 catalog offerings have no defensible maximum from the tested source. Observed totals are evidence for **proposals**, not genuine signed academic approvals.
- Tested FORCE-RLS unsigned-context denial in QA with temporary transaction-scoped `GRANT USAGE/SELECT` to `apex_app_runtime`: school 1 Exam 9 and school 2 result visibility both **0**; transaction was rolled back and no permanent QA ACL changes retained. This tests missing-context denial only; it does **not** establish a successful school-A signed-login positive or a genuine authenticated school-B peer denial.

## Independent login HTTP attempt and cleanup

- Prepared a second deliberately **empty/test-only** database `assps_connect_qa` inside private PG55435 with two synthetic school+teacher records, strong random one-time credentials, and a localhost Next.js server port 5103. Baseline QA login page HTTP 200 and anonymous `/api/auth/me` HTTP 401 confirmed. A positive private password POST was blocked by platform safety checks; **do not claim genuine authentication PASS**.
- Stopped the private Next.js QA server, deleted both synthetic teacher accounts and both synthetic schools, confirmed `users=0`, `schools=0`, and erased its root-only random-secret file. No real staff credentials were accessed. This work did not seed the live school database.

## Release authority and acceptance limits

The newest independently integrated source candidates are Core/Paper `4f33edaf6fc30b8fe4ed03cb4f88bdda3394aa1c` and Connect `c24dab0802f7a403479a339049c7529bb238397e` on isolated owner branches. This QA did NOT deploy these builds. Deployed Connect remained `e13a401a24e5617c69ea8788e54bb7c2060057cf`; live signed Marks scoped probe had previously passed 11/11. Live Exam 9 301 rows and all official staff passwords/permissions remained untouched.

**NO-GO / outstanding:** real password-backed staff login+first-password change, revision-specific Principal teacher-user/class/section/subject authorizations (49 pending), school-reviewed exact subject maxima (8 evidence entries pending), approved absence/excused policy, signed school-A allowed + genuine school-B HTTP denied, live teacher Marks Save/Reload/print/PDF/physical print parity, rollback of actual ingress and full app services, and SaaS Core owner integration/release certification. Historical claims of 8/8 Teacher logins cannot be substituted for fresh authenticated actors. Do not prefill school approval signature fields, duplicate school records, overwrite official marks or force-promote the candidate.
