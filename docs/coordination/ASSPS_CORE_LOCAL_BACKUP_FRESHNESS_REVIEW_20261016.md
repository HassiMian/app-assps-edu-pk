# ASSPS Core verified local backup freshness — 16 October 2026

Scope: read-only structural metadata inspection, NOT signed off-host recovery acceptance or production cutover.

Unified protected source merges Paper/worker/owner-upload branch f154de6d and newest Core RLS/hourly monitoring branch b088552c. Existing Paper Workspace, Diary, marks and already accepted school signoffs preserved.

The official old signed Core backup is SHA-matched but older than the 86400-second freshness window; do not change its mtime, overwrite it or bypass official verifier pins.

Separate previously created read-only PostgreSQL local candidate:
- Root-private path: /root/assps-release-backups/core-acl-fresh-candidate-20261016/apexos-full-fresh-20261016.dump
- Size: 2,706,585 bytes, file mode 0600
- SHA256: e4564c8228994c4b395d43e73ca02c3d308cefad55b5b241f2d4a7becd17e277
- Parsed PostgreSQL archive shows declared TOC Entries 1748 but selected item lines 1743; Row Security 87, plain ACL 187, DEFAULT ACL 2, all ACL including defaults 189. All values verified; their counting conventions are intentionally distinct.

A new read-only Python inspector validates fixed expected hash, root ownership, private mode, symlink avoidance, timestamp freshness and literal pg_restore -l catalog plus a full pg_restore -f /dev/null SQL/data-stream parse without any database connection. Real local candidate returned LOCAL_ARCHIVE_STRUCTURALLY_VERIFIED_NOT_RELEASE_CERTIFIED, exit0, no production writes. Old pinned original correctly returned HOLD_LOCAL_BACKUP_REVIEW with BACKUP_NOT_FRESH_DONT_TOUCH_TIMESTAMP. 9/9 hermetic adversarial unit checks pass.

Reproduce on VPS using:
python3 ops/release/backup-readiness/verify_fresh_local_acl_snapshot_20261016.py --archive /root/assps-release-backups/core-acl-fresh-candidate-20261016/apexos-full-fresh-20261016.dump --expected-sha256 e4564c8228994c4b395d43e73ca02c3d308cefad55b5b241f2d4a7becd17e277

The inspector DOES NOT write to DB, restore the backup, replace official signed Core recovery artifacts, certify offsite restore or deploy. Core must independently review/adopt new backup digest with actual offsite certified restore, worker signed transport and real peer-school security acceptance. Preserved previous printer acceptance and academic owner upload responsibilities: no repeat Principal request.
