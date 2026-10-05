# V6-G — evidence-bound Curriculum publisher production gate
Date: 2026-10-05

V6-G removes the last boolean-only trust assumption from canonical cutover readiness. `PAPER_CURRICULUM_PUBLISHER_PRODUCTION_APPROVED=true` is no longer sufficient by itself. It becomes effective only when an independently pinned publisher evidence bundle validates.

## Required coordinates
- `PAPER_CURRICULUM_PUBLISHER_EVIDENCE_PATH`
- `PAPER_CURRICULUM_PUBLISHER_EVIDENCE_SHA256`
- `PAPER_CURRICULUM_PUBLISHER_SOURCE_COMMIT`
- reviewer approval flag `PAPER_CURRICULUM_PUBLISHER_PRODUCTION_APPROVED=true`

The evidence manifest remains `evidenceOnly:true` and `approvalClaim:false`; it never self-authorizes production.

## Reviewed preflight
V6-G pins the exact Phase3AB independent Curriculum readiness preflight bytes (SHA-256 `18d871d93648a78f13e539e4000e9dfeb20f4722f18024b8df0e8b939325084e`). It verifies an official bilingual source pair, reviewed editions, independently verified chapter/exercise indexes, published academic records, bilingual edition equivalence, a genuine pinned-Ed25519 signed publication, and eight independent operational reviews. A status report never grants publication itself.

## Current production evidence
Evidence bundle: `/root/secure-archive/apex-paper-v6g-20261005/`.
Canary source: Grade 9 Biology (English `pectaa-catalog-009`, Urdu `pectaa-catalog-010`).
Curriculum source commit: `d6b294db53a9aa5a8f19c6bae5ecbb673996be5c`.
Evidence manifest SHA-256: `ac98f296f98f69ec9dadedd3021dffc90d614546151bb01ccdcea2be4487b7ca`.
Official manifest SHA-256: `e20e727720359036a01aeb3b9b2faeeae169f27f6617b0744ddf72c2ad5fc293`.
Dry-run report SHA-256: `8eda0b754c5f2a4f58c992ce02ebf8341c9f63933845f1e5a19865ad57867e2a`.
Technical source reacquisition SHA-256: `c4afa9d06b2e4299b624a5f4f9ef6b17b32fd44978d9274923ee5b9a86286332`.

Current evidence is intentionally **BLOCKED**, not approved:
- no independently approved live academic seed records;
- English PDF bytes are verified but edition review is not approved;
- Urdu edition remains `VERIFY`;
- English and Urdu chapter/exercise indexes remain pending;
- academic question releases remain blocked;
- bilingual edition equivalence is not independently approved;
- no genuine signed production publication exists;
- required independent operational reviews are pending;
- approved question count is zero;
- live import and publisher key-custody approvals are false.

Therefore canonical write remains disabled. No source identity, review, signature or approval is fabricated.

## Tests
- Publisher evidence verifier: 5/5 PASS, including complete synthetic evidence, manifest tamper, artifact tamper, fake signature/review, and the real blocked evidence bundle.
- Readiness tests: current cutover remains fail-closed.
- Isolated backend on port 5022: Paper Studio signed projection 10/10 PASS; Paper Vault 8/8 PASS; Question Bank scope 6/6 PASS; Attendance 16/16 PASS.

## Cutover rule
Canonical writes may only be considered after BOTH:
1. objective publisher evidence validates, and
2. the explicit human/release approval flag is set.

Even then the separate `PAPER_CANONICAL_REGISTRY_WRITE_ENABLED` gate must be independently enabled after final canary/rollback review. No dual-write and no destructive migration are allowed.
