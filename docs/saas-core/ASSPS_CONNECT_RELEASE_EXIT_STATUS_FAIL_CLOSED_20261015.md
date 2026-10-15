# ASSPS Connect — release exit status fail-closed correction (15 Oct 2026)

## Real defect fixed, no public deployment

Existing joint read-only preflight `verify-joint-current-candidates-20261015.py --with-core-gate`
returned process exit **0** when its OWN JSON contained Core `status=HOLD`,
six missing real signed release prerequisites and `overall_production_release=HOLD`.
A CI/release worker that checked only exit code could incorrectly promote a
non-certified production version. This is an actual release gate defect.

This isolated review branch changes only the combined gate's process exit semantics,
not the official Core verifier, actor identity, database permissions, worker
source, deployed frontend, production Nginx, or approved canonical school data.
`release_exit_code()` explicitly preserves exit 0 for **source-only**
technical checks without `--with-core-gate`; every call made with the
official production-gate option returns exit **2** while this tool has
unverified real staff, peer-school, independent reviewer and live traffic
evidence. Even a forged upstream `READY` string cannot erase the deliberate
overall HOLD status; this source-only tool never grants approval.

## Repeated executable evidence

- Source-only candidate: 20/20 exact reviewed backend/Connect version,
  latest Weekly Notebook route, credentials-exclusion and backup artifact
  checks PASS; output `overall_production_release=HOLD`, CLI exit 0
  **SOURCE QA ONLY**, never release permission.
- Official-Core-gate mode: SAME 20/20 technical PASS; official Core
  `status=HOLD`, `exit_code=2`, six explicit production blockers;
  overall `HOLD`, NOW command exit **2**, correctly fail-closed.
- Adversarial regression suite: 21/21 PASS, including six new exit-contract
  tests for source-only success, official HOLD, forged upstream READY,
  missing source parity, missing decision and false claimed production READY.
- Live protected school1 Exam9 result baseline verified read-only:
  1,762 real rows, 213 actual numeric zeros, 0 NULL; historical
  301-row MD5 `bcdc098a3e6cabb6f4c31736b14e39b9` unchanged.
- Exact live Next build `ONDwxEIZlx5onDIKY7wYf` still deployed,
  reviewed worker adapter ABSENT, current Lesson Plans route unchanged
  SHA256 `435cf755904dcd7fdf74189d5a99d267b8ace98a6627c9180a2375e9dfaaf74f`.
  Both full-ACL database and roles archive SHA256SUMS OK; private testing
  ports 3016/3017 closed.
- Current compiled **private** Connect candidate is
  `rc1vIlE6prAQ8pHrw7ohX` from source Connect
  `98f6dfcff72fbe9d46d227d5c1200d388300d3d5`.
  Core reviewed parent `2782179f6ed0d3658ed8d7025cd5a7908b7ebdd0`;
  last combined base `ec52577b0b25271e14802e67a9b7355c40fdd178`.

## Explicit remaining genuine release gates

SaaS Core retains final authority. Existing Muhammad Imran must personally
perform school-issued first login, temporary password change and authenticated
relogin. Independently authorized existing School2 and School1 reviewers must
confirm genuine HTTP tenant/subject-denial without writing official records.
Reviewers must independently approve and cryptographically sign current
build-bound worker, off-VPS recovery, baseline/rollback and production
acceptance receipts; owner-laptop request delivery is currently UNSIGNED.
Core must then certify running restricted worker, traffic-isolated backend,
versioned public Next+Nginx rollout, protected records and actual rollback
rehearsal/postflight. None of these human actions can be replaced by source
QA, synthetic Chromium, fixture JWTs, copied hashes or this document.

**Production release: HOLD.** No PM2 restart, Nginx reload, staff
password/credential manipulation, student-record write, deployment or
mock signing performed by this patch.
