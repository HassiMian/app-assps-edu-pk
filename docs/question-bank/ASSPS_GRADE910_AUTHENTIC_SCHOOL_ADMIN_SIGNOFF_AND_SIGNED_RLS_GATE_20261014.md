# ASSPS Grade IX–X — Signed school context and genuinely owned adoption evidence
**14 October 2026 · one authoritative isolated Academic Master feeder branch**

## Why this change was necessary
Previous Grade IX–X Question Bank source already had teacher and Principal personal signature capture, exact publication-revision verification, canonical Paper Workspace Save/Reopen/Print guard, encrypted image store and additive PostgreSQL migrations 030/031. Live ASSPS school-1 read-only user-role inventory does **not** show any active `principal` role; there are active `admin` accounts. Claiming a real Principal account exists, resetting someone else's password, or simply spoofing a `principal` role would not be genuine school identity verification.

This change permits a signed-in authenticated `admin` or `school_admin` to submit only **their own** `book_adoption` evidence claim (pending identity and academic verification). It does **not** grant those roles `principal_approval`, `subject_review`, `urdu_review`, source verified status, academic approval or publication. Actual `principal` actors retain their distinct `book_adoption` and `principal_approval` actions; actual teachers retain academic review. The uploader's **real JWT actor user ID and role** are stored, checked against the personal claim and bound to the authenticated school; school administrators are never labeled Principals.

## Signed Core guard: no unsigned school context
Grade IX–X `/api/grade910-signoffs/*` and `/api/grade910-verified-picker/*` endpoints now demand `core_security.signed_school_allowed($1)` **before** reading the 56-source catalog, personal signature, submission metadata, review readiness or any published Grade IX/X revision. A syntactically valid JWT and an `app.tenant_id` GUC **alone do not pass**: the installed Core guard additionally requires an authentic HMAC-signed, actor/transaction/expiry-bound context. If the guard is false or Core cannot provision signed transaction context, endpoints return HTTP503; they do not fall back to permissive SQL or an admin bypass. Restricted PostgreSQL row-level security and `FORCE RLS` remain mandatory.

The `school_admin` SPA route permission is granted only to the two Grade IX/X academic signoff/picker routes (without globally broadening other staff modules). Existing live `admin` accounts can access those routes subject to the existing `question_bank` permission gate, Core tenant authentication and actual deployment.

## Signature and supporting file UX
- Principal uses the existing handwritten canvas or self-owned PNG upload (120 KB max). No assistant signs for them.
- Supporting school-adoption physical edition evidence can be selected on device as a PDF/PNG/JPG (15 MB max): its SHA-256 is computed locally and bound into the claim. The file bytes remain on-device and MUST be retained separately for real authorized verification; supplying a hash alone does not prove school adoption.
- Confidential signature PNG evidence is uploaded via authenticated backend then stored AES-256-GCM-encrypted in the private staff evidence table. The UI no longer **automatically** saves a second unencrypted JSON/PNG copy in the user's Downloads folder.
- All real staff claims remain `UNTRUSTED_CLAIM_PENDING_SCHOOL_AUTHENTICATION`, `academicallyApproved=false`, `paperStudioSelectable=false`, `published=false`.

## Verification gates and independent owner responsibilities
- Parent source: `fix/grade910-reopen-print-release-guard-20261014` at `8cb2a23bc2cab003a8bd3fd88398d12f679965a3`, itself derived from the stronger canonical Paper Studio owner bridge. Preserve original Grade IX/X 2,581 research candidates, 73 authoring sources, 56 archived/source catalog references, 43 historical paper revisions, original Exam9 marks, all tenants.
- Strict admin/principal admission tests: admin and school_admin may sign only their own pending book-adoption evidence; admin `principal_approval`/teacher review spoof rejected, mismatched user ID rejected.
- Strict signed Core guard negative tests: missing/false signed context is denied even with a valid JWT; wrong school or unknown guard function returns FAIL-CLOSED.
- Synthetic Express HTTP tenant/ownership, school assignment and verified-paper status tests exercised separately; a passing mock-auth test is not a real Principal login.
- Existing full project mission regression, Vite optimized build, and prior→candidate→prior offline artifact rollback must pass on this exact candidate; record numeric evidence only after verified completion.
- SaaS Core, not Academic Master, owns latest canonical merge, restricted signed live traffic/migrations, private encryption key provision, real authorized staff-session acceptance and non-destructive live cutover/rollback. Paper Studio owns physical browser Save/Reopen/Print acceptance, approved-only consumption and printer parity. Teacher qualified independent review is **deferred**, not waived. Actual Principal-signed adoption has **not** yet been submitted.

**Production / academic gate: HOLD** until genuine actor signature, school-root trust/publisher key, independent review of each question revision, approved-only Paper Studio acceptance, signed active tenant RLS and SaaS Core release/rollback receipts. No production migration, password access, user changes, paper/marks seeding, grade/score changes, live Nginx/PM2 switch or false signoff was carried out.
