# V6-F canonical cutover readiness — 2026-10-05

V6-F is a fail-closed readiness layer, not a blind migration. Current production has `paper_vault`, immutable `paper_vault_revision_history`, and old `saved_papers`; canonical `paper_documents` / `paper_revisions` tables are absent. Current row counts at verification were zero across the three existing paper stores.

Admin/Principal-only `GET /api/portal/paper-studio/canonical-readiness` reports registry presence, current repository, row counts, RLS state, explicit approvals and blockers. Teachers receive 403; storage topology is not exposed to them.

Required cutover gates: canonical registry exists; curriculum publisher explicitly production-approved; canonical renderer parity approved; backup/restore drill approved; forced tenant RLS on canonical tables; canonical write gate explicitly enabled. Environment flags cannot override absent tables/RLS. Policy permanently reports no dual-write, no destructive migration and no fabricated source identity.

Acceptance: readiness unit 2/2 PASS; signed projection suite 10/10 PASS; Paper Vault 8/8; Question Bank 6/6; Attendance 16/16. Production endpoint is additive/read-only.
