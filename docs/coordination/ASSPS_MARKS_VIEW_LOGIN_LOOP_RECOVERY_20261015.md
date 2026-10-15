# ASSPS Examination Marks Review — 401 Login Loop Recovery

Date: 15 October 2026. Production endpoint: https://app.assps.edu.pk/exams/marks/review.

## Verified root cause

Nginx logs recorded a successful POST /api/auth/login HTTP 200 on the primary backend, followed by GET /api/exams?include_subjects=1 HTTP 401 from the independently provisioned marks-green backend on port 5091. The global Axios interceptor treated that one endpoint rejection as proof of total session expiry, erased school credentials in local browser storage and redirected to /login. The green/primary JWT signing secret matches; the alternate green context rejects the current principal authentication flow. No password reset or temporary hardcoded JWT was needed.

## Scope of live repair

The app-host Nginx marks GET maps now select the same host-specific legacy/primary authenticated upstream as login, while POST routes and API-host behavior remain outside this hotfix. Nginx config validated and was atomically reloaded. A postflight request to /api/exams reached the primary backend and did NOT increment the green-backend request counter.

MarksRegister read-only catalog and results GETs now opt into endpoint-scoped handling of 401: display an error without erasing the login session or printing unverified scores. Other frontend 401 cases continue their existing normal logout rule; API permissions and authentication are not bypassed.

Active frontend: /var/www/assps-marks-loginloop-recovery-20261015, index SHA256 ddb923aaa3157b90a53b9c2aa94b12e612d911c02bcb1baaf683100fb8de1b33. Earlier production static files: 481/481 preserved except versioned entry index; 61 new hashed files added. Previous Nginx config and entire static archive retained at /root/assps-release-backups/marks-view-login-loop-20261015. Authenticated physical printer acceptance remains operator-owned.

## Permanent regression gates

The versioned Nginx maps must preserve login-compatible GET on catalog, grade settings, results collection and detail; the historical green-only ingress unittest now enforces the corrected contract, and CI runs it on changes. The guarded Core frontend rollout rejects both versioned and live Nginx maps that reintroduce GET into the old green backend. Browser QA tests 4/4 pass: scored zero, ABSENT, print, unauthorized data denial, and 401 for both catalog/results retaining a session. Active Diary controllers remain 11/11; Marks Register active compiled module PASS; app/API health HTTP 200.

No production marks, results, student records, backend, exam grade scheme, or academic approvals modified. Principal audited score edits and full-stack Core signed worker/security certification remain separately held; do not certify them from this login hotfix.
