# APEX Connect — Admin CSV Export Status Validation and Recovery (16 October 2026)

## Scope and verification

Connect-owned Next.js administrative export hardening only; Core/Paper/Academic branches, production services and canonical records unchanged. The prior Connect security checkpoint is integration/connect-core-authored-a2ff-20261016 at 892febc7e674341c6c8d1922a6d3a43a6a83c0b1; new isolated coordination branch is fix/connect-admin-csv-status-header-20261016.

The standalone reviewed Next source previously fixed unsafe formula CSV cell values, at local private source commit 44cfef3e2162d61ebff4374dab62fcc4b84689d0. New strict filter source commit 2b749aee8a21b460e099e4bdbf608e1b997427c0 is a direct descendant. The Next source checkout has NO configured GitHub remote; the exact portable patch is instead published into the authorized ASSPS GitHub coordination repository. Neither standalone source commit is a public deployed release.

### Reproduced defect

Both existing authenticated admin export routes interpolated unvalidated status query text into the Content-Disposition attachment filename and allowed unsupported arbitrary status filters. Even though the upstream admin permission check was already present and newline headers might be rejected by frameworks, allowing untrusted filenames/filter values was an unnecessary attack and reliability surface.

### Exact new Next change

- src/lib/server/admin-export-status.ts defines strict admin-specific status sets: Apex leads ALL/NEW/CONTACTED/ARCHIVED; subscription requests ALL/PENDING/PAYMENT_CONFIRMED/APPROVED/REJECTED. Lowercase values normalize. All unknown/injected/blank values denied.
- src/app/api/saas-admin/apex-leads/export/route.ts and src/app/api/saas-admin/subscription-requests/export/route.ts call required existing requireSaasAdminUser first, normalize/validate status before CSV storage, return JSON HTTP400 + no-store for invalid values, and use only a canonical validated token in CSV attachment filename.
- tests/admin-export-status.test.mjs and tests/admin-export-route-security.test.cjs exercise utility and both real TS route handler bodies with VM mocks, no real accounts/network. They prove unauthorized 401 before validation, malformed values 400 without exporter calls, valid ALL exports 200, safe filename and no-store. Prior formula encoding tests stay intact.
- Focused new and prior CSV tests 16/16 PASS, scoped ESLint EXIT0.

### Genuine isolated optimized Next build

Copied local dependency tree only inside isolated standalone worktree to avoid Turbopack symlink restrictions. Genuine background npm run build completed EXIT0, Next.js 16.2.6 optimized compile 59 seconds, TypeScript 29.3 seconds PASS, 103/103 prerendered pages and postbuild success. Private Build ID OS4cW8dj-TjhMP5tGmtlR. No Next port used for live service, no production release affected.

Build log and actual exit receipt are root-private /root/assps-release-evidence/connect-csv-status-validated-20261016/build.log and build.rc with mode0600. Log SHA256 09783bccdcd432d1c8ce9c94be0cf96043168b953f316f469c8e8cf6eb6cf64a. New private Build ID differs from previous formula-only OS candidate 6P6T_rpCWPP-p5da2Ye_u, reviewed auth stage SAsg3cC_el5cq2_nN2a46 and deployed public ONDwxEIZlx5onDIKY7wYf. None are interchangeable.

### Portable immutable handoff

- Exact five-path diff in ops/connect/recovery/reviewed-next-csv-status-filter-20261016.patch, SHA256 2f1d716f8650d8dd576a4f4e428ddbf4f0af70b4c46fc9ca97a6e9aa6082555d.
- Actual git apply --reverse --check on fixed standalone Next source PASSED.
- Manifest pins exact source parent and child SHAs, SHA256 for all five modified files, observed build exit and receipt digest, with releaseAuthorized false and productionModified false.
- Six offline Python tests prove patch SHA, path boundaries, new exact source/test byte hashes, both export validation locations, and execute reconstructed TypeScript parser with real Node22 without installing app dependencies. CI path filters on push/PR and Node22 step updated; remote GitHub Actions success NOT implied.
- Full existing Connect ops Python suite 196/196 PASS; reviewed Node private-negative security suite 8/8 PASS. Still require full Next authenticated role and tenant security tests before production.

## Ownership and release boundary

Newest published Paper Studio fix (e145137a...) should only be integrated by SaaS Core onto its separately reviewed descendant, not mistaken for the canonical released frontend. Last genuinely signed Core security outcome was 6/13 EXIT2/HOLD: fresh reviewed ACL backup, independent signed offhost current recovery, installed authenticated signed worker transport, reviewed live adapter, effective worker grants and independently signed peer-school/unassigned subject denial missing. Private application builds or synthetic export tests do NOT overcome these requirements.

No staff passwords, actual student or parent records, marks/results (including 213 genuine numerical zeros), RLS grants, paper approvals, Nginx, PM2, live backend, teacher workflows or physical printer operations were changed. Core alone owns approved rollback-ready cutover. After genuine 13/13 security, forward-port only the scope-approved CSV source patches onto the newest verified Next descendant, run the full build and signed authenticated cross-tenant + real browser acceptance, then roll out under Core's release gate.
