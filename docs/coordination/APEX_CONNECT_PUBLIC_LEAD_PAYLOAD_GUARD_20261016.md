# APEX Connect public lead payload safety — 16 Oct 2026

## Ownership, baseline, production
Connect-only isolated local Next source `fix/connect-public-lead-payload-guard-20261016@c47edc0c8bf18d93a7b4daecd15ffc12f1ba47b9`, based on previously reviewed `9c2e34c2fe988cf01dd1a679f42654e278473f07`. Standalone Next repo has **no GitHub remote**: exact immutable reversible **two-file source patch** and SHA256-pinned manifest are carried here on a descendant of the previous published Connect branch `4438615665a85240f5f759cef208fa900d642705`. Neither source nor GitHub coordination patch is automatically deployed.

## Identified weakness and bounded repair
Public APEX lead POST previously accepted null/array/object-typed fields, arbitrary nested `extra`, and oversized values before persisting JSON and attempting SMTP. An unexpected null body caused an unnecessary HTTP 500; objects coerced to strings could reach notifications. New Connect-only guard validates object JSON, individual text field types and maximum lengths, extra object string fields, and a **16,384-character parsed-JSON** upper bound. It rejects invalid shapes with 400/no-store and oversized JSON with 413/no-store **before file/email operations**. Valid legacy contactName/ownerName/contactNumber, numeric studentsCount and bounded extra remain accepted. Success and missing-field responses now use explicit Cache-Control no-store. Existing typed business statuses and authorization code are unchanged. No production data accessed.

**Limitation:** this is *post-parse* JSON validation, **not** a streaming ingress/body-size cap, distributed rate limiter, bot control or multi-process deduplication. Infrastructure-level payload caps and abuse safeguards require separate reviewed rollout. It also does not certify SMTP deliverability.

## Actual tests & build evidence
- Node22 genuine TypeScript-transpiled synthetic route-handler tests, four CJS suites: **39/39 PASS**, exit0; includes old routes and five new payload-boundary cases.
- Scoped ESLint `src/app/api/apex/leads/route.ts`: exit0.
- First isolated Next16.2.6 build: real TypeScript error from `unknown` extra, **failed**. The typed sanitized cast was fixed and regression re-run.
- Second isolated Next16.2.6 build: optimized compilation, TypeScript, static page generation and postbuild observed in complete private log; private Build ID `JJPC22k5mVzQtcdV-YFXn`; **the command tool timed out at 50 seconds, so a direct outer-shell exit receipt was NOT captured**. Build completion is supported by postbuild log and BUILD_ID; this is a QA candidate only, not production release certification. Root-private log SHA is pinned in manifest.
- Exact patch SHA256 `f0e1f73ce93c7d1fdc1f5e48a068fb0d7807f88447362f802c443bfe65ae6429`, tested both `git apply --check` on unchanged source and `git apply --reverse --check` on fixed source.
- Offline immutable source contract tests in Connect CI verify exact source ancestry/scope, payload validation and absence of false release attestations. Remote CI completion must be verified separately.

## Release dependencies
Public active Connect Next Build ID remains `ONDwxEIZlx5onDIKY7wYf`; existing app/API HTTPS200. No PM2, Nginx, SaaS DB, records, ACL, worker transport, credentials, live SMTP, papers or results touched. Connect Core joint release remains `HOLD_NO_PRODUCTION_CUTOVER` while official independently signed Core gate is 6/13, not 13/13. Core only may review/rebase this patch onto latest actual Connect runtime descendant after backup, independent offhost restore, restricted worker, inherited grants, genuine School2 user denial, tenant role acceptance, and rollback readiness.

## Next
Request SaaS Core reviews this strictly scoped source patch at release integration time, without deploying unrelated legacy Next source or bypassing authenticated tests. Preserve all saved marks including true zero values, paper documents and Diary flows. Final teacher/peer-school/browser/physical diary print acceptance remains separately blocked.
