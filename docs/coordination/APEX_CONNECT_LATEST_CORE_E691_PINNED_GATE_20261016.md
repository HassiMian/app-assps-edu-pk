# APEX Connect: latest Core e691 integration and guarded production HOLD — 2026-10-16

## Scope / exact ownership

- Connect source: isolated worktree integration/connect-latest-core-e691-gate-20261016, based on the earlier clean pushed Connect commit 9fd1a2c5e6aec9bd5c9c6b156c4f44282c232781.
- Current source Core: e6911732ff52df240390b28b37e531535c58a915 (integration/core-unified-paper-rls-worker-20261016). Independent detached worktree /root/workspace/connect-core-e691-audit-20261016.
- Existing Core signed RLS ancestor 017d51060349e39150ebd508d0d670c10eb15f5f is verified via git merge-base --is-ancestor.
- Connect-only change: exact SHA+compiled HTML allowlist for e691. Old two pinned Core SHA/digests preserved. No general descendant auto-adoption, source overwrite, live DB or production modifications.

## Genuine source/build proof

- Ran npm run build in isolated e691 al-siddique-frontend directory with existing trusted local dependency installation (symlinked node_modules; no copy into active production).
- Actual build exit 0, Vite 8.0.10, 2,574 modules transformed, built in 4.35 seconds.
- Independently sha256sum of new dist/index.html: 07f14dad2bd55e0e3104681174925ac5425c6371c179a294ae319ada8672a01e.
- Reproduces the separately documented integrated Paper/Core frontend artifact hash. Core worktree remains clean and detached. Do not treat local build as a remote CI or live release.

## Current real pinned joint gate on latest source

Ran root-private, read-only four-phase runner against --core /root/workspace/connect-core-e691-audit-20261016 with fixed approved Connect private Next stage SAsg3cC_el5cq2_nN2a46. Actual process exit 2, HOLD_NO_PRODUCTION_CUTOVER.

- Phase1 read-only production integrity PASS.
- Phase2 optimized Connect build verifier exit0 + cross-owner technical candidate exit0, 13/15 checks; the two expected *currently public* differences remain Lesson Planner and Early Years print companion.
- Phase3 independent signed Core production acceptance: official verifier exit2, 6/13. Seven missing are isolated reviewed fresh official ACL backup, independently signed offhost recovery, restricted signed production transport, deployed exact worker adapter, independent authenticated worker, certified effective grants, independently signed real School2/unassigned-subject denial.
- Phase4 protected cutover HOLD. There is no cutover/deployment logic in this Connect runner.
- Signed security cannot be inferred from previously passing unsigned FORCE-RLS or one-shot worker OS peer scope, and actual user credentials and independent signatures are not created by this task.

Aggregate-only private evidence: /root/assps-release-evidence/connect-latest-core-e691-20261016/gate.json (SHA256 aefdb7e9a6e8f19c68310494a43a285fc8f54e577c79e144b76e957fc6008a4e); gate.rc literal 2. Contains no student identifiers or credentials.

## Verification and post-cutover use

- Exact pinned source allowlist includes e691 and new SHA256, with fail-closed unknown commit, absent file and mutated HTML rejection tests.
- Connect full Python suite 166/166 PASS in VPS, Node reviewed-stage 8/8 PASS; local CI YAML parsed. Live API and Connect remain online; Nginx and existing live deployment untouched.
- Earlier separate Connect public 6-check target acceptance returns 3/6 HOLD pre-cutover, because active public Connect build ID ONDwxEIZlx5onDIKY7wYf and role-specific /admin fallback have not been replaced by the reviewed role-neutral stage.
- Critical next action belongs to SaaS Core: independently authenticate/sign its seven missing release claims, maintain marks/result integrity including real numeric zeros, then review controlled rollback-ready promotion, real teacher/School2 denial and Diary Save-Reopen-Print tests. Do not promote this audit branch itself or alter Core deployment from Connect.

No Nginx reload, PM2 restart, SQL DML/DDL, passwords, fake signatures, physical print or source release promotion occurred.
