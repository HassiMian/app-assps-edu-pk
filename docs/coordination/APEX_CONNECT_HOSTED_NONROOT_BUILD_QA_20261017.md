# APEX Connect — hosted nonroot optimized-build gate correction (source only)

**Date:** 2026-10-17 | **Deployment:** NOT DEPLOYED | **Release:** HOLD.

## Verified ancestry and scope

Parent is the independently clean/published Connect Core742 QA branch at
`audit/connect-core742-merged-release-20261017@583f341acef016c463183b7ef0f7197d108cbd53`.
The separately owned Core/Paper/Results/Notice/Diary combined source
`integration/assps-core742-notice-diary-unified-20261017@c303edc05f7a90050838c8bf5ec358831b1b5c63`
is not replaced by this audit branch. SaaS Core alone may evaluate forward-porting.

## Root cause and fix

Hosted workflow `38997069080` failed 4/15 private-stage tests with unhandled
`PermissionError: [Errno 13]` when `Path.is_dir()` attempted
`/root/workspace/apex-connect-eslint-full-source-reconcile-20261016` on an
unprivileged GitHub runner. The genuine private Next build belongs only to the
trusted VPS and must not be assumed present on GitHub Actions.

Exactly three existing source/test/workflow files are changed:

1. Check the private stage path within `verify()`'s existing OSError guard,
   so inaccessible paths return **False**, never an exception or a success.
   The manifest hash, source SHA, asset SHA, compiled Next runtime, real exit
   log and anti-forgery requirements remain unchanged.
2. Portable hosted tests **explicitly skip** four assertions that genuinely
   require VPS-private artifacts; they never convert missing evidence to pass.
   Two new offline adversarial tests prove unreadable/missing stage fails closed.
3. Label the hosted workflow step to describe its **portable anti-forgery** scope;
   do not claim signed private build or production release from a green run.

## Reproduced evidence

- On the authentic isolated VPS worktree, focused private-build tests **17/17
  PASS, zero skips**; all Connect Python tests **379/379 PASS**.
- Original trusted `python3 ops/connect/verify_successful_next_build_20261016.py`
  returns `OPTIMIZED_NEXT_BUILD_PROVENANCE_PASS`, exit 0,
  `production_release_authorized=false`,
  `independent_security_certified=false`.
- Fresh **nonroot nobody** test using only a copied source-only temporary
  fixture, unable to read `/root`: 17 run, **13 PASS + 4 explicit SKIP**,
  zero failure/error. Each skip states the trusted private build was not
  attested. The temporary fixture was removed after the run.
- `python3 -m py_compile` and `git diff --check` PASS.
- Production source/compiled artifacts, root-private witness, signed school
  sessions, school records, student marks, tenant ACL/RLS, printer, Nginx/PM2
  and actual deployment untouched.

## Remaining gates and release interpretation

Even if new hosted source-only CI passes, the old live public Connect
build `ONDwxEIZlx5onDIKY7wYf` remains deployed until SaaS Core certifies
cutover. Last documented independently signed Core release checkpoint is
**6/13 HOLD**, not a new certification. Authenticated real School2 denial and
unassigned teacher subject denial, signed restricted worker/grant and
off-host ACL restore, school-offering approval, genuine Diary
Save -> Reopen -> Print and witnessed Ricoh Urdu A4, notice teacher-audience
privacy fix and owner-signed rollback remain pending.

Data invariant: never replay 38 previously SAVED genuine Class One Urdu
grades, overwrite 1,801 exam results including 213 genuine numeric zeros, or
edit original protected 43 papers. Source QA may not be mistaken for release
authorization. No new recurring automation is needed; existing unified
hourly mission handles subsequent verification.
