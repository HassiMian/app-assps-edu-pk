# APEX Paper Studio V6-E1 — immutable delivery manifest (2026-10-05)

## Purpose
V6-E1 prevents Preview / Print / PDF / Word / Online Test from consuming an unbound mutable paper. Every delivery capability check is bound to `school + signed actor + paperId + exact revision + exact payload SHA-256`.

## Endpoint
`POST /api/portal/paper-studio/papers/:id/delivery-manifest`

Required JSON:
- `revision` integer >= 1
- `snapshotHash` 64-char SHA-256 from the verified revision

Teacher scope reuses the same owner/school boundary as V6-D. Cross-teacher paper IDs return non-leaking 404. Admin/Principal may inspect governed school papers. Wrong hash gets 409 `DELIVERY_SOURCE_MISMATCH`; omission of revision/hash gets 400.

## Immutable revision semantics
- Current revision: reads owner-scoped current `paper_vault` payload and verifies digest.
- Historical revision: reads V6-D immutable revision journal and revalidates journal payload hash.
- The resulting `deliveryKey` hashes the stable manifest core, so a different revision/source yields a different key.
- No paper row, history row or school data is modified by manifest generation.

## Channel policy in E1
- `preview`: compatibility preview may be reported available when source review is not invalid/unknown/unsupported.
- `print`, `pdf`, `word`: intentionally **BLOCKED** with `CANONICAL_RENDERER_PARITY_PENDING`. E1 does not turn old browser/Pro renderers into approved canonical output.
- `onlineTest`: inventories question types. MCQ / true-false / fill blank are auto-grade candidates; short/long/essay/etc may require manual marking. Unknown/diagram/unsupported types block content eligibility. Even eligible current revision remains blocked with `ONLINE_TEST_PUBLISH_ADAPTER_PENDING` until the shared publish adapter exists. Historical revision is blocked for online publish with `CURRENT_REVISION_REQUIRED`.

The API never returns `canonicalWriteAllowed`, `printApprovalClaim` or `publishApprovalClaim` true.

## Acceptance
Isolated backend port 5018:
- V6-E delivery manifest: **8/8 PASS**
- V6-D guarded revisions: **9/9 PASS**
- V6 projection: **8/8 PASS**
- Paper Vault isolation: **8/8 PASS**
- Question Bank scope: **6/6 PASS**
- Attendance integrity/end-to-end: **16/16 PASS**

Synthetic schools/users/papers are cleaned after tests. No real paper content is mutated.
