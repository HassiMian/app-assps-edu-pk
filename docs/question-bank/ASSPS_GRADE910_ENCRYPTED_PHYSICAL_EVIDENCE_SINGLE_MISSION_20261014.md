# ASSPS Grade IX–X — One consolidated evidence-byte remediation mission
**14 October 2026 — source and isolated QA completion only. Never use this document as an institutional approval or a production-release certificate.**

## Authoritative branch and completed technical work
- Branch: `feat/grade910-real-evidence-byte-binding-20261014`.
- Tested implementation commit: `ab70ac9f56b08ade45ea074e65bb79a5cdd707d4`.
- Parent: `05ab0a339ec1d732e4f7a41ba6cc5db77c76cd88` (existing-table staff-role migration guard + live read-only release probe).
- New migration: `032_grade910_encrypted_supporting_evidence.js` is **additive** and remains uninstalled in production. It requires an existing real signed Core SQL predicate and a restricted non-BYPASSRLS role. It uses FORCE RLS, a school/signer/receipt composite FK, SELECT/INSERT-only runtime grants, immutable records, byte count and format checks.
- New staff evidence service encrypts selected PDF/PNG/JPEG original bytes using AES-256-GCM in private database storage, not public filesystem; rejects unsigned/wrong-tenant actors, unmatched signed receipt SHA, changed file contents, oversized files, and unowned submission IDs. An idempotent duplicate upload cannot replace bytes.
- UI computes immutable local SHA from actual file bytes (not editable text), clears stale uploads and revalidates PDF/PNG/JPEG byte magic. The real signed-in staff member submits their own pending claim and uploads bytes to a separate authenticated binary endpoint. Explicit retry is shown if the source claim saved but the encrypted upload did not.
- Evidence retrieval uses signed-school guard, same-school receipt/actor join and real Principal-or-original-signer scope. AES-GCM authenticity tag, original SHA, claimed SHA, declared byte size and content type are rechecked before explicit user-triggered, private attachment download. No admin-as-Principal impersonation.
- The workflow does **not** silently approve question revisions or certify the source's actual school adoption. No modifications to Exam9 marks, live student records, teacher credentials, existing papers, original research-candidate questions, or production app traffic.

## Executed verification on exact frozen source commit
- One synchronous source/staging mission `ops/qbank/run-grade910-academic-mission.cjs` completed **30/30 process stages**; 19/19 source/security gates passed.
- Paper Studio: **510/510** PASS.
- Grade IX–X Academic: **585/585** PASS.
- **1,095/1,095** combined PASS; 0 failures/skips.
- SHA-256 of private audit JSON `/tmp/assps-grade910-byte-proof-final-ab70ac9/mission-audit.json`: `bcec619d7586443a4e225795cef06b348282b39e6339b5b79a83a14394366ddc`.
- Extra concentrated file-signature, role and evidence tests **17/17** PASS; Vite production build PASS.
- **Actual disposable PostgreSQL 16 QA** on port 55448 installed migrations 030 and 032. Policy scenarios: unsigned school FAIL, mismatched school FAIL, wrong signer-to-receipt FK FAIL, correct scoped synthetic insert PASS, no UPDATE/DELETE grants PASS, total **5/5** expected outcomes. One synthetic QA signoff existed only in disposable cluster; zero stored QA evidence objects; QA cluster was stopped. This does NOT prove real Core-issued signing or genuine ASSPS Principal review.
- Working tree clean on implementation commit. All original 2,581 Grade IX/X research candidates, original catalogs and 43 previous historical paper revisions preserved.

## Latest official source applicability evidence (not school adoption)
Official authority PECTAA public curriculum listing: https://pectaa.edu.pk/curriculum-compliance/ ; official downloads: https://pectaa.edu.pk/downloads-2-2/ .
The public pages distinguish Grade IX editions/streams, a revised Grade IX Computer/Entrepreneurship stream for 2026–27, and distinct Class X 2026–27 subject books. The Grade IX 2026 ALP/smart syllabus reference does **not** by itself establish ASSPS adoption or 2027 annual-paper applicability. No office/staff signoff or actual school's physically printed edition has been authenticated by these public listings. Preserve unresolved source identity; do NOT relabel 2025/2026 cached PDFs as final adopted 2026–27 without a school-authorized evidence decision.

## Truthful institutional release decision
**Academic independently approved = 0. Published/verified selectable = 0. Production deployment NOT PERFORMED.**
The new code closes a technical missing-byte upload/storage/retrieval deficiency; it does NOT create a legitimate identity or reviewer certificate.
Genuine unresolved gates remain:
1. Verified school source adoption for the actual 2026–27 printed Grade IX/X books and precise page/exercise evidence, submitted personally by authenticated school Principal or institutionally authorized signer, with approved scoped role.
2. Independent genuinely qualified subject/Urdu teacher correctness and question-revision review. This was deferred by school; cannot be replaced by this assistant or dummy QA signatures.
3. Trust-pinned school-root/publisher keys and signed revision-specific academic approval on the exact immutable question/answer key.
4. SaaS Core signed live tenant/actor runtime, restricted-role migrations 030/031/032, private encryption key provisioning, real cross-school 403 and rollback receipts, latest canonical forward-port.
5. Real Principal/teacher browser acceptance and Paper Studio canonical **Save → Reopen → Print** including physical OS print; Paper Studio must confirm approved-only import with revision reauthentication.

**Academic publication and live production = HOLD until all genuine institutional, security and browser acceptance gates pass.**
Only SaaS Core & Production Master may deploy. Only Paper Studio Master owns the teacher-facing paper editor. This isolated Academic branch is a source candidate, not an authorization to deploy.
