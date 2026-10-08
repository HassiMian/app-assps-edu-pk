# ASSPS Paper & Assessment Studio — Architecture V1 Release Certification

**Verified:** 2026-10-08 UTC (release closure checkpoint)

**Verdict:** Architecture V1 technical/browser/security gates **PASS** for the already-running component releases stated below. The release-consistency tooling correction is a **separate forward-only, non-runtime commit**, not a claim that this documentation commit has been deployed. No additional frontend/backend restart or production database migration was needed for this closure check.

## Production source of truth

| Component | Verified live Git SHA | Deployment identity |
| --- | --- | --- |
| Frontend | `7887d80427f03c0a028f521ba4a10562cd8e7429` | `release/saas-canonical-production-20261007` |
| Backend | `b829290a7ebb47de9946fc9f2291283c6c0fc90f` | `fix/lesson-planner-pg-client-sequential-20261008` |
| Release guard fix | `45215eb34f52beb54bdda2a83068f34e3ade2471` | `fix/archv1-release-closure-20261008`, descendant of backend SHA; does not change deployed runtime files |

Frontend/backend SHAs are intentionally independent. Their branch tips, ancestry and production metadata were verified separately. The release consistency checker must not assume identical commits. It requires explicit metadata, Git ancestry, exact matching remote branch identity, component scope and deployed contract seals.

## Frozen Architecture V1 contract

- Manual blank paper editing remains independently usable without Question Bank, AI or automation.
- All paper modes converge on canonical `PaperDocument` and the teacher-facing Paper Workspace; legacy/simple editors are compatibility only.
- Question Bank lifecycle and governance, curriculum/source relationships, ScoringPlan attempt-choice rules, immutable revisions, print and DOCX projections preserve release integrity.
- Authenticated school operations enforce tenant/role access; PostgreSQL runtime role must not bypass RLS.
- Urdu RTL/Jameel Noori and English LTR/A4 output are verified with a real Chromium print/PDF path rather than only string snapshots.

## Executed release gates

| Gate | Result | Scope/evidence |
| --- | --- | --- |
| Full frontend Vite production build | **PASS** | `assps_archv1_b829_frontend_build.log`, exit 0 |
| Canonical PaperDocument Chromium screen/print parity | **43/43 PASS** | All official First Term documents, `assps_archv1_b829_all43.log`, exit 0 |
| Saved Papers -> unified teacher Workspace | **43/43 PASS** | `assps_b829_teacher43_browser.log`, exit 0; legacy editor bypass also rejected |
| Genuine Urdu/English A4 PDFs | **PASS** | RTL/LTR and PDF media-box geometry, `assps_archv1_final_a4pdf.log`, exit 0 |
| Early Years specialist browser templates | **12/12 PASS** | `assps_archv1_final_earlyyears_browser.log`, exit 0 |
| Manual create/save/finalize/reopen/print + ScoringPlan | **3/3 PASS** | Includes nested OR and attempt-any rules, `assps_archv1_final_manual_scoring.log`, exit 0 |
| G21 authenticated revision-bound DOCX security HTTP | **9/9 PASS** | Isolated DB + test port, cross-tenant/hash/revision/DOCX bytes SHA, `assps_archv1_b829_g21_http2.log` |
| Authenticated operational backend staged HTTP | **14/14 PASS** | Real synthetic login on alternate port 5384, isolated clone, `assps_archv1_b829_business2.log` |
| Backend curriculum/QBank/release/scoring/domain regression | **33/33 PASS** | `assps_archv1_final_backend_core.log` |
| Full OPS security/release regression | **67/67 PASS** | `assps_archv1_b829_fullops.log` |
| Production live route contract | **PASS** | Protected unauthenticated routes reject appropriately, `assps_archv1_final_live_contract.log` |
| Production safety and release consistency | **PASS** | Zero findings, `assps_archv1_final_production_safety.log`, `assps_archv1_final_release_consistency.log` |
| Full backend deployed-source inventory | **361 matching, 0 drift** | `assps_archv1_final_full_runtime_inventory.log` |
| PostgreSQL RLS live and clone | **75 scoped tables / zero findings each** | NOBYPASSRLS application role and cross-school visibility checks |
| Disposable production-clone migration | **PASS** | 85 public tables; curriculum, Question Bank, Paper Vault, lessons and RLS migration completed |
| Rollback backup integrity and restore | **PASS** | SHA256 verification of frontend/backend/database backups and actual PostgreSQL dump restore (85 tables) |
| Backend release smoke and live API/frontend health | **PASS** | Backend PM2 on PORT=5000, public frontend and API healthy |

## Backup, privacy and residual limits

- Backup source: `/var/backups/assps-paper-v1-rls-pre788-20261008T034456Z`; verified archive `SHA256SUMS` and restored its database dump to a separate disposable database (85 tables, Paper Vault and student aggregates readable). No production-table data was edited for these checks.
- Detailed test proof archive: `/var/backups/assps-archv1-certification-20261008T050900Z` (restricted permissions, 19 logs plus `SHA256SUMS`). Preserve alongside original rollback archives.
- Genuine Chromium PDF output was verified; no physical printer was remotely operated. Teacher Workspace browser tests used synthetic/mock browser authentication; separate alternate-port API acceptance performed a real synthetic school login and tested role-scoped routes. Do not present these as a live user's school-session click-through.
- The ops-only release guard fix was pushed forward and is not represented as a newly deployed frontend or backend binary. Future deployment must verify the exact live SHAs, ancestry, clean inputs, production-clone migrations, rollback, health and postdeploy drift.
- No scheduled follow-up was created. All listed checks were executed in the active release-closure session.

Change preservation: Official First Term and Early Years papers, tenant data, Question Bank governance, unrelated SaaS modules, backups and concurrent agent worktrees were not overwritten. No reverse or stale-branch deployment occurred during this release closure.
