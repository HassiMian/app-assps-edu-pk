# ASSPS Paper Studio MASTER — real server-side rich-heading validation, unified phase checkpoint

**Date:** 16 Oct 2026. **Authority:** Paper Studio owns paper schema/authoring; SaaS Core owns backend route integration and production release. **Release: HOLD.** Existing papers/marks preserved. This is a review-only Core-compatible source candidate, not a public deployment.

## Source lineage / isolation

Parent: `test/paper-real-server-rich-heading-20261016@28b4096a5d8eadaeb195be2a140c4dcab17bfd95`, descendant of latest reviewed Core `integration/core-paper-manual-richtext-rc-20261016@2a3d5bac57decb4f9dc32fb97728b2403f82c7b6`. New separate worktree branch `fix/paper-server-inline-richtext-validation-20261016`. Only a focused backend route validation call, new backend Paper Studio helper, backend unit tests, extension of existing authenticated disposable PG16 teacher acceptance, dedicated CI workflow and this handoff. All other owner worktrees untouched. Two untracked Argus JSON runtime files are preserved uncommitted.

## Genuine fail-before / root cause

The canonical frontend `PaperDocumentV2.js::isSafeEditorInlineHtml()` already enforces a bounded allowed tag/attribute/CSS list for optional `editorInlineRichText` under user-authored question serial/instruction. The backend `assessmentStudioRoutes.js::validatePaperDocument()` only enforced coarse schema and `grade910PaperWorkspaceReleaseGuard` only enforced academic-manifest provenance when present. A direct authenticated request could therefore submit unsupported inline HTML that bypassed **backend** canonical field checks. This is demonstrated in **disposable** real Express/JWT/PG16 test, not claimed as observed exploitation or incident in live school content.

New negative assertion in the existing school-scoped real teacher E2E expected HTTP400 and unchanged revision for an unsupported inline element. Against unchanged backend source the real route returned **HTTP201 instead of 400**; process **RC1**, test **1 failed**, receipt SHA256 `99e9738c9a42740feaf095aca6185977e1f40f3f67f2f0ead1709d665ec45059`. Temporary database was destroyed. No live school row tested or edited.

## Narrow defensive correction

- `al-siddique-backend/src/services/paperStudioInlineRichTextGuard.js`: validate **only** optional `sections[].editorInlineRichText` fields (`headingSerial`, `headingInstruction`) and exact accepted editor tag/CSS syntax with 8,192-character per-field cap. Reject unsupported elements, attributes, event attributes, URL-capable CSS, oversized or foreign fields, malformed value types, and extensions on non-USER_AUTHORED papers. Do not rewrite the payload, numbering, marks, source provenance, original paper content or formatting controls. Other legacy sections without extension remain unchanged.
- `al-siddique-backend/src/routes/assessmentStudioRoutes.js`: hook the narrow validator into the existing save-revision request check, retaining HTTP400 error path **before any transaction writes**. No SQL migration, RLS policy, session/auth logic or role change.
- New backend `node:test` unit file compares server behavior to the actual canonical ESM frontend rule (positive and negative fixtures), preserves marks/document bytes and checks malicious/invalid field denial. **3/3 PASS**.
- Existing fully authenticated synthetic School1 and School2 PG16/Express/Chromium E2E now includes negative POST plus existing positive valid rich heading HTTP Save→GET, direct PG revision inspection, stale 409, paper A4 PDF, Diary Save/Reopen/Print, Lesson optimistic revision and teacher/School2 permission denials.
- Scoped new GitHub Actions workflow runs pure backend/ESM parity Node tests, existing protected templates verification and a pinned frontend build; CI remote green is **not** claimed.

## Verified pass-after evidence

Actual guarded `pg_virtualenv -t -v 16` restored a root-owned `0600` **schema-only** production DDL source to a throwaway database; no real student rows or production actors. Real PG16 + Express + JWT + Chromium suite **1/1 PASS (0 fail, 0 skip, RC0)**; new `PHASE3_REAL_AUTH_SERVER_UNSAFE_HEADING_REJECTED_NO_MUTATION_PASS` marker. Log SHA256 `78e78ff8db110a0bf8f64d8d025c0b73c11dca1fa8b44551386956d7f33b06eb`. Temporary DB cluster destroyed, test ports 5410/5411/5433/5434 closed. Valid English/Urdu markup retained exact bytes, question text/total marks preserved and 409 stale revisions still denied. Backend parity Node **3/3 PASS**; frontend manual/scoring Node **22/22 PASS**; protected six original templates **6/6 PASS**; new workflow parses; source syntax checks pass.

Compiled frontend index SHA256 remains `d0de50ad2011ee3dc5532352788e1e1795a94cc6f49b90a84ed7c08994748d05` unchanged from parent (no frontend runtime change). Accepted public frontend remains different: `760b232b493c300fe78908704aef4989c24c25028faac1821dd41f6480210f3c`. Existing private Diary five-flow browser regression is independently tracked by root-private runner; do not assert PASS unless exit code is observed in its final receipt. Physical school Urdu/English paper hardcopy was not produced.

## Limitations / Core ownership

This is a *specific bounded field validation*, not a claim of general HTML sanitization or a comprehensive security audit. Existing already-stored content is not rewritten; canonical frontend read rendering retains its own sanitizer. Backend route and review artifact require SaaS Core owner's focused code review, latest live backend ancestry recheck and additional regression gates before integration. No server files under `/var/www`, Nginx or PM2 were modified.

Last genuine independently signed SaaS Core release gate remains **6/13 HOLD**: approved current ACL backup, independent signed off-host restore, restricted persistent worker transport, deployed reviewed worker adapter, separately authenticated persistent worker, independently certified effective grants and true School2/unassigned-subject denial. These cannot be impersonated by synthetic test actors. Real current-role, full Diary physical print and rollback certification remain separate from this QA. Promotion authority stays solely with SaaS Core. Never deploy to close a gate without real signer evidence.
