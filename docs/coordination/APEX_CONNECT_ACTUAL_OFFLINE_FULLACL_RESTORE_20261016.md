# APEX Connect — Actual independent-on-host ACL restore rehearsal

**Execution date:** 16 October 2026 (Pakistan). **Scope:** disconnected local PostgreSQL test instance; no production restoration or signed offsite approval.

## Verified reproducible actions

A root-private PostgreSQL custom-format dump was generated from production using `pg_dump -Fc --create` without any production write. Exact candidate archive SHA256: `e4564c8228994c4b395d43e73ca02c3d308cefad55b5b241f2d4a7becd17e277`. Original approved-but-expired backup SHA256 `a989b0ef674014109f1f30108a56e9fe4555027712ede8aaed9f82a397f7169a` remains unchanged.

Created a **new PostgreSQL 16.15 cluster**, mode 0700, under `/var/lib/postgresql/assps-connect-core-restore-qa-20261016`. All networking disabled (`listen_addresses=''`); its only interface was a mode-0700 Unix socket and private port 55664. Using real `pg_dumpall --globals-only --no-role-passwords`, established isolated role identities and grants; expected initial role `postgres` duplication is confined to the sandbox. Imported the fresh custom-format full dump with `pg_restore --create --exit-on-error --verbose` **EXIT 0**, retaining real ownership, per-object ACL and default ACL metadata. Original dump had root-only permissions; its read-only byte-identical copy was placed inside the sandbox for the restore.

**Actual live vs restored parity** from read-only PostgreSQL SQL:

| Invariant | Live | Restored |
|---|---:|---:|
| Exam result records | 1,763 | 1,763 |
| Genuine numeric-zero results | 213 | 213 |
| School1 Exam9 saved results | 1,762 | 1,762 |
| User schema tables | 98 | 98 |
| RLS enabled tables | 87 | 87 |
| FORCE RLS tables | 83 | 83 |
| RLS policies | 379 | 379 |
| Effective grant entries | 1,685 | 1,685 |

Normalized role/owner/RLS flags, **effective ACL entry identities** and **RLS policy definitions** had matching digests. Exact student row-content digest parity and examination-result row-content digest parity both **PASS**; no sensitive records or row hashes published. A raw `relacl` serialized array digest differed in ordering; its normalized effective grants and owner comparison **matched** and no false ACL drift claim was made.

Private full restore log is protected at `/root/assps-release-evidence/connect-fullacl-offline-restore-20261016/isolated-pg-restore.log`, mode 0600, SHA256 `a88c993b63ed6dffc774f641aa51812ce596f71076645451b0510f6b834cb0ad`, **zero `pg_restore: error:` entries**. This log includes internal schema names and is not committed or linked publicly. Actual sandbox shutdown successful; Unix socket removed; disposable test cluster and its data erased. Original current production results remained 1,763, and `api.assps.edu.pk/health` HTTP200.

## Core authority and remaining security gate

This successfully proves a **real same-host disposable full-ACL restore**; it does **not** provide independent off-host, signed, owner-attested disaster-recovery proof. This archive is **not** an officially pinned production release SHA until SaaS Core reviews and adopts it through its own governed release source and verifies authentic receipts. Official Core gate previously rerun **HOLD 6/13** because the former exact pinned backup aged beyond the required 24-hour validity, along with six missing independently certified worker/transport/tenant checks. This isolated restoration must not be conflated with live worker authentication, signed School2 denial, or full protected deployment.

Connect neither touched the live Nginx root/PM2 nor modified student results, Diaries, Result Cards, Paper Studio or physical printer. School handles its own genuine evidence self-upload; Connect should not fabricate or request replacement signoffs.
