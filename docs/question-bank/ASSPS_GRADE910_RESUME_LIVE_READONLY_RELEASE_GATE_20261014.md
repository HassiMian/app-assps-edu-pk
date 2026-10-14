# ASSPS Grade IX–X — resumed authoritative release gate (14 October 2026)

## Verified source ancestry
Continued from the newest **clean, pushed** Academic Master checkpoint on `fix/grade910-real-principal-upload-role-20261014`, SHA `8285c828738477f7e5e604a5035bd0585b9cc977`. This includes the direct canonical Paper Workspace approved-only import + Save/Reopen/Print server source-revision checks, safer Principal/admin personal adopted-book signature forms, signed-school REST guard, encrypted signature database migration `030`, immutable approved-only publisher migration `031`, revised DB CHECK binding staff action to actor role, and no alteration to original research candidates.

This dedicated isolated follow-up branch adds `ops/qbank/probe-grade910-live-readiness.cjs`. Its **only real live database operations** are a PostgreSQL `BEGIN TRANSACTION READ ONLY`, aggregate SELECT queries and COMMIT (ROLLBACK on error). Test mocks assert there is no INSERT, UPDATE, DELETE, DROP, ALTER or CREATE. It treats absence of genuine staff, signed school authorization, review and deployment proofs as a **nonzero exit / HOLD**, never calls missing tables, never seeds questions or attempts to impersonate Principals.

## Real read-only live observation (2026-10-14)
Executed independently as local PostgreSQL OS user against live `apexos` on PostgreSQL port 5432. Scope is **school_id=1**, NOT the all-tenant snapshot:
- Active school users: `admin=3`, `teacher=19`, *no active account with `principal` role observed*. This is why a legitimate admin can submit only their **own pending** textbook-adoption evidence. Principal academic approval still requires actual authorized identity; the admin role must never impersonate a Principal.
- Scope `students=318`, `exam_results=1762`, `question_bank=2470`. These are school-1 current live aggregate counts, distinct from previously restored **all-school** archival counts of `322 students/5,190 Question Bank` and different observation times. **Do not compare as deletion or drift.**
- `core_security.signed_school_allowed(integer)` function **exists**; presence is not proof that active traffic carries the genuine transaction/actor-bound Core signature.
- Both `grade910_human_signoff_evidence` and `grade910_verified_paper_publications` live production tables are **ABSENT**.
- Genuine human signoff claims=0, certified publications=0, real staff Save/Reopen/Print browser acceptance=NOT CERTIFIED; active signed restricted Core role and production rollback receipts=NOT CERTIFIED.
- Probe exit code **2 = intentionally HOLD**. No production user/role/password/marks/paper/tenant changes or live migrations were performed.

## Focused and full QA
- Existing 30/30 source+staging mission on precise predecessor `8285c82`: **19 source gates + Paper Studio 510/510 + Academic 568/568 = 1,078/1,078 PASS, 0 failed, 0 skipped**. Private audit `/tmp/assps-grade910-principal-final-audit-20261014/mission-audit.json`. Latest branch should rerun this after probe addition.
- New five adversarial read-only live-probe tests PASS (real missing tables, synthetic table count not real certification, absent Core signed guard, failing SQL ROLLBACK, unknown school pre-query refusal).
- Previously passed isolated PostgreSQL source migrations, per-school FORCE RLS, 120-KB AES-256-GCM signature storage, no publisher INSERT grant, enforced faculty/Principal identity separation and private browser signature upload.
- SaaS Core controls the release window and a full **non-destructive** live rollback. Historic database backups must never overwrite newer marks. Manual papers and original Grade IX/X research questions remain unchanged.

## Actual remaining release conditions (cannot manufacture)
1. Real school Principal personally uploads their own textbook signature and edition adoption evidence via genuinely authenticated school account after the Core service is deployed. No active Principal role was observed; authorized role assignment requires the real institution.
2. Qualified independent subject/Urdu reviewer correctness judgments are deferred by user; they cannot be impersonated or declared completed. Research candidates stay unapproved until independently reviewed.
3. A real school-root Ed25519 trust chain/signatures bound to each exact published question/answer revision and Paper Studio release grant must pass detached signature verification.
4. SaaS Core must bring the currently source-only backend endpoints, safely migrated signed Core restricted runtime, and key provisioning live under current canonical branch and tenant-aware JWT staff sessions.
5. Paper Studio must accept authorized Principal/teacher Save/Reopen/Print on a real browser (including OS print) and certify active Core signed cross-tenant denial, immutable revocation, printer parity and tested real traffic rollback.

**Authoritative state: SOURCE/STAGING QA PASSED; LIVE GENUINE ACADEMIC PUBLICATION + REAL PRODUCTION RELEASE = HOLD.** Counts alone are no substitute for source provenance and independent qualified human correctness.
