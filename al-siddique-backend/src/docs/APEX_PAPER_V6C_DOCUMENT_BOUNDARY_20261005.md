# V6-C — reviewed SaaS document-family boundary (2026-10-05)

## Verified source distinction
Do not collapse incompatible formats merely because both are called PaperDocument.

| Family | SaaS reviewed discriminator | Validation requirements | Live V6-C capability |
|---|---|---|---|
| Official historical V13 | `assps-canonical-paper` / `PaperDocumentV2` / schema 3 | Original V13 dataset hash, normalization manifest and source-paper identity | Exact SaaS validator, read-only review |
| New curriculum authoring | `assps-new-authoring-paper` / `PaperDocumentNewAuthoring` / schema 1 | Real approved curriculum handoff, source ledger, selection, review and protected class/source binding; Phase3R stays `UNSAVED_LOCAL_DRAFT` | Exact SaaS validator, staging-only review; not a publication grant |
| Legacy Connect paper vault | PTS/native and older payload JSON | Existing signed owner/school vault guard; not equivalent to official or new-authoring schema | Compatible access via current legacy editor, read-only migration readiness review |
| Unknown discriminator | none | MUST NOT be coerced | `UNKNOWN_DISCRIMINATOR`, fail closed |

Five exact reviewed SaaS modules from feature branch `feat/paper-persistent-authoring-session-phase3ad-20261003` (`c8adac9`) are pinned by SHA-256 and loaded as a read-only validation snapshot under `services/papers/saasReviewedContract/`. Any byte drift in official/new-authoring/three transitive dependency files fails the review, rather than silently running an unreviewed contract.

## API
`GET /api/portal/paper-studio/papers/:id/document-review` is read-only; it uses the same signed school/owner policy as paper detail. Teacher B receives indistinguishable 404 for Teacher A's ID, including this endpoint. Admin/Principal sees governed school paper reviews. It exposes `family`, `schemaVersion`, `reviewStatus`, `summary`, `snapshotHash`, `issues`, `canonicalWriteAllowed:false`, `printApprovalClaim:false`. It does not modify any payload, issue publication authority, or overwrite a source record.

## Gate results
- Unit tests `paper-studio-v6c-document-boundary.test.js`: **6/6 pass** — exact SHA pins, Urdu source/unknown fields unchanged, fake source invalid, false Phase3R server approval rejected, unsupported inputs fail closed.
- Isolated HTTP suite `paper-studio-v6-projection-http.test.js`: **8/8 pass** — signed teacher context and own papers, cross-owner 404 (detail + review), admin governed visibility, no false canonical authority.
- Existing production API adversarial suites against isolated backend: Paper Vault **8/8 pass**, approved/assigned Question Bank **6/6 pass**.
- Reviewed SaaS Phase3R pure unit suite: **12/12 pass**.
- Synthetic schools/papers/users cleaned at end of each suite; actual historical papers not modified.

## Important limitations
This is an additive **review boundary**, not a full authoring renderer or migration. The advanced Phase3AD branch explicitly lacks real school curriculum publisher/provenance keys and has not been authorised for live canonical persistence or print. Never fabricate original V13 hashes to get a blank paper into PaperDocumentV2; never accept a client-authored `serverApproved` boolean. SaaS remains the only academic/source owner.

## Forward gates
- Frontend lossless legacy bridge separately staged; all source buckets/items and unknown/Urdu/option/bank-revision data must round-trip without deletion. Unsupported reordering/legacy category-level per-question marks are blocked until canonical editor supports their semantics.
- V6-C editor/renderer activation requires round-trip + visual + marks/RTL/print tests, and explicit approved source/blank authoring distinction.
- V6-D will add durable revision-level save/reopen and SaaS registry integration only after reviewed schema migration, backup, RLS and conflict tests.
