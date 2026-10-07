# ASSPS Paper G21.1 — Revision-Bound Canonical DOCX

Date: 2026-10-07

G21.1 hardens the Connect canonical Word projection so that export authorization is bound to one immutable paper revision and its exact snapshot SHA-256.

## Contract

1. `POST /api/portal/paper-studio/papers/:id/delivery-manifest` receives `{revision, snapshotHash}` and revalidates the owner/tenant-scoped immutable revision.
2. The manifest exposes `docxProjection` and sets `channels.word.state=available_canonical_docx` only when the source is a source-validated historical V13 PaperDocument and the requested revision is the current revision.
3. `POST /api/portal/paper-studio/papers/:id/canonical-docx` requires the same revision and snapshot hash and repeats the immutable revision/tenant/source-family checks before generating OOXML.
4. The old unbound `GET /papers/:id/docx` path is fail-closed with `REVISION_BOUND_DOCX_REQUIRED`.
5. Legacy Connect vault papers, unknown families, invalid canonical documents, foreign-tenant/foreign-owner papers, stale hashes, and non-current revisions cannot produce canonical Word output.

## Safety

- No canonical registry writes.
- No publisher or academic approval mutation.
- No print/PDF gate changes.
- No copied Connect DOM renderer authority.
- Canonical Word generation still uses the G20/G21 canonical PaperDocument model and server-side OOXML adapter.

## Verification

- Full managed cloned-DB Paper Studio regression: 130/130 PASS, fail 0.
- G21 HTTP test now covers server capability metadata, canonical/legacy delivery-manifest Word state, old unbound-route rejection, invalid-id rejection, legacy rejection, cross-tenant non-leaking 404, stale-hash rejection, and successful exact revision-bound DOCX output.
- Existing V6-E delivery manifest regression remains PASS, including native print lock semantics.
