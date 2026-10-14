# ASSPS Grade IX–X — Principal personal signature vault + academic pre-review mission
Date: 14 October 2026. Source/staging achievement; NOT actual school human signature, approved academic publication or production deployment.

## Code checkpoint
- Isolated branch: feat/grade910-principal-signature-ai-advisory-20261014, child of latest integrated Core + Academic merge 7492ff11527d6054085345f0129e7631752570cb.
- Exact frozen fully QA-tested implementation: acc8fb01b216cc53deecaeff86b9bfd660044486.
- Existing real school results, numeric zero vs blank, users, old question candidates, 43 protected legacy papers and running live apps untouched.
- New migration 033_grade910_personal_signature_assets.js: additional restricted SELECT/INSERT-only AES-GCM signature storage table; signed tenant FORCE RLS, one-way versioned immutable uploads; no DELETE/UPDATE grants and no auto approval.
- Personal-signature route under authenticated /api/grade910-signoffs/personal-signatures; checks active real school user / JWT role per upload, refuses stale or deactivated Principal account, binds uploads to own user and school.
- Principal may upload genuine own 120-KB PNG, inspect local preview, receive private server receipt, list only own stored signatures, and explicitly reuse saved PNG on an individual pending Grade IX–X claim. This requires fresh signed declaration; no staff/Principal impersonation.
- Administrator signing in as administrator can upload only an administrator-owned signature and may sign adoption evidence only, never claim to be Principal.
- No live migration installed or staff upload impersonated. Genuine staff actions are still needed.

## Actual code review and test evidence
- Complete merged-source research/staging QA 30/30 stages; 19 source/security process gates PASS.
- Paper Studio 510/510 PASS. Grade IX–X Academic 596/596 PASS. Total 1,106/1,106 PASS; 0 fail/skip.
- Private audit: /tmp/assps-grade910-personal-sig-ai-mission-acc8fb0-20261014/mission-audit.json, SHA256 fb4fc5e3ca25ccd7fbd8b37b7c7b1a8b82add718d8fe1b0594177fed31a1376f.
- Vite optimized frontend build PASS. Isolated PostgreSQL16 port55449 migration033/ FORCE RLS signed/unsigned/cross-school visibility and insert denial, signed-school positive, SELECT/INSERT allowed, UPDATE/DELETE denied: 7/7 scenario checks PASS. Stopped and removed disposable PG data.
- Core independent source preflight tested 22 backend, 38 Python and 5 frontend = 65/65 PASS on clean implementation source. Actual live release status HOLD; source tests are not Core production certification.

## Academic analysis carried out
- An immutable-source SHA-256-bound correction queue was generated for all 2,581 original research candidates; separate P1/P2 docket includes 584 unique candidates with heuristic editorial signals.
- P1: 119 questions. P2: 465 questions. Remaining 1,997 lack those signals but are NOT teacher-verified.
- Signal counts overlap: 34 extremely brief long answers, 389 brief long rubrics, 61 numerical workings requiring independent recomputation, 68 MCQ clueing signals, 24 MCQ key identity / 24 canonical-label signals, 8 brief essay references.
- Original MCQ answer distribution: A 785, B 50, C 33, D 7 of 875 originals; this is an assessment-design warning, not proof any answer is wrong.
- Full AI-assisted deterministic pre-review dossier: docs/question-bank/ASSPS_GRADE910_AI_ADVISORY_CORRECTION_DOCKET_20261014.json and corresponding .md. Docket JSON SHA256 4012bb74e1c7b15693c12156a01833b7dd6a9326172904e847e9600a7d8ef7ee.
- This is NOT 584 independently fact-checked corrections or qualified teacher judgments. No fabricated textbook pages, human reviewer names, revision approval, or publication statuses were issued.

## Accurate live release decision and genuine external requirements
- Academic human approved: 0. Verified published: 0. Production migrated/deployed: NO.
- Authentic ASSPS adopted 2026–27 book editions, printed chapter/page sources and real qualified subject/Urdu answer correctness reviews are still missing.
- PECTAA official source listings: https://pectaa.edu.pk/curriculum-compliance/ ; edition listings do not prove school-specific adoption or Annual 2027 applicability of 2026 ALP.
- Required before final publication: real active Principal credential + own signature submission, real qualified subject/Urdu reviewer exact revision attestation, Core signed tenant actor role with full RLS/Peer-school denial, restricted migrations 030/031/032/033, genuine staff canonical Save -> Reopen -> Print acceptance and authenticated rollback certification.
- SaaS Core alone deploys. Paper Studio owns teacher-facing verified picker/print. AI pre-review is advisory, and neither automatically grants human approval nor authorizes production marks or paper changes.

## Agent handoff (per user's request, no routine approvals)
Continue from this exact audited branch; do NOT restart. Prepare correction-draft packets for 119 P1 then 465 P2 flagged original question IDs, preserving their immutable original revision SHA-256; use real adopted edition and official source only when evidenced. Validate independent scientific/mathematical/Urdu answer correctness and label AI_ADVISORY until a qualified human signs. Forward-port migration 033 and vault UX onto the latest SaaS Core production candidate in a clean isolated worktree; implement, test and document signed RLS, actor/role denial, tenant negatives, Paper Workspace exact revision Save-Reopen-Print. Never issue teacher or Principal signatures on their behalf. Do not modify live marks or promote production without SaaS Core live security/rollback certification; report exact commits, tests and blockers.
