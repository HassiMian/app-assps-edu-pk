# ASSPS Grade IX–X Source and Academic Readiness — VPS reconciliation, 8 October 2026

> Isolated development evidence only. Nothing in this report grants question approval or production-publication permission.

## Verified engineering

- Canonical certified production baseline was not modified or deployed.
- 12 specified catalog official-byte attestations are in the source manifest, and their local cache SHA-256/PDF magic/byte lengths were independently rechecked.
- 110/111 official catalog records have local hash-matched sources; only 037 remains unattested.
- 38 stale cache pointers were replaced with current hash-matching paths. The original references remain in history. Independent follow-up scan: 110/110 valid; 0 stale known-hash references.
- Four newly added Grade X Tech seed files were MCQ-rebalanced (25 option-position adjustments); correct answer identity is preserved.

## Current provisional authoring inventory

| Measure | Count |
|---|---:|
| Generated provisional files | 56 |
| Generated provisional questions | 2411 |
| Full unique authored questions | 2581 |
| Starter questions | 2096 |
| Questions outside starter corpus | 485 |
| MCQs in generated package | 809 |
| Duplicate IDs | 0 |
| Official source identities with starter questions | 55/111 |
| Source identities without starter questions | 56 |
| Starter questions missing verified physical pages | 1144 |
| Verified exercise indices | 0/111 |
| Academic approvals | 0 |
| Publication-enabled provisional questions | 0 |

## Verified tests

- Source, cache, governance, MCQ and release-boundary tests: **24/24 PASS**.
- Grade IX–X staging tests: **510/510 PASS**.
- Production safety gate: **PASS**.
- Full local verification including frontend build: **PASS**.
- Protected-template verification: **PASS** (6 protected files unchanged).
- Git whitespace check: **PASS**.

## Remaining academic and source gates

- **Catalog 037** (Grade IX Computer-Tech, Urdu): official linked asset timed out. It has no attested bytes/hash, so it stays blocked.
- **Source pages**: 1,144 starter questions require real page proof; source hash and PDF page count do not certify exercises.
- **Content mapping**: 0/111 verified exercise indices. The current 547 extracted anchors are candidates, not verified chapter/page maps.
- **Book accessibility**: 80 image-heavy/no-text PDFs and 13 partially extractable PDFs need independent visual/manual review; even a text-rich PDF can contain pages with only a watermark as extractable text.
- **Academic review**: original-question answer/key checking, bilingual parity, independent reviewer signoff, and publication permissions remain outstanding.
- **Tenant import / production**: no new database write, approved import, or production deployment was performed. The provisional corpus is not automatically selectable for approved papers.

## Decision

**Engineering/source-cache reconciliation: PASS. Academic completion and approved-production readiness: BLOCKED.**
