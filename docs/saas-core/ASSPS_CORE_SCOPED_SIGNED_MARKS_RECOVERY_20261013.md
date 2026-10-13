# ASSPS SaaS Core — Production Signed Marks Release Verification (13 October 2026)

## Authority and release outcome

SaaS Core owns production RLS, release approval and database identity. This document records executed probes, not independent staff acceptance. **Scoped signed Marks routing: read-only technical gates PASS. Full SaaS backend signed conversion and genuine principal/teacher acceptance: HOLD.** No production credentials, user sessions or student records are included here.

## Verified production identities and topology

- PostgreSQL live `apexos` on 5432. All three LOGIN roles (`apexos_user`, `assps_marks_signed_login`, `assps_core_green_login`) have `BYPASSRLS=false`, `SUPERUSER=false` as observed 13 October ~14:00Z. `apexos_user` is still the legacy backend login; removal of BYPASSRLS is not equivalent to full signed-context rollout.
- 78 tables have FORCE RLS (77 signed-guard tables plus separately protected `student_class_movement_audit`); 77 restrictive signed guards and separately scoped login-lookup policies. The live catalog contained 370 total public policies at the backup snapshot.
- Public `apex-backend` on port 5000 remains online, uses legacy `apexos_user` and does **not** configure the three signed tenant-context flags. Do **not** enable these blindly.
- Private `assps-marks-green` on localhost 5091 is online; **actual process environment** uses `assps_marks_signed_login`, runtime role `assps_marks_signed_runtime`, all three signed flags true, and nonempty HMAC/DB credentials. Secrets were neither extracted nor logged.
- Active Nginx maps selected authenticated GET `/api/exams`, GET `/api/exams/grade-settings`, GET/POST `/api/exams/results`, GET detail, and reviewed POST bulk-class-assignment to signed green. Other traffic keeps its host-specific legacy routing; no broad backend promotion was made here.
- Live health probes for 5000 and 5091 returned 200; public app and private green anonymous Marks result reads returned 401; `nginx -t` passed.
- Green process worktree `fix/core-promote-demote-security-review-20261011` at `1b0541af75526b2840e7403bc8193cd1c540a811` (verified clean); main `/var/www/apex-backend` is not a Git worktree, so exact deployed full-backend source commit cannot be certified via `git rev-parse`.

## Recovery and rollback executed

1. Fresh protected production database archive (`pg_dump -Fc`) and PostgreSQL globals SQL were created at `/root/assps-release-backups/core-signed-oct13-2026-final/`, mode 0600, SHA256 both verified. Do **not** publish these files; globals may contain password hashes.
2. Fresh network-disabled PostgreSQL 16 cluster on disposable port 55433, with synthetic NOLOGIN NOBYPASSRLS global role names and *no production passwords*, restored the archive. Initial existing 55432 recovery attempt encountered missing `assps_core_green_runtime`; that incomplete disposable attempt was not counted as a pass and was deleted.
3. Independent restore on 55433 matched live **370/370 policy definitions** (fingerprint `6080649cc29453ae`) and **1,097/1,097 table-column schema entries** (fingerprint `612dd19218f43152`).
4. In the disposable restored DB only, a transaction rehearsed 77 restrictive policy roles: single-role baseline -> two-role V2 addition -> SAVEPOINT rollback -> full ROLLBACK. Each 77-policy stage was asserted and post-rollback policy fingerprint matched (`c8633aeaed252c4d`). **This proves a controlled policy-membership transaction rollback, NOT comprehensive real HTTP/network/credential rollback.**
5. The entire private 55433 cluster and our incomplete QA database in 55432 were removed after evidence collection. Existing 5432/55432 services and school data untouched.
6. The preexisting signed isolated test harness (55432) was rerun: assessment-next 1/1, paper-next 1/1, marks-next 1/1, db-next 13/13 passed, temporary QA login password reset to NULL and test BYPASS target absent.
7. New reproducible read-only gate `ops/release/verify-scoped-signed-marks-live-20261013.py` passed all 11 technical checks; prints explicit staff/full-app holds and never claims certified signed HTTP actors.

## Outstanding release gates — MUST NOT be waived

- Browser reached `https://app.assps.edu.pk/login`, not an authorized staff session. **No genuine Principal or Teacher sign-in/password-backed JWT session available here**; therefore authentic authorized-school positives, cross-tenant denials and real Marks Save → Reload → Result Card → Print are not certified. Prior `jsonwebtoken.sign()` fixture tests simulate tokens and are NOT substitutes for genuine login.
- Full production backend still reports signed flags NOT_CONFIGURED and uses the legacy login (though NOBYPASSRLS). Its independent secure cutover, route migrations, startup compatibility and production acceptance are not certified.
- No independently proven live Nginx rollback during signed staff traffic, no post-switch full-app authenticated regression or Paper owner sign-off. The 77-policy QA transaction rehearsal must not be represented as full-scale blue-green rollback acceptance.
- Source ancestry and production frontend/backend physical build provenance need SaaS Core validation; protect the concurrently dirty Paper-owned worktree and all school academic records.

**Decision:** retain currently working signed scoped Marks route, do not force-disable the legacy login, do not promote the entire backend, and do not claim production full-release certification until genuine principal/teacher, peer-school, Paper/Marks regressions and a live-safe switch/rollback plan pass under SaaS Core control.

## Nginx rollback evidence supplement (~14:11 UTC)

- Historic `firstterm-20261011T1430Z/nginx-app-before-firstterm.private.conf` was found to be a symbolic link to a live config path, **not** a self-contained immutable backup; do not treat that historical path as a reliable old-config restore.
- Created fresh private **real-file (non-symlink)** snapshots of current `apex-app-ssl`, `apex-api-ssl`, and `assps-firstterm-app-maps.conf` under `/root/assps-release-backups/core-signed-oct13-2026-final/nginx-snapshot/`, restrictive 0700/0600 permissions, each SHA256 verified. These are current-state recovery copies, **not** an approved previous ingress baseline for a traffic switch.
- Existing signed-bluegreen Marks ingress configuration contract tests: **8/8 PASS** (`ops/release/signed-bluegreen/nginx/test-marksonly-ingress-contract-20261011.py` in the Core rehearsal owner worktree). Active `nginx -t` remains green. No Nginx reload/route change performed.
- True live rollback requires exact one-service routing demotion and principal/teacher authenticated verification; generic full-config restore may overwrite unrelated Oct13 frontend/login hotfixes and must not be used.

## Authentic staff login requirement and rejected false-positive certification (13 Oct, ~14:27Z)

- Live browser automation showed the real school login page but could **not** establish a reproducible, authenticated Principal or Teacher `/api/auth/me` response. Normal Windows Chrome has an `app.assps.edu.pk/paper-generator` tab; a visible URL **does not** prove its cookie is valid. Attempts to verify `/api/auth/me` from that GUI did not produce trustworthy parsed actor identity, so **no role acceptance was asserted**.
- The concurrently untracked `ops/release/core-infrastructure/certify-genuine-signed-session-acceptance-20261013.cjs` in another dirty Core/Paper worktree calls `jwt.sign` with a protected deployment secret to create `principalToken`, `teacherToken` and peer tokens. This is useful at most as a synthetic authorization simulation, **NOT** a password-verified real sign-in. It MUST NOT be used as genuine staff approval evidence; the other owner's dirty worktree was not modified.
- Added independently isolated `ops/release/certify-genuine-staff-login-20261013.py`, designed for execution by authorized school staff using **only an interactive trusted SSH terminal**, requiring hidden user-entered real passwords (never passed through command arguments, stored in Git, printed, or shared in chat). It POSTs each account to the actual HTTPS `/api/auth/login`, validates the **server-returned** token and actor via `/api/auth/me`, tests distinct Principal/Teacher same-school identities, public and private green read-only Marks paths, and denies a tampered token. Full peer-school evidence requires a distinct authentic authorized peer-school account; it never writes Marks or uses `jwt.sign`/`JWT_SECRET`/HMAC signing configuration.
- Standalone verifier has five deterministic source/behavior contract unit tests PASS. Running the real verifier without a private interactive staff terminal resulted in **`BLOCKED_AUTHORIZED_INTERACTIVE_STAFF_LOGIN_REQUIRED` exit 2**, not a fictitious pass. The gate must be run using authenticated authorized actors; any failed or inconclusive check keeps release on HOLD. Genuine Marks *write/print* acceptance remains a separate controlled owner/staff workflow.
- For operators: execute `python3 ops/release/certify-genuine-staff-login-20261013.py --require-peer` from the isolated worktree in an interactive trusted SSH session with staff individually entering their passwords privately. **Do not share any passwords, tokens, browser cookies, or signed acceptance credentials in ChatGPT or GitHub.** `--no-peer` is explicitly partial and exits 2, never full-tenant certified. Ensure genuine teacher/principal account owners consent to testing and account ownership is documented before running.
