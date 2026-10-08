# ASSPS Paper Studio — Phase 9 canonical rich-format/typed-authoring round-trip

**UTC execution:** 2026-10-08 17:29–17:49. **Result:** isolated frontend/model engineering and regression passed, **PRODUCTION RELEASE HOLD**. This report is an additive checkpoint for GitHub issue #4 and issue #3, not a substitute for SaaS Core signoff.

## Verified source and non-production isolation

- Live production release metadata rechecked during implementation: frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`; backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`. These are release markers; not independent compiled artifact attestation. No SaaS or Connect deployment performed.
- Based exactly on clean, pushed Paper Studio Phase 8 `ced544b43abacab57df33e7e9546acb8b9a51ae6`; isolated worktree `/root/workspace/assps-paper-studio-master-phase9-20261008`, branch `feat/paper-studio-phase9-persistence-20261008`.
- Reviewed `docs/coordination/PAPER_STUDIO_MASTER_HANDOFF.md` and `CHAT_CONSOLIDATION_AND_AGENT_GOVERNANCE_20261008.md` from the dedicated coordination worktree. Canonical Paper Workspace, official 43 papers, current question/marks schema, bank approval boundaries and Core deployment authority remain intact.
- No backend, production DB/roles/policies, user/teacher/school data, seed, release marker, worktree baseline, official source JSON, font files, PM2 or firewall modified.

## Actual new issues found and fixed (not a re-run of Phase 8)

### P9-A: Rich formatting dropped by canonical revision serialization

1. Phase 8 browser local-store Save/Reopen retained selection-only question serial/instruction bold/underline. Added an assert against the **actual POST `/api/assessment-studio/papers/:id/revisions` document**, not local storage: **RED** because `document.sections[0].headingFormatting.questionSerial` was absent. The previously published green local-store acceptance did **not** certify server-revision content.
2. Extracted the existing allowlisted `sanitizeInlineHtml` implementation to shared pure-module `inlineHtmlSanitizer.js` (same editor sanitizer behavior, reused by canonical serializer/reopen projection). Safe HTML tags/styles/direction are preserved, unsupported attributes/layout styles removed. Browser regression includes actual Chromium sanitizer output. Node fallback remains content-only because no DOM exists on headless Node; web client is the supported rich authoring runtime.
3. `PaperDocumentV2.createCanonicalSection` now supports optional, explicitly bounded `headingFormatting.questionSerial` and `headingFormatting.headingInstruction`; validator rejects malformed/nonstring, huge and unknown keys/unsafe obvious markup. Existing plain `heading`, scoring and numeric marks remain the authoritative text/marks; rich HTML is a **presentation adjunct only**. Official migrated paper identities/source documents unchanged.
4. `createManualAssessmentDocument` sanitizes and stores independent serial/instruction fragments in the authoritative **revision-bound document JSON**. `mergeServerDocumentIntoLocalPaper` reconstructs them from server-supplied canonical document and sanitizes again, rather than granting stale local formatting independent authority.
5. Same new Chromium revision POST assert **GREEN**. Test checks browser mouse-drag selective B/U, captured canonical document, direct authoritative rehydrate with local rich fragments deliberately absent, scoped saved-browser reopen/print and unchanged 9 marks. It uses a **simulated** revision API and browser projection (not actual authenticated DB or live server GET); this limitation is material.
6. Separate Urdu RTL browser canonical round-trip checks Unicode serial/instruction markup, direction, and numeric 5 marks.

### P9-B: Real user-authored question body/type lost on server rehydrate

- A new existing-model test was **RED**: short/long `stemText` was sent in canonical nodes, but server-to-workspace projection only read `node.content`, so reopened questions became empty. Fixed `content || stemText || rawText` extraction. New tests now **GREEN**.
- A second negative asserted original short/long `layoutPreset` retention; **RED** because canonical server projection did not reconstruct type. Added deterministic canonical-node type and math/image capability mapping plus associated source metadata in server-to-workspace adapter. Math-source round-trip test added; all 13/13 canonical/model cases green.
- No database migration. Server-source integration/policy compatibility still requires Core review.

## Fresh actual test results and known failed starts

| Gate run | Evidence |
| --- | --- |
| New Chromium revision POST/reopen/print with DOM HTML allowlist and additional Urdu canonical projection | **1/1 PASS** after initial missing canonical property failure |
| Phase 8 real Chromium serial+statement mouse-drag suite + new revision test combined | **6/6 PASS** |
| Extended canonical manual assessment model tests, including short/long/math and malformed formatting | **13/13 PASS** (two deliberate red-before tests) |
| Existing Urdu Workspace browser acceptance | **9/9 PASS** with `ASSPS_PAPER_ACCEPTANCE_PORT=5414` |
| Existing official Workspace / blank Urdu Create-Save-Reopen-Print | **1/1 + 1/1 PASS**, separately rerun |
| Canonical DOCX Chromium browser | **2/2 PASS** |
| Math/image Workspace Chromium browser | **1/1 PASS** |
| Official 43 protected papers text render and print parity | **43/43 PASS**, exit 0, 183.46 seconds, `/tmp/assps-paper-phase9-corpus.log` |
| `npm run verify:templates` | **PASS; 6 protected templates unchanged** |
| `npm run build` | **PASS**, 2,519 modules; final measured build 2.95 sec |
| `git diff --check`; pure JS syntax | **PASS** |

A combined browser test runner initially reported **9 hook failures** because *another process* owned hard-coded port 5194; these were port bind failures, NOT 9 content failures. Added optional env-configurable port while preserving default 5194, reran Urdu suite separately on 5414: **9/9 PASS** without touching the other listener. Browser sanitizer test initially expected literal `#123456` but Chromium normalized the same CSS color to `rgb(18,52,86)`; adjusted assertion to accept both equivalent representations and retested **PASS**. Do not erase/omit these initial observations.

## Limitations: what Phase 9 has NOT certified

- New revision POST uses a controlled simulated HTTP response; even though the submitted payload and canonical projection have been inspected, this is **not a real signed non-BYPASSRLS Assessment Studio backend insert/GET/reopen**. Core Phase 9 reports independent signed Paper/Assessment RLS tests, but those were on its separate source branch and do not certify this frontend feature. Actual teacher, parent and other-tenant requests remain an integration gate.
- The re-opened browser mock screen reads a test saved-paper cache; the separate authoritative server-document merge was directly tested with local rich fields absent. An actual authenticated PaperGenerator Saved Papers server GET→projection→editor→DOCX/print E2E is still required before issue #3 can be closed.
- Render/print textual parity of 43 protected papers and DOCX tests are not a physical printer, pixel-perfect edited bilingual multipage PDF, two-column odd pagination, or independent human UAT.
- Grade IX–X approved snapshot count remains zero unless independent Academic Master certified signoffs become available. Unverified questions must not be selectable.
- Issue #2 prior Phase3AE checked archive is not confirmed recovered in this VPS worktree and physical PostgreSQL 18 runner is unavailable; do not assert completion. Historic full conversations are not wholly accessible byte-for-byte and are not release authority.
- Core Phase 9 candidate `feb084499324c68637d5b89ef7dc425e9e21a922` remains stage-only; latest live metadata is not its signed DB design. Production release is SaaS Core's responsibility after complete certifying release gates.

## Release and integration handoff

1. SaaS Core must review optional `headingFormatting` contract on the latest signed Paper and Assessment backend, including JSON validation and secure authoritative reload, and reconcile only the scoped Phase 9 frontend/model patch onto the current certified descendant. Keep live stored revisions and official papers immutable.
2. Paper Studio + actual teacher browser must test signed restricted login, server Save/GET of formatted English and Urdu with new canonical document, conflicting revision recovery, exact editor/print parity, long RTL and odd 2-column output, and physical printer.
3. Issue #2 PG18 intent recovery remains isolated/not deployed; school curriculum and Academic Master approvals remain independent gates.
4. This isolated branch can be reverted/cherry-picked without touching live release. **No production promotion, rollback invocation or live migration was performed.**
