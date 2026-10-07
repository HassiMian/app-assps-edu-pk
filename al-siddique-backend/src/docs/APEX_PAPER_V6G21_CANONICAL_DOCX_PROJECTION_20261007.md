# APEX Paper Studio V6-G21 — Canonical DOCX Projection

G21 exposes canonical Microsoft Word output through the shared SaaS backend. It does not unlock the legacy Connect DOM exporter.

## Source authority

The download path is revision-bound: `paper_vault current revision + exact snapshot hash -> reviewed PaperDocumentV2 -> G21 canonical model -> OOXML/DOCX`. Only `historical-v13` documents with `SOURCE_VALIDATED` and `PaperDocumentV2` review are eligible. Legacy Connect vault papers and `approved-curriculum-authoring` staging documents remain blocked.

## Endpoint

`POST /api/portal/paper-studio/papers/:id/canonical-docx` with `revision` and `snapshotHash`. The existing role/tenant/owner projection is reused. Cross-owner teacher access remains non-leaking. Historical revisions are rejected for DOCX delivery.

## Delivery Center

The existing delivery manifest exposes `channels.word.state=available_canonical_docx` only when the exact current revision is G21-eligible. The adapter identifier is `V6_G21_SERVER_CANONICAL_DOCX`. All other Word delivery stays blocked with an explicit reason.

## Security invariants

G21 is download-only. It does not mutate source data, persist output, approve curriculum, approve a publisher, enable canonical registry writes, or claim print/PDF parity. It never invokes the legacy Connect DOM DOCX exporter.

G20/G21 model parity is tested across all 43 canonical papers, including Urdu RTL, tables and vertical math.
