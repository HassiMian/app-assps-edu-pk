# ASSPS SaaS Core – live ingress and restricted clone acceptance, 10 October 2026

This is an **executed live Nginx security cutover**, NOT a frontend/backend Marks Entry deployment. GitHub issue #4 governs coordination.

## Exact release provenance
Live frontend: 24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92.
Live backend: 16ab8f346ba27aa6b2e29a8f03c68db32a326cb9.
Verified staged Marks Entry frontend candidate: 39ee8270442f6728f5a2c09c3a75bd8d4eea804e.
Verified staged teacher-scoped backend candidate: 8f4814b67695bfd231a5d70ad67536684d05f843.
No app backend/frontend deployment, SQL migration, database record/marks/fees/paper changes or PM2 restart.

## REAL Nginx security operation, PASS
Prior original live source parity and seven-site snapshot manifest SHA a0bd6bcebb57f0b4831f49c15d38617f61b47bc7e8d95345a195da6445ea945a verified.
New guarded one-shot script ops/security/apply-private-upload-live-cutover-20261010.py DRY_RUN PASS, then --execute PASS exit0.
Four site configs updated, removing five unrestricted /uploads/ filesystem aliases; branding images retain limited public access, private/unknown paths HTTP404.
Rollback-original four config files and SHA manifest preserved at /var/tmp/assps-core-nginx-livecutover-20261010, verified byte-for-byte AFTER cutover.
Syntax nginx -t PASS, graceful Nginx reload PASS, seven-site live alias gate PASS, systemctl nginx active.
Real HTTPS localhost/SNI probes: api private404 root302; app private404 root200; apex private404 root307; www private404 root200. Original apps unmodified.

## Genuine isolated non-BYPASS signed RLS tests
Disposable clone ONLY: 127.0.0.1:55432/assps_core_signed_p7_20261008. Runner ops/security/run-isolated-signed-actor-acceptance-20261010.py asserts exact isolated host/DB and restricted test role, uses cryptographically temporary password without logging or committing it, and restores original NULL password in finally.
For negative legacy BYPASS role escalation, creates clone-only temporary NOLOGIN role then drops it.
Real Node+PostgreSQL signed actor test 13/13 PASS exit0: tenant A versus B, signed HMAC/role/tenant tamper/replay, unsigned access denial, protected secret, 77 FORCE RLS tables. Independent post-test check: test password NULL; temporary legacy role absent.
Assessment Results HTTP clone suite remains FAIL. Initially missing clone SELECT grants; precisely temporary isolated SELECT-grant parity for four tables then REVOKED. Failure then HTTP404 due absent synthetic phase6 assessment result and teacher assignment fixtures (counts zero). Do not convert into green claim.
Paper HTTP clone suite exceeded 27s; no green claim. Clone credentials restored.
This test is NOT production restricted/JWT teacher acceptance. Production inspection account has BYPASSRLS; do not claim production RLS actors certified.

## Release decision
LIVE_PRIVATE_MEDIA_INGRESS=PASS. SIGNED_DISPOSABLE_DB=13/13_PASS.
ASSESSMENT_HTTP_CLONE=FAIL_MISSING_FIXTURES. PAPER_HTTP_CLONE=TIMEOUT.
ACTUAL_LIVE_AUTHENTICATED_JWT_RLS=NOT_CERTIFIED.
FRONTEND_BACKEND_MARKS_RELEASE=HOLD. Marks Entry on live site is still old version.
