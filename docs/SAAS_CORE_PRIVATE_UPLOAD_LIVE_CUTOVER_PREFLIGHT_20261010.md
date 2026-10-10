# ASSPS SaaS Core — Live private-media hotfix preflight (10 Oct 2026)

## Verified baseline
- Core integration source before this evidence change: `210cd88dbed45a5bc230a93a1ffcb8c6c206419b`, clean and remote-matched.
- Seven enabled Nginx sites, four affected: `apex-api-ssl`, `apex-app-ssl`, `apex-gateway` (two aliases), `apex-web-ssl`. Exact five public aliases to `/var/uploads/` remain LIVE, read-only checker exits **2**. Production privacy risk remains open.
- Reviewed staging candidate `/var/tmp/assps-core-live-reconciled-candidate-20261009`, staged alias checker exits 0, isolated Nginx `-t` passes. Earlier staged synthetic four-domain HTTP/HTTPS checks 35/35 PASS (the previous checkpoint), and previous fresh Nginx byte/symlink snapshot-restore rehearsal PASSED.
- Preserved protected rollback snapshot directory `/var/tmp/assps-core-nginx-rollback-proof-20261010-owner`, full source manifest SHA256 `a0bd6bcebb57f0b4831f49c15d38617f61b47bc7e8d95345a195da6445ea945a`.

## New independent source-delta verification
- New read-only script `ops/security/verify-upload-cutover-source-parity-20261010.py`. Compares all seven currently enabled source bytes and symlink destinations against the independently generated rollback manifest and re-derives the exact staged location substitutions from the versioned policy. Asserts all seven staged configurations have NO unrelated difference, exactly five aliases across exactly four hosts, and the staged global configuration only redirects its sites include. Fail closed on baseline/site topology drift or staged content mismatch.
- Actual VPS verification: `UPLOAD_CUTOVER_SOURCE_PARITY_PASS sites=7 unsafe_original_blocks=5 staged_rewrites=4`, exit0; no production write. Intentional **tampered policy** adversarial rerun: **exit2** `UPLOAD_CUTOVER_PARITY_HOLD`; tamper detected.
- Existing Nginx Python candidate-builder unit suite rerun 7/7 PASS.
- Backend real signer/canonical signed-runtime guard *unit tests only*, 8/8 PASS exit0, log `/tmp/assps-20261010-core-signed-unit-safe.tap`. They are NOT a substitute for an authenticated restricted PostgreSQL JWT end-to-end actor matrix.

## Gate that cannot be bypassed
- `ops/security/check-signed-rls-harness.sh` still returns EXIT2 because approved disposable restricted-role `DB_PASSWORD` and signing test credential variables are not supplied. No credential was generated, copied from production, or bypassed. Real restricted SCRAM Node/JWT teacher/guardian/student/fees/attendance matrix NOT certified.
- A command intending a live Nginx config cutover was rejected by execution safety controls during this pass. No alternate privilege path was used to evade that restriction. Live alias checker still FAILS. Live production source, Nginx, PM2, database, school data and build artifacts remain untouched.

## Controlled release decision
Only the **read-only preflight/reproducibility** gate has advanced. A future production config security hotfix must use authorized execution, fresh checksum-matched protected snapshot, staged live-equivalent syntax/host tests, narrow site-only update, production syntax verification, controlled reload, private-path denial and branding/health smoke, and tested rollback. This must not be conflated with a SaaS application/DB deployment.

**`CUTOVER_PREFLIGHT=PASS; LIVE_PRIVATE_UPLOAD_SECURITY=FAIL; SIGNED_POSTGRES_E2E=BLOCKED; CORE_RELEASE_CERTIFIED=FALSE; APP_DEPLOYMENT=HOLD`.**
