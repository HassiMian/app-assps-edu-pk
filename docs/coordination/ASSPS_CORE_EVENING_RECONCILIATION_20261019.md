# ASSPS Core evening release reconcile — 19 October 2026

## Fresh production, not an assumed older branch
At approximately 15:30–15:43 UTC on Hostinger srv1769723, live Nginx root was
/var/www/assps-resultcard-nazra-purged-20261019 with index SHA256
3c74d3be652b41549ef2129eaacec4c341c05c2118597e308edffd17a33726a9.
Backend PM2 apex-backend PID 1118433 was online. Production backend src/server.js
SHA256 ab428a5842ea9c3313f5978087ef350d2d2858df5e082153e469f3e44bfe3144,
but release-meta.json still dates to 8 October and actual running backend commit
ancestry is NOT certified. Do not redeploy older 8d2d frontend blindly.

Latest live database READ-ONLY: 326 physical student rows (322 School1,
3 School2, 1 historical test-school), 1854 exam results, 224 genuine numerical
zeroes, 54 active authorized School1 teacher assignments with no extras.
No school data was modified in this source-only reconciliation.

## Backup coverage corrective action LIVE
The installed daily critical backup previously captured fixed application paths,
not newer current Nginx frontend roots. Previous script was preserved at
/var/backups/assps-active-frontend-20261019T1540Z/critical-backup-script.before.sh.
Current installed /usr/local/sbin/assps-critical-backup extracts a single
/var/www/assps-* frontend root from active app Nginx configuration, validates
that it exists and is not a symlink, and adds it to the existing tar inputs.
No retention or historical backups were deleted. Snapshot
/var/backups/assps-critical-20261019T154045Z, ~97 MB, verified all 4/4 SHA256
items PASS, and tar listing explicitly contains the active production
assps-resultcard-nazra-purged-20261019/index.html. Independently preserved
current frontend/Nginx copy under
/var/backups/assps-active-frontend-20261019T1540Z (checksum PASS).
The service is still scheduled daily with existing retention protections.

## Signed-RLS candidate SOURCE ONLY
Isolated reviewed candidate base 0d5ab255 (descendant of fortress 88e6de66).
Original signed guard expected 82 forced tables, while live excluded-audit
catalog includes 85: 77 exact signed core guards, 5 independently approved
academic policies, plus 3 new scoped school document relations. Added a
mandatory three-relation document-policy attestation SQL before the candidate
can accept 85; both enabled/forced counts must be exactly 85, and the 77
original signed guards and five academic policy predicates stay mandatory.
Every required document has FORCE and ENABLE RLS, an exact restrictive policy
identity/role, documented table policy count, and checked tenant expressions;
missing policy, changed count or missing attestation must fail closed.
Unit/static tests: 23/23 PASS. Production safety, source whitespace and JS
syntax PASS. This code is not installed on live backend. Its strict signed
HMAC actor-token enforcement and effect on actual live legitimate teacher and
principal sessions still require isolated PG runtime tests and staged rollout.
DO NOT relax production RLS / sign policies to force the guard to green.

## Release HOLD
Timetable legacy Save remains deliberately denied with HTTP403; the new
candidate draft routes and signed schema are not live. Latest live backend
file ancestry and 147 live-only files require complete reconciliation before
any restart/replacement. Principal/Teacher and independent peer-School2 real
HTTP acceptance, signed HMAC runtime authorization, 59 academically held
sources, off-host independent recipient decryption and dual-cluster restore,
and witnessed Urdu laser A4 all remain pending. This source branch is a
reviewable fix, NOT approval to promote or publish prohibited academic rows.
