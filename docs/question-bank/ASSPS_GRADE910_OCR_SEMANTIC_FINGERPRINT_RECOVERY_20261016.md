# ASSPS Grade IX–X — OCR checkpoint fingerprint recovery (16 October 2026)

This is an Academic Master source-safety repair, not a production frontend/backend
release, question publication, teacher signature or certification of school textbook
adoption.

## Genuine failing condition

The prior four-page OCR checkpoint was SHA-bound to the **entire serialized**
`question-page-textlayer.json` receipt, including volatile `observedUTC` and
`originalClaimsSHA256`, even when source evidence had not materially changed.
The existing Sunday 03:35 source-audit service regenerated that receipt and
the next low-CPU OCR smoke run failed closed with
`OCR_FAIL_CLOSED OCR_RESUME_SOURCE_HASH_CHANGED`. The original private checkpoint
contained **4 scanned PDF pages and 24 ID-only question-page assessments**,
with zero academic approvals or published questions.

## Proven technical repair

The OCR resume fingerprint now hashes the original cached manifest bytes,
all live question stem revisions, and **canonical semantic PDF page evidence**:
question ID, official source catalog, claimed PDF page number, actual page
text-layer SHA256, extracted-character count, conservative exact-match category,
and stable source asset identities. It deliberately excludes the audit
observation time and parent audit receipt's incidental serialized hash.
A material page/question/cached-manifest change still invalidates the OCR
checkpoint immediately.

The previously generated four-page raw-byte-bound receipt is preserved under
a separate root-only *historical legacy* filename with its original bytes and
SHA256; it is **not silently trusted, rewritten, or presented as newly
validated source evidence** because the old serialized source audit that
created its fingerprint is unavailable for conclusive reauthentication.
Fresh OCR uses only the new stable fingerprint and genuine re-execution from
the current source cache.

Tests specifically prove:
- two identical page-evidence source audits with different timestamps or
  incidental parent-checksum fields produce the **same** resumed fingerprint;
- PDF text-layer hash, page number, cached manifest, and original question
  stem revisions materially changing will invalidate it;
- source receipt schema must be valid;
- protected private mode 0600, missing-claim/duplicate checkpoint denial,
  anti-self-approval guards and bounded OCR CPU scheduling remain intact.

This change preserves all research originals, 2,411 School 1 provisional IX/X
questions, student marks, real zeros, currently accepted printer and school
institutional acceptances, and the separate authentic independent academic
publication hold. It changes **no** live database records or Nginx deployments.

## Actual post-fix VPS acceptance

- Source SHA fix: `47dc5196b85423547ed080a5960b5466f5ce431f` pushed to the protected Academic Master source branch.
- Installed source-controlled OCR service helper SHA agrees byte-for-byte with its repository revision; off-hours timer remained **enabled/active**.
- The old four-page/24-claim private checkpoint was SHA256-preserved in `ocr-progress-legacy-20261016-89248ff7e50f.json`, private mode `0600`, source directory `0700`. Historical original SHA256: `89248ff7e50fb884c79fb91e2a7b3dd99aa7ccbbc6028c276a497c7330c4feff`. This legacy evidence was **not** silently repurposed as current-revision-proof.
- Two separate new resource-restricted, 20% CPU VPS systemd jobs executed actual PDF rendering, Tesseract and safe progress persistence. Both exited **Result=success / ExecMainStatus=0**. New root-private current fingerprint accumulated **4 unique scanned PDF pages and 24 claimed questions**, with **zero automatic approvals or publications**.
- A separate read-only canonical-claim check confirmed timestamp and parent-audit-only changes retain the fingerprint and a real page-mapping change invalidates it.
- The six-phase machine receipt was refreshed at `2026-10-16T05:07:13.678506+00:00`: **4/6 technical-readiness phases PASS**, `ocrResumablePagesCheckpointed=4`, `ocrResumablePageClaimsCheckpointed=24`, `academicVerifiedPublicationReady=false`, and `academicPublicationDecision=BLOCK_UNVERIFIED_QUESTION_PUBLICATION`.
- No student marks or saved papers changed. Full English-source OCR remains bounded at 20 pages per unattended execution, twice nightly (00:45 and 05:15 Asia/Karachi). The current 4/112 scanned-page status is a **partial checkpoint, not a completed full OCR run or a verified textbook adoption**.
