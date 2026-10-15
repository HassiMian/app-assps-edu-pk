# APEX Connect — exact role-neutral compiled browser QA and public routing gate handoff

**15 October 2026 (Asia/Karachi). Production rollout status: HOLD.**

## Source and ownership

Previously reviewed role-neutral Connect standalone source commit:
492429340504224a8984a33403d585c747d38fde.

New complete QA/hardening child, isolated standalone local source commit:
de5aaa651727dca1068dd0036f4fb8bb78f7aca6.

The standalone repository remote points to another local workspace, NOT GitHub.
Its five-file exact source delta is published to the official GitHub repository
through the coordination-only PATCH file below, not as an invented GitHub
standalone commit:

docs/coordination/APEX_CONNECT_ROLE_NEUTRAL_RUNTIME_20261015.patch

SHA256 of patch:
815e1718da76e13504e304abc85b7c1cf508e7b68bfe015d22a789e55b608df8

Git apply --check against the exact source parent 4924293: PASS. Do not
apply this standalone Next.js patch to the unrelated SaaS Vite frontend.

## Actual execution and regression tests

- Actual compiled role-neutral Next.js candidate has BUILD_ID
  aMD_UNZVOSO2lpyRO0-RO. The private Next server was started on localhost
  port3016 without touching PM2 or public Nginx.
- A REAL Chromium instance pinned api.assps.edu.pk:3016 to localhost only.
  Browser transport automatically blocked every off-host request; no
  school session, password, or protected student record was supplied.
- Real compiled browser 8/8 PASS, multiple runs: dashboard anonymous to
  login without administrator bias; nested dashboard safe; teacher route
  preserves teacher login target; actual login HTTP200; no uncaught JS;
  real private origin requests only (final 60 private requests, four
  external requests blocked).
- Discovered and fixed QA runner orphan process issue: Next.js 16 spawns
  child next-server that outlived original launcher kill. Revised runner
  launches private process group and cleans whole group. No listener3016
  remains after regression runs.
- New public read-only fail-closed routing verifier and 10 adversarial
  source tests PASS. Existing reviewed role-neutral routing source10/10
  PASS. All source tests are distinct from authenticated teacher acceptance.

## Public release diagnostic

At time of verification the public Next BUILD_ID is
ONDwxEIZlx5onDIKY7wYf, installed by a separate concurrent operator.
Anonymous public /dashboard and /dashboard/history redirect to login
with next=/admin; /teacher -> /login?next=/teacher and anonymous
/api/auth/me HTTP401. New public guard reports **HOLD: 3 of six checks
FAIL**: wrong compiled role-neutral build plus two admin-biased redirects.

Even a future public 6/6 anonymous route pass will NEVER claim actual
teacher session acceptance, signed independent peer-school/subject denial,
production worker adapter, or completed live traffic rollback. The tool
expressly refuses to certify the live production release.

## Core coordination and release limits

Latest SaaS Core owner independently reports current SIX inherited Green
DML globals denied, preserved Blue rights and a real production separate
AI worker SCRAM query/negative organization authorization. Current running
backend still lacks the three reviewed restricted worker modules; staged
backend candidate is not an authenticated live service certification.

The owner also verified encrypted off-VPS backups and a technical Ed25519
trust root, but genuine independent signing receipts, real existing teacher
password challenge/re-login, peer-school and unassigned-subject HTTP denial,
actual signed current backup restore and post-traffic rollback are missing.
No self-issued reviewer signature or school-staff impersonation was used.

SaaS Core must forward-port reviewed role-neutral Next source onto the ACTUAL
current Next baseline and review the running backend worker migration,
produce real authorized signed/role/tenant evidence, and execute a ONE-STEP
rollback-capable Next+Nginx login-only release only when all genuine PRE
gates pass. The POST release must prove genuine staff sign-in, distinct
peer tenant negative and safe traffic rollback, then verify school marks.

The live SaaS has official Exam ID9 1762 real scores and 213 genuine numeric
zeros. They remain protected and were never written by this mission. No
production Next/Nginx, PostgreSQL roles/RLS, PM2, staff password or school
academic record change was made by these Connect-owned QA additions.
