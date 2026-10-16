# APEX Connect / Core — time-expired signed-release database rollback backup

**Verified 16 October 2026. Handoff only; SaaS Core owns official backup approval, pinned hashes, signed offsite restore and production promotion.**

## Reproduced actual release-gate regression

Trusted current live Core verifier `verify-connect-login-only-core-20261014.py`, with actual public Connect compiled middleware SHA and Build ID, returned **HOLD / exit 2 / 6 of 13 PASS** in fresh execution. Earlier 7/13 is **not** current: `isolated_previously_reviewed_full_acl_backup` has since expired.

- Previous reviewed private `apexos-full-current.dump`, mode 0600, 2,701,049 bytes, last modification **15 October 2026 02:11:02 UTC**.
- Official pinned SHA256 **`a989b0ef674014109f1f30108a56e9fe4555027712ede8aaed9f82a397f7169a`** still matches the original artifact exactly.
- Original dump `pg_restore -l` reads valid catalog/ACL entries. It is **too old for the trusted maximum 86,400-second validity window** at the 16 October verification. Retouching file timestamp or removing the gate is prohibited.
- No proof of independent current offsite restore or signed School 2 denial may be inferred from an intact local backup.

## Genuine new private rollback candidate

With read-only PostgreSQL 16 `pg_dump -Fc --create -d apexos`, a **new** root-private candidate was created independently of the pinned original, no database writes:

`/root/assps-release-backups/core-acl-fresh-candidate-20261016/apexos-full-fresh-20261016.dump`

- Private directory 0700 and archive 0600, size **2,706,585 bytes**, modification **16 October 2026 02:16:54 UTC**.
- Genuine new SHA256 **`e4564c8228994c4b395d43e73ca02c3d308cefad55b5b241f2d4a7becd17e277`**.
- Real `pg_restore -l` catalog read **PASS** (including RLS and default ACL entries); `pg_restore -f /dev/null` streams full SQL contents successfully without restoring to a live database.
- New read-only SQL snapshot `exam_results` count **1,763**, real numeric zeros **213**; nothing inserted/updated/deleted; no live roles, users, fees, marks or papers modified.
- **Important:** This is a preliminary local candidate, **not** a completed isolated restore drill, not independently signed off-host recovery, not a Core-pinned approved archive, and not a reason to mark the official gate PASS.

**Authorized Core next step:** independently review the fresh dump's provenance and ACL coverage, perform the required safe isolated restore/rollback acceptance, establish legitimate offhost receipt and update *Core-owned* SHA/release contract through reviewed source control. Then rerun actual Core verifier, using the current live compiled Next source, without bypassing any pending worker/School2 identity requirements. Preserve the original pinned backup and immutable live SaaS.
