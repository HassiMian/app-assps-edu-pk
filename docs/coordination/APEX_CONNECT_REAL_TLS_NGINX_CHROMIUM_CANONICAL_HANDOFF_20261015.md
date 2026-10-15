# APEX Connect — independent real TLS ingress/browser cutover QA (official handoff)

**Date:** 2026-10-15 PKT. **Status:** Source verified and real isolated HTTPS
acceptance PASS; genuine production teacher+tenant+Core release remains HOLD.

## Scope, provenance and concurrent-agent safety

- Reviewed standalone role-neutral Connect Next source parent:
  492429340504224a8984a33403d585c747d38fde.
- Earlier stand-alone real Chromium and anonymous public guard source child:
  de5aaa651727dca1068dd0036f4fb8bb78f7aca6.
- NEW standalone strict TLS/private Nginx/Next/Chromium acceptance source child:
  e1c2a060e99a97d28599a8115b307ed44103a32d.
- The standalone Next repository's origin is LOCAL (not GitHub). The official
  canonical GitHub branch publishes an exact source patch and this handoff,
  rather than misleadingly calling the local Next commit a GitHub push.

Exact four-file independent source patch:
docs/coordination/APEX_CONNECT_PRIVATE_HTTPS_BROWSER_20261015.patch

SHA256:
f382a05487228967e1740a5f1364f9b28fef3e4bbc157eb99202a6cc2429b79a

The patch applies with git apply --check to the precise Next source parent
de5aaa651727dca1068dd0036f4fb8bb78f7aca6; it MUST NOT be applied to
the canonical SaaS Vite frontend or used to overwrite concurrent source.

## Real observed executable tests

The reviewed actual built Next artifact is BUILD_ID
aMD_UNZVOSO2lpyRO0-RO. It runs privately on 127.0.0.1:3016.
A temporary independently configured actual Nginx routes PRIVATE loopback
127.0.0.1:3017 with HTTPS to the compiled Next candidate. The Nginx
configuration references the actual public Let's Encrypt certificate/key
read-only, with no copied private key. OpenSSL independently validates the
certificate matches api.assps.edu.pk and has more than 24h validity.
Chromium rejects TLS errors (ignoreHTTPSErrors=false), and maps port3017
api.assps.edu.pk to private localhost only. Every other browser origin
request is aborted, with no real employee browser cookie/session/password.

ACTUAL repeated end-to-end acceptance **9/9 PASS**:
- Actual Nginx SSL syntax+real certificate+HTTP200 login.
- Browser loaded private HTTPS endpoint with a verified certificate.
- Legacy anonymous dashboard -> role-neutral login, no admin.
- Nested dashboard -> role-neutral login, no admin.
- Protected teacher route -> login.
- Teacher login next preserved as /teacher, not /admin.
- Anonymous identity endpoint HTTP401.
- No uncaught browser JavaScript exceptions.
- Actual private-only browser network requests, with all outside requests
  blocked. Latest run 64 private requests and 4 external requests aborted.

Another 12/12 fail-closed TLS source guard tests PASS: exact reviewed
source/build pins, private-only listeners, strict TLS, no external requests,
no staff credentials, cleanup process-group guarantees and role-safe routes.
Previously published public guard 10/10 PASS. Private ports 3016 and
3017 both closed after cleanup; no public Nginx reload, PM2 restart,
PostgreSQL DDL or school record write.

## Real public and Core release status

A separate operator already promoted public Next to the older reviewed
BUILD_ID ONDwxEIZlx5onDIKY7wYf. It is NOT the newer role-neutral binary.
Actual public /dashboard and /dashboard/history still redirect an unknown
actor to /login?next=/admin. /teacher retains next=/teacher, and
/api/auth/me returns 401 anonymously. Our new read-only public guard
properly returns HOLD until the specific compiled role-neutral source
is reviewed and promoted by SaaS Core.

Core independently reports real live Green six-global DML denials, Blue
privileges preserved, 77 signed tenant guards, and separate actual
production AI worker SCRAM authentication with restricted queue access.
But the RUNNING backend still lacks the exact reviewed worker adapter;
an isolated candidate is not a production supervised worker service.
Independent genuinely authenticated existing staff teacher password
challenge/relogin, cross-school/subject live negative requests, trusted
independent release receipts and actual live traffic rollback have not
been certified. Updated encrypted offsite copies and current rollback
artifact proof are controlled by SaaS Core. No synthetic actor or
institutional signature may replace those requirements.

The full production release must be ONE Core-owned atomic Next+Nginx
login-only transaction with pinned current source and current Blue backup,
an authentic preflight release, and genuine postflight teacher/tenant
acceptance plus rollback. Never auto-publish academic results or change
any existing marks. Latest school1 Exam ID9 check: 1,762 real scores,
213 numeric zeros, original fingerprint intact. This source completion
is NOT approval to flip public traffic.

**Actual changes from this mission:** standalone QA source and evidence
only, published on an isolated GitHub coordination branch; zero production
data/backend/ingress changes.
