# ASSPS Paper G21 — Connect Canonical DOCX Projection

Date: 2026-10-07

## Purpose

G21 lets APEX Connect request Microsoft Word output from the canonical SaaS paper boundary without restoring the copied Connect DOCX renderer as an authority.

## Server authority

`GET /api/portal/paper-studio/papers/:id/docx`

The endpoint:
- reuses the existing signed-session school/owner paper projection guard;
- reviews the stored payload with the pinned V6-C document discriminator;
- permits export only for `historical-v13 / SOURCE_VALIDATED / PaperDocumentV2`;
- returns `409 CANONICAL_DOCX_NOT_ELIGIBLE` for legacy Connect vault, staging-authoring, unknown, or invalid families;
- binds the response to paper revision and canonical snapshot SHA headers;
- performs no persistence, approval, publication, or canonical-registry write.

## Semantic parity

The backend projection model is regression-checked for exact deep equality with the G20 frontend canonical DOCX model across the complete 43-paper canonical corpus (1027 canonical nodes / 15 node types).

## Connect boundary

Teacher Paper Studio consumes `document-review.capabilities.canonicalDocx`. The Word button is enabled only when the server says `eligible=true`; otherwise the existing `DOCX locked` state remains. The browser calls only the server canonical DOCX endpoint. The old Connect DOM/export implementation is not used by this canonical path.

The Next proxy now preserves binary response bytes plus Content-Disposition and canonical snapshot/family headers instead of coercing non-JSON responses to text.

## Verification

- G21 model/binary/eligibility unit tests: 3/3 PASS.
- G21 isolated HTTP lifecycle: 4/4 PASS (owner canonical 200 DOCX, legacy 409, cross-teacher 404, admin school-scope 200).
- Full isolated Paper Studio regression: 126/126 PASS, fail 0.
- Connect G21 projection source gate: 8/8 PASS.
- Existing cross-stream boundary PASS.
- Connect provenance-attested production build PASS at renderer source commit `d6d65c852db9db2cd70ece2b29d5844e0fa76987`.

G21 does not alter publisher approval, academic approval, canonical registry write state, or the G18 human-authority boundary.
