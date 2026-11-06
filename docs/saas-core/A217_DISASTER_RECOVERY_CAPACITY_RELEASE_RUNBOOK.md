# A217 — Same-host role/ACL recovery, emergency capacity, and release authority

**Scope:** November 6, 2026, read-only School 1 production audit and isolated test cluster. Only the *new ephemeral PostgreSQL instance* received temporary staging data. Production data and live assets were not modified. Do **not** treat this file as authorization for a publication or removal of school records.

## Significant verified improvement

A previous same-VPS recovery drill established student/marks/JSON aggregate parity but explicitly omitted role/ownership/ACL verification. A217 repeated a consistent PostgreSQL 16 custom-format database dump into an **independently initialized cluster on this same VPS**, with Unix-domain socket only and TCP listener disabled. It restored global **role shapes WITHOUT passwords** and restored the database WITH object owners and ACLs intact.

A canonical catalog check across **610 records**, including role flags/memberships, database/schema ownership, relation owners, effective ACL privileges, row-security/force-RLS flags and policy metadata, was identical between production and isolated restore. A selected read-only school data aggregate (students, 1,854 First Term result SHA, paper counts and RLS policy count) also matched. The temporary database cluster and archive were deleted after the drill.

### Critical distinction

A217 certifies **same-VPS** data + role-shape + object-ownership + effective ACL *comparison*. This is **not** full off-host disaster recovery. Role passwords were excluded using PostgreSQL --no-role-passwords. No cross-device decryption key test, independent storage availability, or Principal-authenticated restore was performed. Do not report a disaster-recovery RTO/RPO from this test.

PostgreSQL can represent an owner's full grant explicitly or as an implicit default. Compare effective permissions, using acldefault for absent relacl, **not** the raw text representation of relacl. A217's first comparison rejected an equivalent implicit owner grant; a corrected effective-ACL query was rerun and returned exact 610/610 catalog parity. Both failed and corrected executions are preserved as review evidence; no failure has been erased.

### Reproduction (authorized isolated reviewer only)

Source: ops/release/experiments/a217_same_host_owner_acl_drill.sh

The script uses runuser postgres, consistent pg_dump/pg_dumpall snapshots, and an isolated PostgreSQL cluster under a single guarded /tmp/assps-a217-isolated-dr-* path. The temporary directory is created as mode 0700, owned by postgres; the server listens only on its protected Unix socket. Passwords are deliberately excluded. A cleanup trap stops the isolated postmaster and deletes temporary files, including plaintext database archives. Deletion is **not** verified cryptographic secure erasure.

Do not run this script on a busy or near-full disk without availability review. It is **not** an off-host disaster recovery recipe. Never point pg_restore at the production cluster. Review script paths and the completion certificate first.

## Emergency storage classification

- VPS root volume is about 96 GiB and reached approximately 95–96% usage. The release guard requires **at least 16 GiB free**; about 11 GiB of additional verified capacity is currently needed.
- Original Windows workstation C: has only about **2.21 GiB free**; no psql, pg_restore, or Docker was available at verification. It is not a qualified off-host database restore host.
- Large workspace items (QBank source cache, isolated worktrees, creative-recovery archives, historical source backups) may be unique source or active agent evidence. **No automated deletion.**
- The conservative recommendation is to provision more verified storage capacity (preferably a new encrypted off-host backup target with several GiB spare plus a separate VPS disk expansion). Revisit ownership and backup provenance before treating any duplicate as disposable.
- Do not delete /var/lib/postgresql, /root/secure-archive, original saved papers, active branches, agent state, or authenticated school files as a quick-fix.

## Production release still blocked

Source: A216 fail-closed gate and A217 gate. The original 58 recovered browser paper IDs include 9 IDs beyond the previously known 49 and 7 same-ID different-content revisions; owner adjudication and portable encrypted backups are pending. Four actually published attendance module variants still contain unsafe Pre Nine / Nine fallback, despite a passing isolated candidate. School 1 has 329 active students, 220 in six sections without approved source-bound teacher subject evidence; Assessment 1–4 have four headers but no authorized offerings/results; Assessment 5 source absent. First Term 1,854-row digest unchanged.

App-owned protected RLS tables remain 73/73 FORCE; this is **not** evidence of a direct RLS bypass. The generic runtime login still has database/schema CREATE privileges and protected table ownership, so least-privilege remediation remains required.

No live role/ACL change, anonymous write, production frontend deployment, original-paper import, automated backup deletion or fee-voucher edit was performed.

## Independent off-host acceptance still mandatory

SaaS Core release owner must choose an isolated storage destination with sufficient capacity and customer-data protection. A genuinely **independent** PostgreSQL 16 restore must reconstruct and exercise all required role credentials, role memberships, ownership, effective ACLs, row policies, extensions, application connections and backup decryption keys. Perform School 1 and cross-tenant authenticated tests with explicit rollback. Preserve original-browser paper provenance and obtain signed Principal/Teacher acceptance of the four published shells. Only after all 11 prior release blocker categories and A217 recovery/capacity blockers close may a Core release owner consider signed publication.

## Verification commands

    python3 -m unittest discover -s ops/release/tests -p 'test_a217_capacity_disaster_recovery_gate.py' -q
    python3 ops/release/a217_capacity_disaster_recovery_gate.py \
      --out /root/workspace/assps-mission-20261106-a217-private/A217_CAPACITY_DR_GATE_CURRENT.json \
      --school-out /root/workspace/assps-mission-20261106-a217-private/A217_CAPACITY_SCHOOL_CURRENT.json \
      --school-academic-out /root/workspace/assps-mission-20261106-a217-private/A217_CAPACITY_ACADEMIC_CURRENT.json

Return codes 3=HOLD, 2=unavailable/invalid evidence, 0=eligible for independent human review (never deploy). Synthetic unit fixtures cannot override live source or operator signoff.
