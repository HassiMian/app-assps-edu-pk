# ASSPS Grade IX-X — Private school textbook adoption claim intake

**Academic-only isolated research work:** source anchor a54e6ab828321a32c0562c4f9e3f169ebe6ef0e9, 13 October 2026.

## Need and outcome
- Existing 2,581 frozen original research candidates refer to 56 catalog source books; not one actual ASSPS 2026-27 adopted-book decision has school-authenticated signatures. No authentic independent subject or Urdu teacher approvals exist.
- Existing 56 source-locked unsigned private school adoption templates are PRESERVED, not replaced.
- New strict claim intake permits separate owner-private school book *claims*, anchored to exact catalog PDF SHA and original question-revision-set SHA. It independently checks evidence bytes before reporting any adopted claim, but cannot authenticate the staff signer or independently validate answer correctness.
- An untrusted adoption claim, even accompanied by byte-verified evidence, never becomes approved or Paper Studio selectable.
- One shared-grade Urdu catalog supports 70 original candidates with grade unspecified; grade 9/10 attribution must not be guessed.

## Actual private inputs (never commit)
Claims inbox (starts EMPTY): /root/secure-archive/grade910-academic-review-packets/assps-school-adoption-claims-incoming-20261013
Existing 56 source-locked unsigned templates: /root/secure-archive/grade910-academic-review-packets/assps-original-school-book-adoption-20261013
Content-addressed physical evidence object store: /root/secure-archive/grade910-academic-review-packets/school-academic-evidence-objects-20261012

Owner-only folder mode 0700 and per claim 0600; a claim filename must match pectaa-catalog-NNN.school-adoption-claim.json. No symbolic links, multiple hardlinks, unknown catalog IDs, wrong original PDF/revision-set SHA, incorrect 2026-27 session or extra privileged fields. For an adoption claim, require a real school grade/subject/medium/title/printed edition/board exam year and physical SHA256 evidence-object bytes. Non-adoption or unresolved claims remain pending. Real qualified independent teacher reviews and real school signing require a SEPARATE authenticated institutional workflow.

## How to use
From the isolated Academic worktree, set ASSPS_QBANK_PRIVATE_ADOPTION_CLAIMS_DIR to the claims inbox above and ASSPS_ACADEMIC_EVIDENCE_OBJECT_DIR to the evidence store above. Run:
node ops/qbank/inspect-grade910-private-school-adoption-claims.cjs

Tool prints aggregate counts only, no confidential certificate or private keys. It explicitly reports authenticated school adoptions 0, academically approved 0, academically published 0, picker false and release HOLD.

## QA and release authority
New source-locked tests cover empty inbox, synthetic untrusted evidence success, evidence tampering, stale revision, forged approval, cross-grade claim, unsafe file permission, symbolic link and no physical evidence store. Synthetic fixtures are disposable; not a real school certificate.
Academic Master owns academic evidence; Paper Studio owns approved selector; SaaS Core alone owns tenant/RLS and production deployment. Do not turn research claim counts into approved or published counts.
