# ASSPS Grade IX–X — institutionally authenticated academic review mission

Date: 11 October 2026. Academic Master owner: academic source/revision correctness and evidence intake. **Code complete for an offline signature-evidence verifier; NOT a teacher signoff, school's key installation, physical textbook adoption, approved publication, or SaaS Core deployment.**

## Why this exists

The previous `validate-grade910-independent-review-evidence.cjs` reliably rejected structurally incomplete packets but intentionally declared all actor identities `reviewerIdentityCryptographicallyAuthenticated=false`, `schoolAcademicApprovalAuthenticated=false` and `publisherSelectable=false`. Strings like `teacher2` or `signature/2` are not institutional authentication. The new companion verifier checks cryptographic evidence without changing the frozen 2,581 original research candidates, tenanted user database or production content.

## Trust boundary and threat model

An offline roster for **school code ASSPS, its exact tenant ID and academic session** must be signed using an independently installed **ASSPS institution-controlled Ed25519 school root**. Its authentic SPKI SHA256 fingerprint must be obtained through a school-owner-authorized out-of-band channel, not from the same downloaded bundle or a copied key self-assertion. The operator must independently verify the owner identity, actual reviewer employment/credentials, adopted textbook record authenticity, and exact applicable board/exam session. Do not supply actual institutional private keys in ChatGPT, git, uploaded documents, the app frontend or shared test environments. No private keys have been created, stored or committed by Academic Master.

Roster roles must be explicit, credential-evidence-SHA-bound and scope-bound by grade, subject and medium:

- **adoptionCoordinator**: signs a specific question's actual adopted-book evidence hash and topic/edition/year attribution, including actual printed page/exercise evidence hash if asserting exercise-origin source text.
- **subjectReviewer**: independently signs the exact versioned question+answer research packet with all eight source/curriculum, answer/key, marks, language, originality and provenance evidence hashes; cannot be the author, adoption coordinator or approving authority.
- **urduReviewer**: independently signs the exact question/answer packet for any Urdu or dual-medium item; cannot be any other signer or the author.
- **schoolApprover**: authorized final academic institutional signoff of the exact subject-review packet SHA256 and both finalized question and answer revision SHA256.

All parties require independently authorized role, credential reference, active dates, exact tenant ID, school academic session, and a signed roster that has not revoked them. A school principal's general instruction **does not** automatically sign specific question revisions or grant fictitious teacher credentials. No reviewer or coordinator may approve themselves in another capacity for that review.

## Exact contract

Files: `ops/qbank/verify-grade910-institutional-signatures.cjs` and `ops/qbank/verify-grade910-school-review-envelope.cjs`. All signed messages use deterministic recursively key-sorted canonical JSON, Ed25519 domain-separated messages, and SHA256 revision hashes.

Required review packet identity:

- schoolCode=`ASSPS`; exact independently provisioned tenantId; exact academicSession (e.g. `2026-27` only if the school has approved it);
- original question ID, original question revision hash and original source-file hash, verified against all 73 unchanged frozen source files and 2,581 IDs;
- original grade/subject/medium, catalogue source record and PDF-source SHA claims cross-checked against the frozen original source, **not overridden by user-supplied packet values**;
- school-adopted textbook title/edition text, board exam year, curriculum topic ID, independently corroborated book/teacher assessment evidence SHAs; no automatic inferencing of Grade IX 2026 ALP for Exam 2027;
- `originType: original-conceptual` for independently authored conceptual questions; `originType: textbook-exercise` only when a qualified reviewer has real printed book and exercise/page evidence; a page cannot be invented;
- final question revision SHA256 **derived from supplied current final question content**, and final answer revision SHA256 **derived from supplied current final answer content**; no reliance on meaningless 64-char placeholders;
- eight distinct signed evidence checks, all passing, with actual SHA256 references. Signed reviewer/adoption/Urdu/principal proofs bound to the correct actor, tenant, role, message domain and exact revision.

**Canonical signing domains (distinct; cross-role replay is rejected):** `assps-academic-roster-v1`, `assps-academic-adoption-v1`, `assps-academic-subject-review-v1`, `assps-academic-urdu-review-v1`, `assps-academic-school-approval-v1`. Every signature and public-key roster entry is Ed25519 only. Timestamp and revocation checks are fail-closed.

## Offline single-batch usage — no school keys installed by this code

The administrator must securely provision these through the institution's independent approved process, in an **external restricted folder outside the git worktree**:

```bash
export ASSPS_ACADEMIC_SCHOOL_ROOT_PUBKEY_PATH=/secure/assps-institution/approved-root-pub.pem
export ASSPS_ACADEMIC_TRUSTED_ROOT_SPKI_SHA256='64-lowercase-hex-from-independent-school-owner'
export ASSPS_ACADEMIC_SCHOOL_TENANT_ID='actual-authorized-ASSPS-tenant-identifier'
export ASSPS_ACADEMIC_SIGNED_REVIEW_BUNDLE_PATH=/secure/assps-institution/signed-faculty-packets.json
export ASSPS_ACADEMIC_REVIEW_VERIFICATION_AT='2026-10-11T12:00:00Z'
node ops/qbank/verify-grade910-school-review-envelope.cjs
```

The JSON bundle must contain `schemaVersion: "assps-grade910-signed-faculty-batch-v1"`, a correctly institution-root-signed `roster`, `rosterSignature`, and `records` array. Each record contains `packet`, `signatures`, `finalQuestion` and `finalAnswer` matching the SHA-pinned final review revisions. **These paths and values are schema examples, not real school credentials or actual evidence files.**

If any required input is missing, malformed, untrusted, self-signed with a wrong school root, expired/revoked, associated with the wrong school tenant, actor/role, source revision, PDF catalog grade, medium, subject or question/answer, the command exits **2**, with no approval/publication side effects. The interface returns **only nonpublishing cryptographic receipt metadata** and explicitly `paperStudioPublisherSelectable=false`.

## Tested actual source integrity and staging

- The signer test uses ephemeral **synthetic keys generated in volatile Node test memory**, never the school's actual private/public root. Synthetic **valid** Ed25519 proofs remain publisher-ineligible. A synthetic proof was additionally bound to a real unchanged Chemistry IX candidate revision and source SHA solely to verify that the source-binding logic works; this does **not** mean that candidate has passed human academic review.
- Tests cover forged school root fingerprint, tampered signed roster, revoked/expired participants, wrong role, author/reviewer conflict, missing independent Urdu signer, cross-tenant replay, wrong signature domain, stale answer/question hash, wrong original grade/subject/source catalog PDF hash, future/incorrect timestamps, missing exercise print proof, duplicate batch revisions, nonexistent school trust configuration and rejection of school records stored inside git.
- Normal source path always reports **0 actual authenticated qualified faculty approvals and 0 academically verified published questions** because **the institution has not supplied an authentic out-of-band roster, personal teacher credentials and signed final review packets**.

## Governance and integration

The Academic Master may independently validate a real correctly signed faculty packet when it eventually exists. **That alone never auto-publishes it.** Paper Studio owns server-side verified-question picker, paper layouts, marks, Urdu RTL, print/export and approved-only snapshot selection. SaaS Core owns the privileged school/tenant RLS release gate and production deployment. Any approved final question/answer revision change must invalidate earlier signoffs, trigger independent re-review and new edition/exam applicability checks.

Do not bypass missing school evidence by seeding provisional questions or treating public textbook PDF hashes/AI-generated model answers as signed teacher approvals. The academic release must remain **HOLD**.
