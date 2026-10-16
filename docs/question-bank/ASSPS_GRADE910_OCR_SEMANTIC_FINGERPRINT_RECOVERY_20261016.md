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
