# ASSPS SaaS Core Phase 12 — canonical rich-heading revision validation on signed Paper database

**2026-10-08 UTC · NEW ISOLATED INTEGRATION · NOT DEPLOYED · SaaS Core release HOLD.**

## Source ancestry and Master coordination
- Exact Core parent **Phase 11** `05679b49bd001efa121afd6504554c50d8682798`; branch `feat/saas-core-phase12-assessment-heading-rls-20261008`, clean isolated worktree `/root/workspace/assps-core-phase12-assessment-heading-rls-20261008` before this commit.
- Independently verified Paper Studio owner **Phase 10** source `f01d9eb614314d015a79b907abf2ebeacc8405ed`, itself descended from Paper Studio Phase 9. Owner added canonical `headingFormatting` validation after the signed backend had diverged. Integration must **not** overwrite Core's dedicated signed Paper database middleware/ARCHV1 path.
- Review showed precisely TWO required source changes to `src/routes/assessmentStudioRoutes.js`: import Paper owner `validateCanonicalHeadingFormatting`, and return its validation result after the existing canonical document format/version/origin/sections gates. Preserved Core `paperRestrictedDatabase` protection and all existing tenant/release/revision logic. Copied only the pure owner validator, its two matching tests, and added an independent real restricted-DB HTTP test. Owner validator SHA256 `05f1762fd90abe227e11daede6df28338583332637ac45cd7483512c1dd9758b` verified byte-identical to Paper Studio owner.
- Final checked production artifact metadata (not direct artifact/source attestation): frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`; backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`. No production changes intended.

## Newly closed validation trust boundary
- Prior Core Assessment Studio accepted optional canonical `sections[].headingFormatting` because `validatePaperDocument()` ended immediately after checking that sections was an array. This could persist unsafe markup and hash it as an immutable authored revision despite downstream UI sanitization.
- Pure imported validator rejects untrusted element/attribute/style combinations, scripts, SVG/image injection, event handlers, invalid markup nesting, positioning and oversized HTML. Editor-compatible Urdu/English formatting remains allowed. It does **not** change official plain question text, marks or score.
- New signed-DB test proves HTTP **400** on unsafe revisions before any Paper revision transaction, safe teacher POST **201**, PostgreSQL-retrieved GET **200** returning exact canonical formatted document and stable hash, stale revision **409**, anonymous **401**, same-school peer / foreign-school GET denied, and attempts to change the original revision as either peer or foreign-school actor yield conflict **409**, with unchanged original owner hash.
- Production role mode and archival restrictions are not loosened. This guards authored rich HTML on the server; it is **not** human approval of academic content.

## Actual executed evidence — distinct suite boundaries
- **4/4 PASS** Paper Studio's imported pure sanitizer and synthetic Express HTTP guard tests, run against this Core-scoped source.
- **6/6 PASS** real signed dedicated Paper/Assessment HTTP suite (five Phase 9 role/HMAC/teacher-assignment scenarios plus NEW end-to-end optional-rich-heading revision case). Real Express router + signed JWT + independent non-BYPASSRLS dedicated PostgreSQL login, PostgreSQL16 `127.0.0.1:55432`, disposable `assps_archv1_rls_corep9_20261008` with synthetic records only. Initial test verification accidentally attempted an unscoped protected SQL query, correctly denied with `PAPER_RESTRICTED_SCOPE_REQUIRED`; test corrected to use authenticated owner GET and strict unchanged revision/hash. Subsequent complete test green. Foreign school cannot overwrite another school's revision by guessing its public ID.
- **17/17 PASS** independent Core general signed-SaaS RLS + lesson/diary/assessments + PostgreSQL cross-tenant session reset suite with separate Paper feature OFF on disposable signed clone.
- **35/35 PASS** prior signed-mode-OFF SaaS authentication, teacher, lesson planning, G43 protected metadata, G21/G23 DOCX/math and role regressions with test-enforced Phase 6 disposable DB.
- **257 backend JS syntax checks PASS**, frontend isolated `npm ci` 315 packages + `npm run build` Vite PASS (3.37 s), **6/6 protected templates unchanged**; Git whitespace check PASS. Full frontend ESLint remains **NOT CERTIFIED** from earlier timeout; no new claim of passing whole-repo lint.
- This phase has **no database migration** and no claimed production backup/restore drill or actual authenticated production paper edit. The separate test database is synthetic; run source is not live.

## Mandatory production HOLD
1. Production-grade Core signed and dedicated Paper role migrations, key-vault rotation, PostgreSQL GRANT/policy reconciliation across all 77 FORCE-RLS relations, service and platform-superadmin pathways, finance and attendance writes, parent/student/guardian access, effective cross-tenant tests and rollback.
2. New Paper Studio rich heading editor/canonical revision behavior still needs source-level frontend integration onto the verified Core descendant, real logged-in signed server Save→GET→browser reopen→PDF/DOCX/multi-page Urdu/English/physical print tests, beyond this backend real signed HTTP. Paper Studio owner must confirm current/latest unmerged changes.
3. APEX Connect independently owns Next frontend upload/privacy and logged-in role/revision workflows; its recovered local-only source is NOT a published deployable repository branch. Academic Master has **zero independently approved/published Grade IX–X questions**; no academic promotion.
4. Hostinger cloud ingress/firewall external evidence, SSH rescue, complete lint/CI, exact production artifact provenance, irreversible SQL review, real recovery drills and controlled rollback remain unresolved.
5. The 26 dirty ARCHV1 current-live tracked files were untouched; do not promote from older worktrees.

**Decision:** A tested isolated source candidate, not production certification. DO NOT DEPLOY.
