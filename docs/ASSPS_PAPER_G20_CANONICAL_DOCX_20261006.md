# ASSPS Paper G20 — Canonical DOCX Export

Date: 2026-10-06

G20 adds Microsoft Word `.docx` export to the canonical SaaS PaperDocument editor without reusing the copied/legacy APEX Connect DOM export path.

## Authority

`PaperDocument` remains the source of truth. The export pipeline is:

`PaperDocument -> canonicalDocxModel -> OOXML/DOCX adapter -> browser download`

The model preserves canonical node identity, node type, direction, marks evidence, section ownership, tables, MCQ options, fill blanks, matching columns, grammar tables, vertical math, and read-only structural nodes.

## Safety boundary

APEX Connect's legacy/source renderer remains `deliveryLocked` for DOCX. G20 does not unlock or bless the copied Connect DOCX renderer. Connect may consume canonical DOCX only after an explicit projection/integration gate proves that it is using this canonical SaaS path rather than its legacy renderer.

## Evidence

- Canonical corpus projection: 43/43 papers, 1027 nodes, all 15 canonical node types.
- Structured export coverage includes RTL, tables, and vertical math.
- Real OOXML binary tests PASS for English, Urdu RTL, and synthetic bilingual content.
- Real Chromium download tests PASS for canonical English and Urdu papers.
- Canonical editor browser regression 20/20 PASS.
- Canonical screen/print parity 43/43 PASS.
- Frontend production build PASS.

No publisher approval, academic approval, canonical registry write permission, or Connect legacy DOCX approval is implied by G20.
