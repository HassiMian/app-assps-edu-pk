# A218 — Capacity and Retention Governance (Review Only)

**Release status: HOLD. No data deletion, database writes, production deployment, unapproved migration, or cleanup.**

## Verified baseline and what it means

A217 independently reproduced a PostgreSQL data restore into an isolated cluster **on the same VPS** with source/clone role shape, object owner and effective ACL parity, but **role passwords were not recovered**, and no distinct off-host recovery system was proved. This is evidence of local recovery reproducibility, not an independent disaster recovery capability.

The 16 GiB capacity threshold is a minimum headroom gate and must be observed as actual filesystem free GiB, not estimated bytes from caches. School source, exam marks, original papers, backup archives, secure keys and active CI/agent assets are protected retention domains. Source and asset changes must always pass rollback, owner acceptance and tenant-isolation tests before live release.

## Commands

From this review branch:

    python3 ops/release/a218_retention_capacity_gate.py --out /root/workspace/assps-mission-20261106-a218-private/A218_CURRENT_CAPACITY.json
    python3 -m unittest discover -s ops/release/tests -p 'test_a218_retention_capacity_gate.py' -q

Exit status 3 means justified HOLD; 2 means failed evidence; 0 means all supplied release-review prerequisites are present, **not permission to delete or deploy**.

## Real-world owner closure sequence

1. Assign verified owners to every identified large directory. Cache-like naming does not guarantee replaceability. Confirm no active process, agent, job, Git worktree, recovery backup, paper source, legal-retention requirement or security evidence depends on it.
2. Produce a **separately hosted and independently restored** PostgreSQL recovery with full school data, roles, password authentication, ownership, row-level security policies, GRANT/REVOKE ACLs and exact source-vs-clone invariants.
3. Prove a portable, encrypted, passphrase-recoverable copy of the original paper recovery bundle under owner-supervised authentication, protecting all 58 IDs and separately resolving nine additional IDs and seven conflicting revisions. Never auto-merge or move original plaintext to a shared server.
4. Measure actual free space before **and after** owner-approved, reversible archival. Independently verify SHA-256 of the archived content and a restore path before any source is moved.
5. Retest production publication of all four attendance shells with Pre Nine/Nine distinct roles, all 220 unresolved student-teacher source gaps, Assessment offerings, First Term 1,854 historical checksum and database runtime least privilege. A passing unit suite cannot substitute for actual role-based acceptance.
6. SaaS Core alone may authorize a signed promotion to production, paired with an independently tested rollback. The review branch itself is not a deploy artifact.

## Verified archive integrity (separate private evidence)

Eight 4-Nov-2026 recovery archive SHA256 digests were rechecked against the originally recorded checksums, and 8/8 matched. Three generated node_modules tar.zst archives were identical. The archive content, signing provenance and whether any archived file is still needed by another agent require independent owner confirmation. **Do not deduplicate automatically**.

## Hard exclusions

Never allow this tool or a future cleanup script to recursively remove:

- PostgreSQL production data or the secure backup archive.
- The current published application and retained rollback.
- Original Windows Chrome profiles and DPAPI-encrypted paper evidence.
- Active SaaS mission review worktrees, logs or a source bundle without a separately verified clone.
- Historical First Term results, school academic evidence or certificates.

The test suite uses adversarial synthetic inputs; production approval must come from actual independently authenticated evidence. No release decision should depend solely on a JSON field that a single agent can set.
