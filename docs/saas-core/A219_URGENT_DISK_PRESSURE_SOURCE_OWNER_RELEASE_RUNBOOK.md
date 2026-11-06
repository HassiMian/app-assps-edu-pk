# A219 — Emergency Capacity, I/O Pressure and Release-Gate Runbook

**Status: HOLD. This commit is not production deployment or approval to delete.**

## Live risk and scope

The Hostinger VPS is an approximately 100 GB block disk (/dev/sda), with an ext4 root partition (/dev/sda1) spanning virtually all the disk. Filesystem occupancy near 97% left approximately 3.2 GiB free at start. At least 16 GiB of observed free root space is required before academic/attendance release. Names like cache, old or test do not prove safe deletion.

The A217 disaster-recovery drill proved a same-VPS data/owner/ACL parity restore, not off-host recovery or password-based role login. A218 complete source and archive receipts remain intact. No 58 original Saved Paper IDs were reimported, no seven conflicting revisions Principal-approved, and Pre Nine/Nine live attendance not certified as published.

## Unified 40-minute operation

1. Capture df, inode stats, block geometry, mounts, source HEAD, and process working directory references without deleting anything.
2. Run only bounded size scans; stop heavy scans if I/O contention becomes excessive. Keep partial evidence marked nonexhaustive.
3. Independently distinguish active Git worktrees and process refs from unverified owner roots; missing refs never prove deletion is safe.
4. Execute a fail-closed capacity and I/O guard with adversarial tests. Recheck A217/A218 certifications; distinguish same-host versus independent off-host full role-password and ACL restore.
5. Validate the Git source bundle and main-based isolated review commit, with exact file SHA comparison.
6. Keep live source-lock and disk trend for at least 2,406 seconds; verify final certificate before claiming completion.

## Emergency action outside this audit

Hostinger official support says VPS disk cannot be increased separately: upgrading the entire VPS plan is required. The human account owner can use hPanel > VPS > server menu > Upgrade, choose a larger plan, confirm backups and continuity, and follow provider guidance if filesystem expansion is not automatic. Do not infer exact subscription or price from the 100 GB disk.

Official current guidance:
- https://www.hostinger.com/support/1583229-how-to-upgrade-a-vps-server-at-hostinger/
- https://www.hostinger.com/support/8899490-how-to-increase-vps-partition-size-at-hostinger/

Do not execute partition commands, cleanup, producer restarts or financial actions without explicit owner authorization and independently restorable off-host backup.

## Original paper, academic and production evidence

Four locally encrypted CurrentUser-DPAPI copies are hash-verified on the Windows workstation but are not independent portable paper recovery. The 58 saved paper IDs contain seven same-ID conflicting revisions and nine additional IDs beyond the older set of 49. An authenticated Principal must approve a version disposition and verify editable same-school Paper Studio import. Never auto-merge.

School1 had 329 active students at audited baseline; teacher-subject source evidence is missing for 220 students across six classes. Assessment 1–4 lack approved offerings/results, Assessment 5 absent, and historical First Term 1,854-result checksum must be preserved. The four actual published attendance shells still need safe Pre Nine/Nine role acceptance; a passing browser candidate is not publication.

The 73 app-owned protected RLS tables force RLS, but application database/schema CREATE privileges and DDL ownership require least-privilege migration; FORCE RLS alone does not prove a bypass.

## Read-only execution

    python3 ops/release/a219_emergency_capacity_gate.py --out /root/workspace/assps-mission-20261106-a219-private/A219_CURRENT_GATE.json

    python3 -m unittest discover -s ops/release/tests -p 'test_a219_emergency_capacity_gate.py' -q

Exit 3 means HOLD; 2 means evidence not verifiable; 0 would mean ready for independent human signoff, never automatic deploy or delete.

Under 2 GiB EMERGENCY, under 4 GiB CRITICAL and below 16 GiB release reserve are operational heuristics, not provider warranties. I/O pressure is an operational warning, not causal proof.

## Approval required before any storage reclamation

Independently restore a full database including users, global roles, role passwords, owner, GRANT/REVOKE ACL and RLS on a separate host. Verify backup SHA provenance and reversible migration. Identify and authenticate owners of each file/directory and preserve secure archives, keys, published app, historical school records and active agent sources. Obtain signed consent and test restore before modifying a single original source.

Neither unit-test PASS, same-host DR, unapproved directory deduplication, nor zero sampled 429 errors can turn production HOLD into PASS.
