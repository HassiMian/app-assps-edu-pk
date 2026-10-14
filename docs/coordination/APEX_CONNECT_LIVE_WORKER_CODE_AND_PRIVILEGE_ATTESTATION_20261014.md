# APEX Connect / SaaS Core — exact live AI worker code and grants certification

**14 October 2026. Source-only and read-only live inspection. No deployment.**

## Problem closed at source level

The earlier Core login-only release gate required a signed worker receipt and
NOLOGIN role to exist, but did not independently prove that the current
production backend actually used the reviewed restricted AI queue adapter
nor that the configured real worker login inherited ONLY the correct grants.
An unsafe release could accidentally pass if a valid signed receipt referred
to an earlier worker configuration but today's backend still ran legacy code.

New explicit mandatory gates in the SaaS Core login-only verifier:

1. **Exact deployed worker code provenance**: independently compare SHA256
   of the actual RUNNING backend source tree under /var/www/apex-backend/src
   for aiQueueWorkerDatabase.js, paperAiQueue.js and opsRoutes.js with exact
   reviewed source files on the canonical newest Core integration branch.
   No startup, reload, code or PM2 mutation occurs. All three must exist
   and be identical before source identity can pass.
2. **Real worker configuration**: require a non-privileged separate worker
   login identifier, correct database name and port, pinned worker role,
   distinct username and presence of private transport configuration.
   Neither employee nor worker passwords are read into evidence outputs,
   displayed, printed or copied into Git.
3. **Actual live PostgreSQL privileges**: a READ-ONLY repeatable-read catalog
   inspection checks NOLOGIN worker role is NOSUPER/NOBYPASSRLS/NOINHERIT,
   worker login can LOGIN without SUPER/BYPASSRLS and inherits only intended
   worker membership, and Green and Green login cannot inherit/member-set
   the worker role. It verifies necessary AI queue SELECT/INSERT/UPDATE
   grants and rejects ALL four effective Green privileges SELECT/INSERT/
   UPDATE/DELETE on each of six unsafe global tables. It rejects ALL four
   privileges to the worker role on organizations, campuses and audit log.
   SQL role name input is strictly allowlisted. No actual worker credential
   sign-in is attempted from this source verifier: a separate genuine
   authenticated worker acceptance receipt remains independently mandatory.
4. **Receipt and true runtime conditions**: preserve existing signed
   peer-school HTTP and unassigned-subject denial, Core-trusted Ed25519,
   signed worker operation, backup, encrypted off-host restore, marks digest
   and scoped rollback gates; no substitution by synthetic fixture.

## Executed evidence

An independent live read-only file check confirmed that the expected
reviewed restricted AI worker adapter is **ABSENT** at its currently deployed
backend path /var/www/apex-backend/src/services/ai/aiQueueWorkerDatabase.js.
The runtime still uses the older unpromoted Core backend. PM2 backend is
online, but existence/health of old service is NOT security certification.

The new Core login-only verifier returns **HOLD** because the code parity,
worker catalog, worker auth receipt, tenant runtime, peer school denial,
trusted key and off-site recovery gates have not passed. It does not
create any credentials, live RLS policy, session, signature or promotion.

Latest new 27/27 adversarial login-only tests PASS (including absence of
real deployed adapter, injected role names, omitted QA secrets, unapproved
worker database ports and forged/replayed worker receipts). Existing Core
catalog/security and integrated source tests are independently retained.

## SaaS Core owner release task

Review forward-port onto latest canonical Core source, provision a genuinely
restricted worker login through established secret custody, promote exact
reviewed backend worker adapter/route dependencies only as part of a
Core-owned and rollback-prepared release. After Core's live migration, rerun
this exact code/privilege verifier with the current deployed artifacts and
perform real separate worker signed request-time acceptance. Only then
consider an independently signed PRE-cutover Next.js+Nginx login-only
switch. Real postflight existing teacher login, signed peer-school denial
and live rollback remain mandatory. Academic approvals/mark publication are
not automatically authorized by a Connect login repair.

**No existing student mark, numeric zero, academic paper, teacher account,
role membership, PostgreSQL RLS rule, PM2 or Nginx service was modified.**
