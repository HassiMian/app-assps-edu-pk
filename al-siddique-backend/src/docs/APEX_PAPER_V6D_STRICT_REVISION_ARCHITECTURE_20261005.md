# APEX Connect Paper Studio V6-D — Strict Revision Boundary
Date: 2026-10-05. Additive shared backend feature, NOT a second Connect paper store.

## Verified problem
The existing `paper_vault` current-record table has a numeric `revision`, and legacy PATCH checks `expectedRevision` **only when supplied**. It has no immutable previous payload history. Therefore two old clients may still update without CAS, and no honest universal durability claim is allowed. Existing SaaS Phase3AD's more capable `paper_documents/paper_revisions` subsystem is independently reviewed in a feature branch but not production-approved with real school curriculum publisher/credentials. Do NOT pretend to activate it or create a parallel canonical truth.

## Additive V6-D design
Current state remains `paper_vault` in the existing SaaS/shared `apexos` DB. `paper_vault_revision_history` is append-only change history, not independent mutable Connect paper state. A verified pre-migration custom PostgreSQL backup is held root-only at `/root/secure-archive/apex-paper-v6d-20261005/pre-v6d-revision-journal.custom` (`pg_restore -l` passed). Migration `20261005_paper_vault_revision_history.sql` adds PK `(school_id,paper_id,revision)`, origin (`baseline_capture` vs `v6d_guarded_edit`), actor, payload SHA-256 and full JSONB snapshot. First V6-D write captures the currently observed original revision as a **baseline**; do not claim events before that baseline were historically audited.

The new signed `/api/portal/paper-studio` API supports:
- `PATCH /papers/:id`: mandatory integer `expectedRevision`, mandatory 64-hex `expectedSnapshotHash`, and `workingDocument` (NOT untrusted whole-replacement `paper`). Under `SELECT ... FOR UPDATE`, enforce signed owner/school, active assigned class/section/subject for teacher, compare current revision and SHA, independently verify the pinned server-side V6-C lossless bridge exact hash `a6e25426...`, apply only representable question changes, reject nested official/new-authoring formats, reject false/specialist source. No-op returns unchanged without increment. Changed result atomically records baseline (once), updates shared current payload + revision and records next immutable revision in ONE transaction. Stale client gets 409, unsupported edit 422, revoked teacher 403, foreign teacher 404.
- `GET /papers/:id/revisions`: authorized metadata and current CAS tokens, no shared school visibility to teachers.
- `GET /papers/:id/revisions/:revision`: immutable signed owner/school snapshot; on retrieval SHA is independently recalculated and compared. Different teacher gets 404. Admin/Principal retains governed school-wide read.

## Guarantees and limitations
- No new document source-of-truth, no cross-teacher browse, no client-supplied owner IDs, no unauthorized formatting/marks/source rewrites, no Print/PDF/Word approval.
- Append-only snapshots remain within same shared backend and are removed by database FK cascade if the synthetic paper/school is deleted.
- Legacy `/api/paper/vault/:id` PATCH still permits clients to omit `expectedRevision`; it must be migrated or hardened with coordinated frontend changes before a *global* CAS guarantee can be claimed. The V6-D strict endpoint alone is safe but does not automatically eliminate old routes.
- Connect teacher UI's explicit Save Changes, 409 conflict treatment and optional history viewer are a separate next cutover. Never silently autosave/reconcile concurrent edits.
- Real SaaS canonical `PaperDocument` source publication and durable Phase3AD revision registry remain a separate approved migration gate.

## Acceptance
`paper-studio-v6d-revision-http.test.js`: **9/9 PASS** against isolated backend port5018, synthetic school with two teachers/admin. Tests mandatory revision+SHA, wrong SHA409, cross-owner direct update/history404, source binding mutation422, unchanged idempotency, revoked teacher assignment403, first atomic baseline+new immutable snapshot, old/new source preservation incl Urdu/options/unknown fields, stale replay409, admin permission, concurrent 2 writers from one revision = one 200 / one 409 and exactly one new revision. All synthetic records cleaned, DB journal row count returned 0. Existing V6-C projection **8/8**, Vault **8/8**, Question Bank **6/6**, Attendance **16/16** also passed against isolated backend.

## Deployment and rollback
Backend deployment is additive: copy pinned bridge, `paperVaultRevisionV6D.js`, migration SQL, updated `paperStudioRoutes.js`. The schema was already exercised in isolated-server tests against the shared `apexos` database after verified backup; no real paper rows were modified. Backup old route, restart backend, health check and rerun synthetic signed V6-D plus legacy suites. If health fails restore route; retain empty history table for forward-safe investigation rather than destructive database rollback. Do not touch separate SaaS frontend, original school papers, attendance or Connect V6-C green frontend as part of backend rollout.
