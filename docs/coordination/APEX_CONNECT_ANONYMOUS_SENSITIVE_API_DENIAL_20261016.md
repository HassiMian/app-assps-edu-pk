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
- Full local Connect Python suite 178/178 PASS, prior Node 8/8 reviewed-stage negative tests PASS, CI YAML parses. These are QA, not independent external audit or remote CI proof.

## Release and interpretation
- Anonymous 401 checks do not certify tenant RLS, signed per-role claims, real teacher login, genuine peer School2 isolation or database source ownership. Do NOT promote this check to official signed evidence.
- New public role-neutral route and build-identity contract from predecessor remains 3/6 HOLD because old public Build ID ONDwxEIZlx5onDIKY7wYf and dashboard admin login fallback are still deployed.
- The newest externally published verified Core remains e6911732ff52df240390b28b37e531535c58a915. A Core agent separately reported an unpushed local test-only descendant; this Connect QA work does not ingest or deploy it.
- Official signed Core release was last genuinely 6/13/HOLD with seven authentic backup/offhost/worker/grants/peer-denial gates incomplete. Only Core can perform a backed-up rollback-ready production promotion after true external security certification. No student mark changes or release actions occurred here.
