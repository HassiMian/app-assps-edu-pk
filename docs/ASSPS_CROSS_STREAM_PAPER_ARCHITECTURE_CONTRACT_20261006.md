# ASSPS Cross-Stream Paper Architecture Contract
Date: 2026-10-06

## Authority
`app.assps.edu.pk` SaaS is the canonical owner of paper truth: PaperDocument, paper families, revisions, Question Bank governance, templates/rendering rules, curriculum bindings, persistence and release lineage.

## APEX Connect boundary
APEX Connect is a role-aware projection/client of the canonical SaaS paper platform. It must not create a second paper/question truth, parallel saved-paper database, alternate revision model, or client-trusted ownership boundary. Teacher Paper Studio consumes `/api/portal/paper-studio/*` and the shared backend contracts.

Primary Teacher Paper Studio workspaces are: Studio Home, Create Paper, Question Bank, My Papers. AI/PDF/scan/board-pattern are Create Paper ingestion methods; Online Test is a delivery/publish mode.

## SaaS Repairing boundary
SaaS Repairing owns app-shell/UI/UX/workflow repair only. It may improve navigation, responsive behavior, hierarchy, theme tokens, accessibility and frontend reliability. It must not redefine PaperDocument, paper-family routing, Question Bank governance, persistence/revisions, renderer semantics, protected templates, marks/numbering, RTL rules or tenant/auth policy.

## Canonical pipeline
Source/Blank/Bank/Duplicate/AI/PDF/Scan/Board Pattern -> canonical PaperDocument -> universal Paper Workspace -> validation/RTL/layout -> preview -> immutable revision persistence -> Print/PDF/Word/Publish.

## Protected families
Historical official/reference corpus, Early Years worksheet track, new-authoring format and legacy compatibility remain distinguishable. Unknown discriminators fail closed. Saved paper content is revision-bound; future Question Bank changes do not silently mutate saved papers.

## Cross-stream release gate
Any change touching PaperDocument schema, paper-family routing, editor semantics, persistence/revisions, Question Bank governance, renderer/print output, auth/tenant boundaries or shared backend must be integrated on top of current production lineage before deployment. Stale feature branches must not deploy independently.

Current coordination baseline at creation: `27df8a46c106f43d1be755f76573c89dd8bbdb91`.
