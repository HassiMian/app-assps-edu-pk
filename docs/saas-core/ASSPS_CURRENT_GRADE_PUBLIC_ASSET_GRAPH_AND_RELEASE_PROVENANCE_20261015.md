# ASSPS Core + Connect + Paper Studio — active public asset graph and release provenance

**15 Oct 2026. Engineering-only verification. Production release HOLD.**
This checkpoint extends the official GitHub issue #4 source coordination without overwriting any existing Paper/Grade/Connect work.

## New production forensic evidence

The Nginx-configured current public school SaaS root is
`/var/www/assps-grade910-draft-save-print-b18a8aae`, returning HTTP 200
for `app.assps.edu.pk`. Its index SHA256 remains
`0af53ae824340f2ddc0b91e848163f8bddad4263d1bb7a7cf92a2bcda923325a`
rather than the prior reviewed Grade b18 source
`92283fc8eec1d5fe1562abfe26f75b731c0b9eeb5f1883802b3e2a2cabc330ff`.
The previous reviewed index and its referenced assets are still preserved
at `/var/www/assps-grade910-draft-save-print-b18a8aae.bak-20261015-1240`.
DO NOT silently restore that archive or redefine the prior approved SHA.

More precise than calling the entire live bundle equal to the Result Cards
static tree: the current root contains **290 files**. Of these, **92 files
exist in both source directories and all 92 match byte-for-byte**, including
the running index and main JS. The remaining **198 current live files
have no matching pathname** in the Result Cards static tree, which has **892
files**. Thus index/main-JS identity alone cannot certify the COMPLETE
frontend provenance or owner release history.

Actual running index and main JS reference **68 direct asset files**.
All **68/68 are present** under the current configured root. Therefore no
direct missing-asset evidence supports calling this running bundle broken.
It could still have runtime or source/approval errors: asset completeness
is neither application acceptance nor Git commit identity.

## New fail-closed executable integration guard

`ops/release/signed-bluegreen/verify-live-grade-asset-provenance-20261015.py`:
read-only source-only mode provides an explicit `technical_assets_complete`
status; SHA-pins current observation and previous reviewed archive, checks
unique entry, enumerates direct Vite bootstrap dependencies, compares
actual JS/index with the other Result Cards tree, and reports unmatched files.
It does **not** infer a reviewed Git source revision, a human signature, or
approved SaaS Core traffic deployment. Default release-mode CLI EXIT2/HOLD
even with full technical asset completeness.

`test_verify_live_grade_asset_provenance_20261015.py`: **12/12 PASS** on
isolated in-memory/tmp fixture files, including corruption/missing bootstrap,
missing dynamic asset, forged index SHA, overwritten backup, false provenance,
extra files, and inability to convert technical PASS into release clearance.

The immediately preceding isolated multi-owner compatibility gate
`verify-connect-core-paper-live-drift-20261015.py` remains pinned:
Core278 + Paper V3 backend staged source has exactly six reviewed changes,
13/13 negative tests PASS, but the actual Paper Studio owner current-live
preflight has 14/15 valid source checks because of the above public Grade
index drift. The genuine standalone Core/Connect source and production
release gate retains full-ACL backend/source technical checks but HOLDs
independently on authorized actor and runtime signed evidence.

## Data safety / legitimate next cutover prerequisites

School1 Exam9 marks: 1,762 results including 213 real zeros and 0 NULL,
original 301-row MD5 `bcdc098a3e6cabb6f4c31736b14e39b9` unchanged.
Current database full-ACL dump and roles recovery checksums PASS.
Actual public Connect BUILD_ID is `ONDwxEIZlx5onDIKY7wYf`; restricted
reviewed AI worker adapter is NOT installed in running production.
Current Lesson route remains byte-identical to approved live source SHA
`435cf755904dcd7fdf74189d5a99d267b8ace98a6627c9180a2375e9dfaaf74f`.

**HOLD:** Core, Grade IX–X and Paper Studio owners must authenticate whether
the NEW public static bundle is a reviewed, version-pinned deployment,
and resolve current source ancestry. Genuine teacher-owned temporary-password
change/relogin; real existing School2 unauthorized tenant/subject GET denial,
signed independent human rollback/recovery receipts; running restricted
worker acceptance; reviewed atomic Core Next+Nginx cutover/rollback and
postflight remain separate and MUST be genuinely evidenced. Synthetic
browser tests and unsigned packets cannot satisfy real human gates.
No live source, database, password, PM2, Nginx, paper, marks or result
change performed by this evidence work.
