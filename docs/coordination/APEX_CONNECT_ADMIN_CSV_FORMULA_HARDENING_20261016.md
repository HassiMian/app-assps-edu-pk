# APEX Connect — Admin CSV Formula Hardening (16 October 2026)

## Scope and genuine findings

Connect-owned application change, not a SaaS Core production release. Existing private reviewed Next.js code contained two admin CSV exporters whose quoting logic did not neutralize spreadsheet formula interpretation. Both exporters emitted user-controlled formula-like text =2+2 without a literal prefix, as independently reproduced from the original source.

Isolated Next source root: /root/workspace/apex-connect-csv-formula-hardening-20261016. Parent reviewed lint-corrected source: 2de3c39224b12385be0ab46a1e6c53328a7eeafc, itself descendant of role-neutral auth source 9fcca4320bdbeb834f6494d1af82d82f1d9b818f. Exact local application fix commit: 44cfef3e2162d61ebff4374dab62fcc4b84689d0. The private standalone Next Git repository has no configured GitHub remote; this versioned patch and manifest are preserved in the coordinated ASSPS Connect branch rather than falsely claiming a pushed private source repo.

Four edited Next paths: two existing admin CSV exporters, new shared CSV-cell encoder, five focused Node tests. The encoder prefixes apostrophe to untrusted formula-like string values, including leading whitespace/control/BOM variants, and then performs correct CSV quoting. Legitimate typed negative numbers, Urdu/English text, commas, quotes and line breaks are preserved as specified in passing tests.

## Real tests and build proof

- Fail-before both real exporters emitted raw =2+2 without neutralization.
- Pass-after: Node 22 CSV security tests 5/5 PASS.
- Scoped ESLint for all three changed TS files PASS.
- First optimized Next build FAILED because Turbopack correctly refused a node_modules symlink outside the filesystem root; repaired only isolated workspace by copying local dependencies.
- Second foreground build exceeded remote command wrapper timeout, not counted as pass.
- Third genuinely completed isolated Next.js 16.2.6 optimized production build: EXIT0; compiled in 54 seconds, TypeScript completed in 27.0 seconds, 103/103 generated static pages and postbuild success.
- New private Build ID 6P6T_rpCWPP-p5da2Ye_u. Not currently deployed. This is distinct from public ONDwxEIZlx5onDIKY7wYf and earlier separate reviewed private SAsg3cC_el5cq2_nN2a46.
- Restricted root-only build.log SHA256 5805addbe201fff26b1452b734d6f28cc01ce44c603df88f200ee3824ee59706, observed literal build.rc=0; both mode0600.

## Portable source and future integration

- ops/connect/recovery/reviewed-next-admin-csv-formula-20261016.patch contains exact four-path diff base 2de3c39 to isolated application fix 44cfef3. Patch SHA256 2ade87d0f595a8063ec40fa53c8fd89deda8cd533207e7e0d6f9fbe39315fd46.
- Actual reverse git apply --check on fixed standalone source PASS. Stored manifest pins exact file SHA256 hashes, source base and commit, validated build receipt, releaseAuthorized false and productionModified false.
- Additional seven hermetic Python checks verify patch bytes, exact path set, actual shared-encoder integration and run Node22 with the exact recovered TypeScript helper. Source CI references changed patch/manifest/tests and explicitly installs Node22; CI does not contact live school APIs.
- Core/Connect owners must apply only the scoped reviewed patch to newest independently verified appropriate Next descendant and rebuild/test in isolation. Do not promote this legacy private build or overwrite other agents' work.

## Production security boundary

Latest Core / Paper coordinated branches may supersede older integrated e691 source. Existing real 1,763 saved exam result rows and 213 numeric zeros must be preserved. Official independently signed Core security gate last verified 6/13 with seven missing backup/off-host/worker/transport/role-grants/peer-school signing requirements. An anonymous 401 or private build cannot substitute real signed cross-tenant certification.

No student/marks DB write, staff credential use, Nginx reload, PM2 restart, production Next release, signer forgery or physical printer job occurred. Production cutover remains Core-only HOLD.
