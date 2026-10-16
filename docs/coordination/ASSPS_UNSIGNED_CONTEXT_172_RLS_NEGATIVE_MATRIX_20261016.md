# ASSPS Core — 16 Oct 2026: Full unsigned-context RLS matrix / phase 3

**Source base** `integration/core-unified-p5-20261016@b53bf123cfff54cb5413b472667ed8bf55e0a854`. Isolated audit branch only. Source code and docs do not change live backend, API, Nginx, worker, signers, students or academic records.

## Why
The original policy catalog `CATALOG_PASS_NOT_RELEASE` verifies policy definitions but not actual permission outcomes. The new matrix executes **real, read-only SELECTs** under the actual restricted runtime roles with **no signed tenant ticket** across precisely 77 original protected RLS tables + 9 explicitly named newer evidence/planner/approval tables. This is a defense-in-depth check, not a substitute for real independently authenticated School-2 denial.

## Live results
- Actual RLS table catalog discovered 77/77 signed `core_signed_tenant_guard` tables, with RESTRICTIVE policy, FORCE RLS, and both original/current runtime roles.
- Runtime actors: `assps_marks_signed_runtime` and `assps_core_green_runtime`; each query starts `BEGIN READ ONLY`, `SET LOCAL ROLE`, validates `current_user`, selects only `count(*)` and always rolls back (or aborts with read-only transaction). PostgreSQL `default_transaction_read_only=on` and statement timeout.
- **172/172 actual negative probes PASS.** 159 returned no visible rows; 13 returned PostgreSQL SQLSTATE 42501 permission-denied. **0 unexpected non-zero visibility, role spoofing, or unexpected errors.**
- Source fake-response security tests **8/8 PASS**. They reject wrong actor, non-zero record count, unrelated SQL errors, malformed identifiers and absent role output.
- Separate HTTPS anonymous real checks returned **401** on each of `/api/auth/me`, `/api/exams`, `/api/exams/results`, `/api/exams/results/9`, `/api/daily-diary`.
- Existing accepted real live marks baseline remains **1,763 stored scores / 213 genuine numeric zero marks**, per current read-only prior checkpoint. No table content or user PII printed in this audit.

## Strict limitations
- No authenticated actual School-2 account/session, independent signed tenant challenge, subject assignment denial or genuine signed off-host recovery was generated. The 172 negative probes are **unsigned-context role denial**, not the official signed `School2` release gate.
- No live backend worker installed and no signed transport activated by this audit. Independent signed authorization and previous owner acceptance are not forged or replaced.
- Release `HOLD` regardless of any count/test success until legitimate 13/13 official Core gate + real production postflight. All production records retained.
- Execute read-only command on authorized VPS: `python3 ops/release/core-infrastructure/verify_unsigned_rls_matrix_20261016.py`. CI executes only the hermetic unit tests; never connects to production.

## Scope/rollback
Entire source change limited to standalone audit file + adversarial unit tests + documentation + CI; no runtime files or migrations. Reverting the source commit does not touch production. This branch must be forwarded onto newest verified canonical descendant only after coordination issue #4.
