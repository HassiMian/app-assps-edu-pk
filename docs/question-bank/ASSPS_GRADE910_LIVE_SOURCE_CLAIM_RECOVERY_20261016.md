# ASSPS Grade IX-X — Real Source Claim Recovery, 16 October 2026

**Scope:** live School 1, Grade IX/X **read-only** provisional-question metadata versus existing 111-entry official textbook catalog manifest and offline protected PDF bytes. This does **not** establish the school's current academic-session textbook adoption, exercise/paragraph/page accuracy, qualified faculty review, or authority to publish.

## Independently machine-verified source identity

- **2,411/2,411** current provisional question rows have SHA-256 claims matching manifest source PDF identities, by catalog identifier or unique hash matching.
- **56/56 referenced distinct cached PDF byte files** have SHA-256 matching their source manifest record (and a PDF header). **0 corrupted cached source PDFs** in this run.
- **998** legacy numeric `page N` assertions fall within the matching catalog's reported PDF page count. **These are only importer/author page claims**, NOT physical question page verification.
- **95** references are `toc-page` (table-of-contents pages), and **1,318** have other forms of chapter/general/pending source without an exact question page.
- Grade IX: 1,530 candidates, 555 in-range original page assertions, 95 TOC assertions, 880 without exact page.
- Grade X: 881 candidates, 443 in-range original page assertions, 438 without exact page.
- **0** questions were academically approved, altered or published in this audit. `question_bank.source_page_no` is not silently filled from the author metadata. Real teacher reviewer signatures and ASSPS 2026–27 textbook edition adoption remain separate evidence requirements.

## Prioritize source-page checks without inventing pages

| Grade | Subject | Without exact page | Recoverable unverified page claim |
|---|---|---:|---:|
| 10th | Urdu | 95 | 0 |
| 9th | Urdu | 92 | 0 |
| 10th | Computer Science | 80 | 0 |
| 9th | Chemistry-Tech | 78 | 0 |
| 9th | General Science-Tech | 66 | 0 |
| 9th | Physics-Tech | 64 | 0 |
| 9th | Agriculture Sciences-Tech | 60 | 0 |
| 9th | Computer Science & Entrepreneurship-Tech | 60 | 0 |
| 9th | Biology-Tech | 54 | 0 |
| 9th | Tarjuma-tul-Quran | 54 | 0 |

This is a **triage ordering**, not a recommendation to avoid other subjects or a proof that the listed questions are incorrect.

## Reproducible and autonomous execution

- Source parser: `ops/qbank/audit-live-grade910-source-claims-20261016.py`, schema `assps-live-source-claim-audit-v1`. Reads PostgreSQL under an explicit `BEGIN TRANSACTION READ ONLY` using the existing peer-authenticated Postgres identity.
- Every original catalog claim is checked against the **actual official manifest hash** and locally available PDF hash; TOC, chapter-only, shared-authority, uncertain page boundary, hash mismatch, grade mismatch and out-of-range claims fail appropriate provenance or remain clearly provisional.
- 13 hermetic tests PASS (including malformed/null hash, page overflow, old TOC, fake approved, PDF byte hash tampering, path traversal and 0600 private evidence permissions).
- Root-only complete ID-level private evidence: `/root/secure-archive/assps-grade910-live-source-evidence-20261016/claims.json`, SHA-256 `159f749e4ef81eb1e5e3283f5b93feec7c55dc8a325e55c05bfe538579034d61`.
- Source-controlled systemd timer is designed for Sunday 03:35 PKT, **after** the separately installed full academic source QA at Sunday 02:30 PKT. Public app/student marks/Nginx and any real printer remain untouched.
- Official publication remains blocked when genuine source page content, edition adoption and revision-specific qualified review are not authenticated. This is not the same as re-requesting general institution-level Principal consent, which has already been acknowledged.

**Source branch:** `audit/grade910-live-source-claim-ledger-20261016`, derived from authoritative Academic Master `c6b74980f4007217d2694a85b4fb266d46ec9e52`. GitHub issues #1 and #4 coordinate Core/Paper consumers; no direct cutover or provisional-question approved flag performed.
