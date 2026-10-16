# APEX Connect — anonymous sensitive API denial acceptance, 16 October 2026

## Scope and ownership
- Connect-only security QA, no Core/Paper/Academic files, database or live runtime changed.
- Base exact published Connect integrated Core-gate commit: a8af0e4382ed2d43b80c65a8ac128e4549115cda.
- Isolated branch: audit/connect-sensitive-api-anonymous-denial-20261016.
- The test does not use school/student data, staff credentials, cookies, JWTs, signed School2 session, POST, redirects or response body inspection. Its purpose is to fail closed if sensitive Connect API endpoints become reachable without any authentication.

## Real live anonymous HTTPS evidence
Origin: https://apex.assps.edu.pk. These exactly six fixed GET paths were inspected using only status and Location, no bodies:
1. /api/saas-admin/subscription-requests/export — HTTP401.
2. /api/saas-admin/apex-leads/export — HTTP401.
3. /api/saas-admin/subscription-requests — HTTP401.
4. /api/saas-admin/apex-leads — HTTP401.
5. /api/school/settings/current — HTTP401.
6. /api/settings/branding — HTTP401.

Actual new guard result: ANONYMOUS_PRIVATE_API_DENIAL_PASS 6/6, exit0. All six checks require exact 401 and no Location header; any 200, redirects, 403, 404, 5xx, network failures, unknown path or spoofing cause HOLD. The six endpoints are read-only GET requests, and no response bodies are captured.

Private evidence: /root/assps-release-evidence/connect-anonymous-api-denial-20261016/denial.json and denial.rc (mode0600). JSON SHA256 77c23c0ba1842eb3e3745a240437fc692936c0ce3d5fce33eb4a62141843241c.

## Implemented safeguards
- ops/connect/verify_public_anonymous_sensitive_api_denial_20261016.py: exact pinned HTTPS origin and six fixed private API paths, default TLS validation, no redirects, GET/no cookies, aggregate status-only output, exit2 on any failure.
- ops/connect/test_verify_public_anonymous_sensitive_api_denial_20261016.py: 12 hermetic tests for six 401s, unknown paths, 200 leaks, cross-origin redirects, 5xx/errors, no auth headers, no redirect-following and no false security certification claims.
- .github/workflows/connect-crossowner-release-contract.yml: both push and PR changed-path triggers, offline regression test step; never traffic to live production from CI.
- Full local Connect Python suite initially 178/178 PASS, prior Node 8/8 reviewed-stage negative tests PASS, CI YAML parses. These are QA, not independent external audit or remote CI proof.

## Release and interpretation
- Anonymous 401 checks do not certify tenant RLS, signed per-role claims, real teacher login, genuine peer School2 isolation or database source ownership. Do NOT promote this check to official signed evidence.
- New public role-neutral route and build-identity contract from predecessor remains 3/6 HOLD because old public Build ID ONDwxEIZlx5onDIKY7wYf and dashboard admin login fallback are still deployed.
- The newest externally published verified Core remains e6911732ff52df240390b28b37e531535c58a915. A Core agent separately reported an unpushed local test-only descendant; this Connect QA work does not ingest or deploy it.
- Official signed Core release was last genuinely 6/13/HOLD with seven authentic backup/offhost/worker/grants/peer-denial gates incomplete. Only Core can perform a backed-up rollback-ready production promotion after true external security certification. No student mark changes or release actions occurred here.

## Extended private stage and official four-phase fail-closed guard

The previously reviewed private optimized Next stage SAsg3cC_el5cq2_nN2a46 was launched as a temporary loopback Next process. The original five anonymous routes and all six private API denials passed as 11/11 PRIVATE_HTTP_PASS, actual process exit0, temporary listener terminated. This is anonymous-only private technical acceptance, NOT a real signed session.

The four-phase Connect release checker now requires an explicit live anonymous_private_apis_denied=true in Phase 1, verified through the independent status-only denial checker. Missing or false evidence blocks Phase 1 even if TLS, marks and build provenance pass. All probes use only GET and read no response bodies. The gate cannot sign security receipts or deploy Core.

Extended hermetic tests cover missing/false Phase 1 denial, sensitive API 401 contracts and invalid redirects. The full Python suite is now 182/182 PASS, private Node allowlist 8/8 PASS, local CI YAML parsed. The official signed Core release remains a separate requirement for independent rollback, authenticated teacher and School2 denial.

## Final fresh persistent receipts

Private Next 11/11 anonymous HTTP proof: /root/assps-release-evidence/connect-anonymous-api-denial-20261016/private-stage-11.json, mode0600, SHA256 4ad0d3d64a8c8731443910253c51cf5a0664bd7a88e303319a68079a6620cdee, companion exit code 0.

Real new mandatory-denial four-phase gate against clean reviewed Core e6911732ff52df240390b28b37e531535c58a915: aggregate status HOLD_NO_PRODUCTION_CUTOVER, official exit2, phase1 PASS (anonymous_private_apis_denied true), phase2 joint technical 13/15 PASS, phase3 official signed 6/13 HOLD and phase4 HOLD. Private JSON /root/assps-release-evidence/connect-anonymous-api-denial-20261016/four-phase-security.json is mode0600 SHA256 680500453292b419be350f64014ba1b2db93803caa10d87529ce7bb9eb07a12b; no credentials or student rows persisted. The outstanding seven independent signer/worker/backup/School2 evidence gates were NOT waived.

No new production deployment, worker transport installation, Nginx/PM2 restart, SQL DML/DDL, student marks reset, external signer fabrication or physical print occurred.
