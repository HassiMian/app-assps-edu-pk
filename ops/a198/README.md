# ASSPS A198 — Live Saved Papers / Assessment Studio continuity certification

Date: 2026-11-05
Live application: https://app.assps.edu.pk/paper-generator
Production root: /var/www/assps-releases/diary-a195-controller-cert-20261104
Decision: retain live Unified Saved Papers V5; prohibit a stale-source downgrade.

## Verified live facts

1. The index importmap points to SavedPapersTab-ASSPS-UNIFIED-RECOVERY-v5-20261031.js. The live version has three sources:
   - locally saved browser papers;
   - authorized Paper Vault at /api/portal/paper-studio/library;
   - server-revision assessments at /api/assessment-studio/papers.
2. Headless Chromium loaded the ACTUAL live production UI with mocked authentication and API fixtures. Saved Papers displayed a synthetic Second Term Assessment 4, a synthetic Vault paper and local browser papers. Zero browser page errors. This does not prove a real authenticated principal save.
3. Both server list endpoints return 401 for unauthenticated callers.
4. Read-only school_id=1 database snapshot: assessment_papers has 4 papers, all with saved revisions; paper_vault has 14 (8 draft, 6 approved). Class 3 Second Term Assessment 1 exists in Vault. Titles matching Assessment 4/5 not found; this cannot rule out differently named or browser-only drafts.
5. Assessment offline queue recovery: 6/6 test cases PASS, including concurrent replay, revision conflict and staff/school identity switching.
6. A separately tested source candidate adding server draft listing was not deployed because it omits the newer live Vault recovery and would regress Saved Papers.

## Deployment guard

Canonical main and recoverable A195 source are behind the live Unified V5 module. This update adds a fail-closed second preflight to ops/deploy-production.ps1, alongside existing A197 Diary protection:

- node ops/a198/check-saved-papers-continuity.mjs before frontend build;
- same guard with --dist before actual frontend promotion;
- verifies browser, server, Vault and active routed Saved Papers JS assets, not orphaned historical files;
- does not pin a specific asset hash; backend-only deploys are unaffected.

Observed: live Unified V5 module PASS; stale rebuilt candidate BLOCKED; old main BLOCKED; adversarial new guard test 1/1 PASS; existing A197 guard test 1/1 PASS.

## Limitations

No production frontend, backend, database or student record was modified. No claim that actual Assessment 4/5 was recovered: no matching named server record in checked school tables. Real principal/teacher Save-Reopen acceptance remains necessary to identify local-only drafts. SaaS Core must forward-port LIVE V5 source before future broad frontend deployment.

GitHub review branch: safety/a197-diary-release-continuity
Review URL: https://github.com/HassiMian/app-assps-edu-pk/compare/main...safety/a197-diary-release-continuity?expand=1
