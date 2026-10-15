# APEX Connect — independently checked offsite restore & reviewed first-login QA

**Date:** 15 October 2026. **Scope:** Connect-owned source-only tests and fail-closed release evidence. **Production deployment:** NOT performed.

## Source baseline and boundaries

Based on current reviewed Connect branch `ops/connect-current-live-role-neutral-ingress-20261015` at exact remote SHA `98f6dfcff72fbe9d46d227d5c1200d388300d3d5`. Work is isolated in `ops/connect-offsite-proof-failclosed-20261015`; canonical SaaS/Paper/Grade branches and active backend remain untouched. The reviewed private Next candidate tested is `/root/assps-release-candidates/apex-connect-login-challenge-current-live-20261015`, private BUILD_ID `rc1vIlE6prAQ8pHrw7ohX`. Production remains `ONDwxEIZlx5onDIKY7wYf`.

## Completed new implementation

1. `ops/connect/verify_offsite_restore_receipt.py`: check current production BUILD_ID; actual runtime and dependency archive streaming SHA256 against saved manifests; independently generated all-file manifest and Windows CYBERSPACE receipt; exact file counts; reject malformed/dangerous paths, duplicates, stale/missing/forged evidence and unexpected official Core status. Expose technical PASS separately from human/release status. **A machine-generated unsigned receipt is not a cryptographic reviewer signature.** `--production-release-gate` always exits 2, including when all byte-integrity checks PASS. Never deploy, alter credentials, or write SQL.
2. `ops/connect/test_verify_offsite_restore_receipt.py`: 15 positive/negative disposable QA cases.
3. Reconciled outdated `test-current-live-role-neutral-20261015.cjs` invariant: the candidate's reviewed LoginClient, change-password and auth-user modules are intentionally changed, so they must NOT equal old Blue. Only unrelated teacher-assessments source is required to match production exactly; first-login security is tested separately in existing six+seven tests.

## Tests executed on actual pinned private Connect candidate

- Offsite evidence verifier regression: **15/15 PASS**.
- Role-neutral source and unrelated assessments preservation: **13/13 PASS**.
- First-login Axios HTTP401 boundary: **7/7 PASS**.
- Reviewed temporary-password/security boundary: **6/6 PASS**.
- Public anonymous routing fail-closed adversarial tests: **10/10 PASS**.
- **Total 51/51 PASS** (distinct scopes). No genuine institutional sessions were simulated as actual users.
- Actual latest offsite evidence: original and CYBERSPACE hashes match, **2,977/2,977 regular-file SHA256 matches**; the single Linux symlink cannot be recreated by Windows tar, so full Linux runtime was separately restored/tested on VPS only.
- Official `--with-core-gate`: current reviewed candidate technical **20/20 PASS**, official production **HOLD/exit2**. Verified local new offsite checker yields `technical_status=PASS`, `production_release_authorized=false`, **exit2** when release gate requested.

## Actual production security status

- Public dashboard still redirects anonymous `/dashboard` to `/login?next=/admin`. Private candidate source correct, **not deployed**.
- Restricted worker adapter is **absent** in live backend despite actual disposable real PostgreSQL SCRAM Node worker integration **8/8 PASS**. Isolated QA never certifies live service.
- School reported staff/principal/School-2/physical printer checks completed. Report is owner-stated and confidential, but no independently reviewer-signed receipt identified. Do not demand repeat routine practical walkthroughs.
- Current teacher password-change-required flag still true on inspected account; no real credential or user change made. Independent peer-school denial/worker transport signoff still pending.
- Latest read-only School1 Exam9: **1,762 results, 213 genuine numeric zeros, 0 NULL**. None were modified.

## Official release authority and next actions

SaaS Core owns final reviewed rollout. The official six blockers (offhost signed current recovery, restricted signed transport, deployed exact worker, separate authenticated service, live worker effective privileges, independently signed peer-school/subject denial) are NOT waived by this source-only QA. After the genuine receipts are validated by the existing Ed25519 trust policy, Core may reconcile latest current Paper/Diary/Grade+Connect sources, run scoped security tests, and execute transactionally reversible Next/backend/Nginx cutover with real postflight and rollback. This patch does not change public services, roles, DB, marks, passwords, or signed receipt intake.
