# A216 — Original paper provenance, published attendance and release authority

**Review-only. No code deploy, paper import, database mutation, role migration, artifact deletion or production rollback.**

A216 uses an immutable previous A215 40m monitor certificate, read-only original workstation evidence, fresh (at execution time) 4-entry published Nginx/JS/import-map scan, live PostgreSQL School1 academic source checks and least-privilege inventory. Exit 3 means release HOLD, 2 unavailable/corrupt evidence, and 0 merely means **ready for independent human release review**, not production deployment.

### Execute on reviewer VPS

    python3 ops/release/assps_a216_provenance_release_boundary.py \
      --out /root/workspace/assps-mission-20261106-a216-private/A216_CURRENT_GATE.json \
      --academic-out /root/workspace/assps-mission-20261106-a216-private/A216_CURRENT_ACADEMIC.json

    python3 -m unittest discover -s ops/release/tests -p 'test_a216_provenance_release_boundary.py' -q
    python3 -m unittest discover -s ops/release/tests -p 'test_assps_academic_release_gate.py' -q

The database access mode is BEGIN READ ONLY + ROLLBACK, and the published module path is checked against the active Nginx document root. Evidence is school-scoped and should be refreshed whenever live publication or student source changes.

### What the school owner must explicitly accept

1. Reopen the original workstation's three Chrome profiles, authenticate again as the Principal and reconcile the 58 observed IDs. The older 49 IDs are included in the 58; nine additional IDs and seven conflicting same-ID versions need explicit review. Do **not** silently choose the newer copy.
2. Four Windows **CurrentUser DPAPI** backup ciphertext hashes and manifest match previously captured source. These protect the source locally but cannot be called a portable encrypted backup. Principal-supervised, passphrase-encrypted export and actual independent restore are needed, with verified same-school ownership.
3. Restore all selected paper versions as editable Paper Studio records in an isolated/staging workflow and verify exact content before any destructive change. Do not claim that 58 recovered source IDs are 58 server papers.
4. Obtain signed teacher assignments and subject approvals for six uncovered cohorts (220 active students), real Assessment 1–4 offerings/marks, and authorized Assessment 5 source. Preserve historical First Term 1,854-row digest.
5. Verify published attendance for Pre Nine and Nine separately in all four real entry shell variants with actual Principal/teacher authentication; prove rollback and lesson planner/diary preservation. Source candidate PASS cannot replace live acceptance.
6. Independently restore full PostgreSQL **data + roles + passwords + ownership + ACL** off VPS. A215 restored database data to a second cluster on the **same VPS** but did not certify offhost identity and ACL restoration.
7. Obtain at least 16 GiB free VPS space **without deleting original backup, historical source, or active agent assets**. Migrate/verify candidates only after owner and offhost backup.
8. Remediate app login DDL ownership and database/schema CREATE privileges via reviewed least-privilege migration. 73/73 app-owned RLS tables are FORCE, so a direct bypass is NOT demonstrated.
9. Coordinate through GitHub issue #4. SaaS Core alone promotes a signed, rollback-ready release. Neither this audit commit nor any source bundle grants merge or deployment authority.

### Evidence trust boundaries

The A216 Windows recheck metadata is a tool-observed SHA-256 file-hash check: it is **not signed device attestation, Principal authorization, plaintext recovery, or a server paper migration**. Its validity is limited to a four-hour observation window. This guard intentionally fails closed for absent/incomplete evidence; never fake approvals in JSON, disable blocker conditions, or change historical baselines merely to get exit 0. Synthetic fixtures demonstrate code behavior, not production readiness.
