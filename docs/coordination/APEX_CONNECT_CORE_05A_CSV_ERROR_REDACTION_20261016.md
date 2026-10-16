# APEX Connect master — newest Core marks-safe integration and safe admin export error handling (16 October 2026)

## Source ownership and new changes

Connect source branch integration/connect-core-marks-safe-05a-20261016 descends from verified coordinated Connect checkpoint ff999a29e399a3c2485e904b2be31988cb2fecb2. All changes isolated from canonical SaaS Core, Paper Studio and the active Next runtime.

**Latest Core/Paper source**: integration/core-paper-marks-safe-20261016@05a59127e43cdcd2ee3a6b26694b8d798efef4d3, clean source and exact GitHub remote SHA matched. Detached independently verified Core worktree /root/workspace/connect-core-05a-independent-20261016, Vite 8.0.10 frontend npm run build EXIT 0, 2574 modules, build 11.06s; compiled dist/index.html SHA256 1097d23897e1bc507a111c4c202aba47a54960e27cf62f34234f95e32e0c26e3. Important ancestry detail: 05a is a descendant of e6911732; it is **not** a direct commit descendant of a2ff445a, because Paper owner changes were reviewed and cherry-picked onto the Core branch. Treat it as a different exact approved source family, never infer source compatibility from similarity.

Connect four-phase exact SHA-and-compiled-digest allowlist updated with only 05a pair while preserving four earlier pinned pairs and rejecting unknown commits or modified build digests. One new adversarial unit test plus all existing ones pass. No generic descendant override and no code deployment.

## Actual latest full protected Core release gate

Re-executed the real Connect four-phase runner against independent compiled 05a source, with read-only public runtime checks. Actual process exit2, HOLD_NO_PRODUCTION_CUTOVER:
- Phase1 current production source, health and protected result-record invariants PASS, including required public anonymous private API denial.
- Phase2 protected optimized Next candidate/joint Core integration verifiers exit0, technical checks **13/15**; the only two difference checks are public Lesson Planning and Early Years print not yet rolled forward.
- Phase3 official independent signed Core authorization 6/13, exit2, HOLD. Seven genuine gaps: newly officially reviewed fresh original ACL backup, independent signed current off-host recovery, signed restricted production transport, reviewed exact AI worker adapter running live, separately authenticated persistent global worker, live inherited effective-grants certification, independent signed real School2/unassigned-subject denial.
- Phase4 protected production promotion HOLD; the verification tool never changes production.

Private aggregate-only receipt /root/assps-release-evidence/connect-core-marks-safe-05a-20261016/gate.json SHA256 82cbdd727710442776ed7bfdd196d9efeeb182fa4659ba22c5b7bdf41be75faa, gate.rc literal 2. This is NOT release authorization.

## Genuine new Connect-owned application security repair

Existing reviewed Next export routes for admin leads and subscription requests were previously fixed for formula cell literals and status/Content-Disposition filtering (separate patches available on this source branch). A further **real server error disclosure risk** was detected: unexpected internal CSV exporter failures were returning raw Error.message in HTTP500 response JSON, and did not explicitly prevent response caching.

Isolated source base exact Next 2b749aee8a21b460e099e4bdbf608e1b997427c0 and local security fix commit eb007ae1d2c539b6f20095ebc832605c0b5ac6e2 in clean worktree /root/workspace/apex-connect-admin-csv-error-redaction-20261016. Two routes now retain earlier authorized 401/403, valid 200 and invalid status 400 behaviors, but return generic message "Export temporarily unavailable" plus Cache-Control:no-store on unexpected HTTP500. This prevents internal filesystem/SQL error text leaking to users from these two endpoints. No internal error or user records are logged/returned by the repair.

Actual focused **fail-before** (6/8 pass, 2/8 backend-error redaction FAIL) reproduced this issue using strictly synthetic injected private error string and mocked export storage. After scoped fix, route tests **8/8 PASS**, formula and status helper tests **10/10 PASS**, scoped ESLint PASS.

Independently executed actual optimized Next.js16.2.6 private npm run build with isolated copied dependencies (no production installation): literal process EXIT0, compiled in 52s, TypeScript completed 27.3s, 103/103 static pages, postbuild success. New PRIVATE Build ID Onz3qs6uPLcJv5vNpWqZh; do not confuse with approved role-neutral SAsg3cC_el5cq2_nN2a46 or public production ONDwxEIZlx5onDIKY7wYf.

Root-only private build.log SHA256 a9ac2f2c666835061a36dfe9f5f814208890221e33dcf252ff69b38230a942a8 and build.rc=0, both mode0600.

## Portable immutable handoff

Because the standalone Next source checkout has NO GitHub remote configured, this branch publishes its **exact reversible three-file patch** rather than pretending the standalone source commit is already on GitHub. Patch ops/connect/recovery/reviewed-next-admin-export-error-redaction-20261016.patch SHA256 36fe68f52ab439d53b4f01aac455a86ba0bf3d3f061fd63115a758b79087cb31, exact source base 2b749ae and fix eb007ae, three file SHA256 inventory in adjacent manifest. A real git apply --reverse --check against fixed standalone source PASS.

Five new hermetic Python patch tests verify checksum, scope, source/provenance, safe 500 behavior and explicit release HOLD. Full Connect Python suite **202/202 PASS**; reviewed Node negative-security **8/8 PASS**; CI YAML parsed, offline Python job added. CI remote green is **not claimed**. It must be reviewed and forward-ported only onto the newest independently certified appropriate Next source, followed by new complete build and actual authenticated role/cross-tenant testing.

## No false release claims

Latest Core+Paper candidate, existing production, academic Question Bank revisions and historical accepted papers remain owned by separate streams. No production Nginx or PM2 restart, database DDL/DML, user impersonation, signed certificate creation, actual marks/results modification, answer-key exposure, live academic approval, forced push, physical printer job or Next deployment occurred.

Release stays HOLD until SaaS Core itself gets real independent 13/13 signed security and robust backup/offhost rollback proof, then performs its governed blue-green promotion and real teacher+peer-school, Diary Save-Reopen-Print and result/zero-integrity postflight. The isolated security change is finished and tested; the complete production mission is NOT certified.
