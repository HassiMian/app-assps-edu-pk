# Phase 3V — Signed approved Curriculum provider

Date: 3 October 2026. Parent: Phase 3U commit `568fd4e`.
Branch: `feat/paper-signed-approved-provider-phase3v-20261003`.

## Purpose
Phase 3V supplies the dormant Phase3S gateway with a server-only provider contract for independently published Curriculum records. It does not publish curriculum, seed Question Bank, mount an Express route, migrate a database, authorize print, or enable production.

## Trust boundary
- Only `PUBLISHED_APPROVED` server registry heads are accepted.
- Curriculum identity, Full/ALP selection, bilingual book IDs and SHA-256 checksums are bound to the Phase3T authoring digest.
- Publication payload is canonicalized and pinned by SHA-256.
- Publisher attestation must verify against a separately pinned Ed25519 public key and authority scope.
- Author and reviewer must be distinct, with explicit independent-review evidence.
- English and Urdu records must share registered canonical topic identity while retaining independent source topic IDs/pages and exact PDF hashes.
- Record digest covers the complete approved record set, preventing post-signature academic mutation.
- Provider rechecks the publication head after reading records so revocation/replacement during the read fails closed.

## Scope behavior
Full textbook remains the default and requires `alpPolicy=null`. ALP is separate and requires a signed examination year plus independently verified evidence. Client flags, draft reviews and local snapshots cannot manufacture approval.

## Integration proof
A real Phase3S gateway test injects the Phase3V provider and demonstrates that a correctly signed approved source may create only a staging draft. A pending/revoked publication reaches zero repository writes. The returned gateway state remains `approvedForPrint=false` and `authorizesProduction=false`.
## Verification
- Phase3V unit/integration tests include signed Full and signed ALP, bilingual MCQ pairing, source hash/topic mismatch, record tampering, cross-school/tenant/edition refusal, expiry, signer-key failure and revocation race.
- Phase3O–3V targeted regression: **85/85 PASS**, zero failures/skips.
- Provider source has no Express/database/question-bank import, no network fetch, no browser storage and no SQL write statements.
- Construction hard-fails when `NODE_ENV=production` at this milestone.

## Current release boundary
The Curriculum worktree currently contains reviewed Chapter 1 bilingual drafts, not a formally released provider publication. Therefore Phase3V remains dormant and cannot approve those drafts. Academic release still requires formal edition equivalence, exercise/content completeness, terminology review, signed publication records and the separate release gates already documented by the Curriculum workstream.

No production deployment, legacy bank write, official paper mutation or live school database change is performed by Phase 3V.