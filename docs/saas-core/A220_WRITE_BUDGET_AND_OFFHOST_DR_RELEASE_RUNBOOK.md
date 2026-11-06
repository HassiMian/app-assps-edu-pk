# ASSPS A220 — Critical disk write-budget admission and off-host disaster-recovery acceptance

**Review-only. NO production deployment, data deletion, service restart, DB role mutation, backup transfer, paper migration, or Hostinger billing action.**

## Verified baseline and release freeze

At A220 start (2026-11-06 15:31 UTC), VPS root filesystem had 2.458 GiB available (approximately 97.4% used) versus an audit release reserve of 16 GiB. The VPS has a 100 GiB block device with an approximately 99 GiB ext4 root partition. There is no demonstrated unused block-device capacity suitable for a purely local filesystem expansion.

The live apexos database logical size was ~43.6 MB in a read-only snapshot. School 1 First Term has 1,854 historical exam result rows. Database size is NOT proof of sufficient space for off-host full restore with globals, passwords, RLS, WAL, ownership, and backup retention.

Official Hostinger Help Center states individual VPS disk/RAM resources cannot be upgraded separately: a whole VPS plan upgrade is required (verify eligibility in owner's authenticated hPanel):
https://www.hostinger.com/support/1583229-how-to-upgrade-a-vps-server-at-hostinger/
Plan capacity examples and limits:
https://www.hostinger.com/support/6976044-parameters-and-limits-of-hosting-plans-in-hostinger/

Stop/reject major write-heavy production operations until verified headroom and off-host DR exist: frontend builds, dependency installation, backups on the source host, restores, paper imports, archive creation and production cutover. No blanket cache cleanup: nine proposed folders have unknown retention/owner status, at least two have active process CWD references. Only SaaS Core under GitHub issue #4 can authorize a reviewed rollback-ready deployment.

## Disk write-budget admission check

    python3 ops/release/a220_write_budget_admission.py \
      --operation frontend-build --planned-mib 2048 --staging-mib 1536 \
      --rollback-mib 2048 --scratch-mib 1024 \
      --out /root/workspace/assps-mission-20261106-a220-private/A220_WRITE_BUDGET_FRONTEND.json

A220 reads actual filesystem free bytes and kernel I/O pressure. The operator-supplied write sizes are intentionally *illustrative assumptions*, NOT observed peak future requirements. The guard requires 16 GiB free reserve PLUS all planned, staging, rollback, WAL and scratch estimates. CLI has no flags to self-certify independent off-host DR, owner approval, or rollback. It **never performs the requested operation**, deploys, deletes or modifies production data. Expected exit 3 = HOLD; 2 = invalid/unavailable evidence; exit 0 would be only eligibility for independent human review.

## Off-host full data/roles/password/ACL/RLS restore acceptance check

    python3 ops/release/a220_offhost_restore_acceptance.py \
      --out /root/workspace/assps-mission-20261106-a220-private/A220_OFFHOST_DR_CURRENT.json

Require two genuinely different host identities and failure domains, cryptographically verified matching archive SHA at both ends, restored production data and global roles including password authentication, canonical ownership and ACL digests, role/RLS policy and FORCE invariants, tenant negative probes, approved encrypted retention, and independently proven rollback. A source/target JSON with all booleans set true is NOT sufficient authorization: source and destination measurements and operator attestations must be independently produced and approved.

A217 proved only **same-VPS** data/role-shape/ownership/ACL parity; password logins and independent off-host restoration were NOT proven. A220 live DR gate fails closed with 22 missing requirements. It never logs raw passwords, secrets or paper content.

## Source, papers and academic blockers

Windows holds four locally DPAPI-encrypted original Saved Paper copies with prior hash proofs; these are device-bound, not portable off-host restoration. Original browser IDs total 58, including nine beyond the earlier 49 and seven same-ID conflicting revisions. Principal must authenticate and authorize each revision disposition and verify full editable Paper Studio restoration.

School 1 had 329 active students, including 220 lacking verified teacher-subject evidence across six cohorts. Assessment 1–4 offerings/results remain incomplete and Assessment 5 source missing. Protect First Term 1,854-result historical hash. Four live attendance published variants still need safe separate Nine/Pre Nine role-acceptance; A213 isolated browser candidate PASS is not a deployed live cutover. Application runtime owns 73 protected FORCE RLS tables, with database/schema CREATE and DDL ownership unresolved; do not misrepresent the scenario as a proven direct RLS bypass.

## Tests and source governance

    python3 -m unittest discover -s ops/release/tests -p 'test_a220_write_budget_admission.py' -q
    python3 -m unittest discover -s ops/release/tests -p 'test_a220_offhost_restore_acceptance.py' -q

Keep an isolated review worktree, independent restored source bundle and clean-main one-commit source branch. Preserve live service, published assets, archived originals, historical results, backup keys and parallel agent worktrees. Do not force-push. No production deploy or removal by this audit.
