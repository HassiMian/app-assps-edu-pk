# Saved Papers: unified visibility across two independent authorities

The production Connect Saved Papers tab reads the canonical paper vault only.
The separate backend /portal/paper-studio/library endpoint reads the vault and
the Assessment Studio persistence store with appropriate server-side role scope.

Observed 1 Nov 2026: paper_vault 12 records, assessment_papers 4 records.
Only 2 Assessment Studio records have available latest revisions. The
two remaining metadata-only entries must not be represented as editable papers.

This source-only UI review candidate adds a separately sourced Assessment Studio
collection to Saved Papers, with server-authorized read-only revision summaries.
It never passes an assessment paper identifier into canonical vault edit or
delete endpoints. Full assessment editing remains a separately approved workflow.

Staging JSX parse and component ESLint passed. An isolated Next.js build
compiled, and a local canary served HTTP 200 login and 302 protected-page redirect.
The isolated build needed staging-only workarounds for unrelated, existing APEX
CSS-module syntax and an archived src-backup typechecking error. Trusted renderer
source provenance is not certified, so this source review is NOT a live UI deploy.
