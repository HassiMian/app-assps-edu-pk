# APEX Connect + SaaS Core | Integrated live-readonly acceptance | 15 Oct 2026

**Decision: HOLD. No public promotion.** This is a verified combined mission
checkpoint, not independent authenticated staff/tenant acceptance or a release
signature. Source branch `fix/core-ai-worker-lazy-blue-import-20261015`, parent
`dad9778e8cd5ea8564e5b9de640204e2f9eb9100`.
Coordination authority: [issue #4](https://github.com/HassiMian/app-assps-edu-pk/issues/4).

## Exact live state observed

- VPS `srv1769723`; production Next BUILD_ID `ONDwxEIZlx5onDIKY7wYf`.
- Public anonymous `/dashboard` and `/dashboard/history` remain admin-biased
  (login `next=/admin`). `/teacher` retains `next=/teacher`, unauthenticated
  `/api/auth/me` HTTP 401. `nginx -t` PASS.
- Running backend: reviewed restricted `aiQueueWorkerDatabase.js` ABSENT.
  Current Lesson Plans route SHA256
  `435cf755904dcd7fdf74189d5a99d267b8ace98a6627c9180a2375e9dfaaf74f`.
- Reviewed private role-neutral Next source
  `492429340504224a8984a33403d585c747d38fde`, compiled private
  BUILD_ID `aMD_UNZVOSO2lpyRO0-RO`, **not public**.

## New reconciled backend engineering and tests

- Derived isolated root-private candidate from current live backend:
  `/root/assps-release-candidates/apex-backend-live-merged-ai-worker-20261015`.
  Overlaid exactly `aiQueueWorkerDatabase.js`, `paperAiQueue.js`, and
  `opsRoutes.js` from reviewed Core source, plus a narrow lazy Blue-DB import
  correction. Byte-preserved current `server.js` and recent
  `lessonPlanRoutes.js`; not installed on public running backend.
- Why fix: eager `require('../../config/database')` prevented the Green worker
  from independently initializing, throwing
  `DB_SIGNED_TENANT_DEPENDENCY_REQUIRED` with separate real credentials.
  Green now never eagerly imports legacy tenant connection; Blue loads it only
  when executing its existing fallback. Module syntax PASS, two Node behavioral
  tests (Green/Blue boundary) PASS.
- Actual restricted **production SCRAM worker** query (read only) PASS;
  forbidden SELECT on `organizations`, `campuses`,
  `admin_block_audit_log` each denied SQLSTATE 42501. No queue writes.
- `verify-current-live-merged-worker-20261015.py` reuses official Core live
  verifier but rebinds exact reviewed merged stage; all reviewed module parity,
  current server/lesson route preservation, root-private credentials, production
  worker SCRAM and deny checks PASS. Four adversarial fail-closed overlay
  tests PASS. It intentionally reports **public integration HOLD**.
- Existing credential-free Muhammad Imran **school1 employee record** metadata:
  exactly one existing linked active employee/user, role teacher/teacher,
  tenant and username binding, credential-present flags PASS. Existing temporary
  password challenge expected. This did NOT authenticate, change, read or reset
  the staff password and is NOT genuine login/relogin evidence.

## Next and release security

- Reviewed Connect role-neutral / temporary login / redirect / logout and teacher
  tests: **40/40 targeted source/isolated assertions PASS** (6+10+19+2+3).
- Previously reviewed private actual HTTPS Nginx->Next->Chromium:
  **9/9 PASS**, 65 private browser requests, 4 off-host requests blocked;
  private test ports 3016/3017 cleaned; no real staff cookie used.
- Fresh **public** role-neutral verifier correctly **HOLD 3/6**: wrong compiled
  build and both dashboard admin-bias redirects. Teacher redirect and anonymous
  auth/me safeguards pass.
- Official Core production login-only verifier, invoked with reviewed
  proxy SHA256 `483453116d266915fc50d3183971b0ee4c277c7c011a55316bc89ce6d220dbdf`
  and reviewed private Next build, correctly **HOLD**. Specifically blocked:
  independent offhost current recovery; running signed transport; reviewed
  worker deployment; separated running global worker; worker role/grants runtime
  acceptance; genuine signed peer-school and unassigned-subject HTTP denials.
  It also requires an authentic existing staff password change and relogin.
  Source-only tests never substitute for real signed actors.

## Protected academic data and rollback evidence

- Real live PostgreSQL **read-only**: school1 Exam9 1,762 existing score rows,
  213 real numeric zeros, unchanged historical 301-row MD5
  `bcdc098a3e6cabb6f4c31736b14e39b9`. Missing-score blanks were not altered.
- Current full-ACL database dump and no-password roles
  `/root/assps-release-backups/core-login-ond-post-worker-20261015/`:
  `sha256sum -c SHA256SUMS` PASS.
- Current OND Blue Next + Nginx archive:
  SHA256 `844430b88e1b12906ef00945f8a382a69905f5a0a05727e35e0729452466947e`;
  historical isolated restore was reported PASS. Current encrypted owner recovery
  envelopes have NOT been independently transferred/decrypted on CYBERSPACE.
  Windows desktop is STANDBY; no offsite reviewer signature may be invented.

## Ownership and release decision

SaaS Core alone merges/deploys production shared backend, RLS, Next and Nginx.
Prior to any traffic change it must certify current deployed ancestry and
worktrees, peer-review the restricted worker patch, authenticate genuine existing
teacher temporary-password change/relogin, independently verify existing
peer-school/unassigned-subject signed HTTP denials, prove current encrypted
offsite extraction and independently signed rollback acceptance, and run
same-transaction Next+Nginx public postflight with executable reversal. Do not
overwrite newer Paper Studio/frontend changes. Never extract staff passwords,
use synthetic actors as institutional signers, change academic marks, reset
users, or mark release GO from source-only browser/SQL checks.

**No live DB writes, grants, staff resets, PM2 reload, or Nginx traffic changes**
were executed by this integrated verification. The fail-closed HOLD is a security
result, not completion of the public release.
