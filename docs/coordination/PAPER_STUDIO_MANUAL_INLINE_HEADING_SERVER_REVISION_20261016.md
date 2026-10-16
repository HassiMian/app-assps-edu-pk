# Paper Studio — manual paper inline-heading server revision preservation

16 October 2026. Source-only isolated Paper Studio fix on 9604aae76fdf529b46d279c719b3df673876abde. GitHub issue #4 governs integration; SaaS Core alone deploys.

## Real issue and source repair

The canonical Paper Workspace allows bounded question number and heading formatting. User-authored PaperDocumentV2 serialization previously saved only the section's plain heading into the authoritative server document, losing the visual headingSerial and headingInstruction styling even where an older local browser copy still displayed it. Its canonical server-to-browser reconstruction likewise omitted the visual formatting.

An optional USER_AUTHORED-only editorInlineRichText section field now preserves exactly those two visual strings without changing authoritative heading, question content, numbering, question marks, totals, attempt/choice rules, tenant IDs or official/provenance-bound paper source. The editor sanitizes markup before commit. Additional canonical validator limits size to 8192 characters, allows only supported inline visual tags and styles, and rejects script, SVG, iframe, image, event handlers, URL CSS, and unexpected keys. Server rehydration filters suspicious/oversized values, rather than interpreting unsafe HTML. Untouched legacy canonical sections remain unchanged.

## Reproducible acceptance

- Manual assessment canonical unit 14/14 PASS, including new safe round-trip, unsafe input, server-rehydrate denial and legacy section source equality.
- Combined 42/42 Grade IX-X protected approved-only contracts and manual/math/scoring tests PASS. No qualified subject approval implied.
- Actual isolated Chromium manual Weekly Assessment Save, Finalize, Reopen, Print 1/1 PASS against synthetic browser API. Earlier real two-school PG16/JWT E2E on the parent was successful, but NOT independently rerun for this new change.
- Fresh production Vite build EXIT0 and five source static features PASS, isolated HTML SHA256 29370bd628e8355e880d372422b0293d010a8a2bc0cc3fa385cb418054cbe75e.
- No live student marks (including genuine zeros), saved Diary, public papers, Nginx/PM2, backend, real hardware print, or user signatures were changed.

## Boundaries

This additive section extension requires schema compatibility/code review on the current newest Core. Never deploy from a stale Paper-only branch. Official independent Core 13/13 signed production release remains HOLD, including offhost recovery, live signed worker, authenticated School2 evidence. The school will supply genuine signatures and certificates through the preserved self-upload workflow; no documents were fabricated or approvals pursued.
