# ASSPS Core — authentic teacher account metadata and complete Blue rollback artifact

**Date:** 2026-10-14. **Owner:** SaaS Core with APEX Connect, coordinated via issue #4.
**Parent:** `c2812948c0916a6886c1f88e8887c567402b4791`, latest checked integrated restricted worker/Next preflight source. **Release status:** NOT promoted.

## New executed, password-free production account readiness audit

A new read-only preflight script `ops/release/signed-bluegreen/verify_teacher_auth_metadata_20261014.py` verifies a *specified* employee ID and school only under `BEGIN ... REPEATABLE READ READ ONLY`: employee-to-user link, active status, real DB `teacher` roles on both records, current tenant and school parity, existing user password *presence only*, portal-login username match and no identifier collision with another employee/user email or username. It deliberately **never** SELECTs, prints or compares hashes, token secrets or passwords; it makes no login request, creates no cookie and cannot attest a real signed actor or teacher subject assignment. Underlying school employee/user IDs are internal and are not published in Git.

Current school1 Muhammad Imran record **10/10 metadata checks PASS**: correct active teacher account, unique login identifier and `must_change_password=true` challenge pending. Source negative regression **8/8 PASS**: rejects disabled, unlinked, wrong tenant, wrong role, duplicate/mismatched username; independent account metadata check is explicitly not presented as genuine teacher acceptance. Real teacher must complete temporary-password rotation and fresh login himself. Do not fake his session or reset his password again.

## New actual Blue artifact recovery certification (no public switch)

The entire currently deployed `/var/www/apex-connect` runtime (including exact old Next compiled app + dependencies, guarded runtime configuration) and current `/etc/nginx/sites-enabled/apex-api-ssl` vhost were packed as one protected root-only archive under:

`/root/assps-release-backups/core-login-blue-artifacts-20261014T1855Z/apex-connect-blue-and-nginx.tgz`

The archive is sensitive, because runtime config is included, and stays **root 0700 directory / 0600 archive only**, excluded from Git/public downloads. Full gzip stream verification and SHA256 manifest PASS. An actual **isolated filesystem extraction of the entire archive** then restored the original `.next/BUILD_ID` `XI7EvxpUMkKOxK5ByM2BH` and Nginx vhost; both compared byte-for-byte equal to active live Blue originals. Nginx SHA256 `b425e52917470a1c8355b570097ca6fc22afa1e4d051b6d52d6c7f56bb3b89f9`. Temporary restored copy was deleted; original public runtime and Nginx were not restarted or reloaded. This proves artifact recoverability, NOT real post-cutover traffic rollback or successful real staff sessions.

## Still mandatory before authorized Blue/Green public cutover

Core six-global SQL and exact inverse have passed fresh full-ACL private PostgreSQL clone; NOT applied to live PostgreSQL. The latest release preflight still requires actual production scoped worker LOGIN and loaded backend AI adapter code, genuine tenant-school/subject authenticated negative HTTP, independently owner-pinned institutional Ed25519 release attestation, existing school teacher-authenticated challenge+relogin, off-VPS encrypted recovery, and live traffic rollback exercise. Public Next compiled candidate and removal of BOTH forced Nginx dashboard intercepts must be promoted together, never as an unverified partial fix. The separate official marks/publication release remains held, and Exam9's **1762 rows/213 authentic numeric zeros** must remain unchanged.

**Verdict:** authentic teacher identity metadata and full Blue artifact filesystem restore PASS. *Public Connect login release is NOT certified*; live service remains old Next `/dashboard`->`/admin` until genuine acceptance.
