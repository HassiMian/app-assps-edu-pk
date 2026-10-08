# ASSPS Paper Studio Master — Phase 8 cross-field selection and official print regression

**UTC:** 2026-10-08 ~16:42–17:05. **Status:** isolated engineering acceptance PASS; production RELEASE HOLD. Issue #3 remains open for integrated human/session/long-page acceptance.

## Verified source and ownership
- Last live frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`; last live backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`, rechecked on VPS 17:03 UTC. No production files, data or services changed.
- Isolated worktree `/root/workspace/assps-paper-studio-master-phase8-20261008`, branch `feat/paper-studio-phase8-crossfield-20261008`, direct descendant of pushed Paper Studio Phase 7 `fc8e769d4b082d4e3a04f241b1351de6b49cce92`. No rebuild from stale V13/V14 or destructive cherry-pick.
- Scope: `PaperInlineEditor.jsx`, `PaperEditor/official/OfficialSectionRenderer.jsx`, one new Chromium test, this report. Official 43-document paper source JSON, marks/scoring definitions, Urdu font files, Daybook, and backend untouched.

## New engineering; before/after defect evidence

Issue #3 previously had two separately contentEditable question serial and instruction spans. The native selection guard deliberately rejected endpoints owned by different fields. A fresh Chromium mouse-drag **FAILED before the final fix**: `window.getSelection().toString()` yielded only `نمبر 1:` or `بر 1:`, not the start of the Urdu instruction. An early bridge could not restore a true native cross-field selection. A shared `contentEditable` question-header ancestor now allows actual Chromium mouse drag across both inline field spans while retaining separate field IDs/commits/rich HTML; the marks badge is still an independent sibling outside this ancestor.

- Mouse-down/mouse-up captures a bounded serial-and-instruction-only range; a DOM glyph-range fallback is used when Chromium caret hit-testing around a nested RTL span returns a point outside the selected inline child. Supports forward and reverse drag.
- Existing field handles and semantic formatting now apply B/I/U over each portion of one continuous selection, on the same question only. Selection survives toolbar activation; richText `questionSerial` and `headingInstruction` save independently. Undo/redo is grouped across both children; snapshots use canonical sanitized HTML, DOM-instance binding and guard against stale serialized document replays.
- Initially the toolbar stayed disabled because shared edit root changes focus semantics; explicit activation on mouse-down solved this. No global/page-wide formatting path added.
- A newly added **adversarial browser test initially FAILed**: Backspace over the cross-field selection merged the serial into the instruction. The shared editor now prevents destructive cross-root beforeinput and keyboard Delete/Backspace at boundaries, while still allowing scoped formatting and in-field text edits.
- Final review preserved independently editable instruction text via root blur commits. No sibling mark edits or other section heading content changes during selection-only formatting. Dynamic selector interpolation was replaced by exact data-section-ID matching to avoid malformed/custom section ID failures.

## Fresh browser, print and build evidence

| Gate | Result |
|---|---|
| New `questionSerialInstructionDragBrowser.test.js`, genuine Playwright Chromium real pointer mouse drag | **5/5 PASS**, including Urdu RTL glyph selection, English LTR, reversed drag, selected-only B/I/U, Bold on/off, undo/redo, edited text persistence on exit, unchanged marks/other heading and destructive Backspace negative test |
| `paperWorkspaceUrduBrowserAcceptance.test.js` | **9/9 PASS** (layout, Nastaleeq/RTL options, selective formatting and styled print preview) |
| `unifiedWorkspaceOfficialBrowserAcceptance.test.js` | **1/1 PASS** |
| `selfServicePaperCreationBrowserPhase1.test.js` | **1/1 PASS**, blank Urdu Create→Save→Reopen→Print |
| `canonicalAll43RenderPrintAcceptance.test.js` | **43/43 PASS** for source/print text parity, isolated test runner exit 0, ~168.97 seconds. `/tmp/assps-paper-phase8-43print.log`, port 5399 |
| `npm run verify:templates` | **6 protected template files unchanged** |
| `npm run build` | **PASS**, Vite 2,518 transformed modules, ~3.54 seconds |
| Git whitespace checks | **PASS** |

**Honest scope limitations:** The new five-case browser suite uses isolated fixtures, not a real logged-in production teacher or a backend persistence endpoint. Existing self-service Save/Reopen acceptance validates the regular creation flow but does not yet independently confirm a *cross-field richText edit* after full server save/reopen. The 43 official-paper suite checks print text/render parity for protected papers, not a physical printer or all long bilingual RTL overflow. True human Chrome/OS print validation and odd two-column page geometry of an edited paper are not established. Do not close issue #3 or claim a deploy-certified release based on these targeted passes.

## Outstanding release owner gates

1. **SaaS Core:** integrate Phase 8 only into the latest secured descendant after Phase 7 signed RLS / ARCHV1 actor/pool reconciliation and privileged path removal, real roles/authenticated DB tests, rollback and perimeter controls. No production deploy by Paper Studio.
2. **Paper Studio + operations:** authenticated teacher select-format-save-server/reopen-print acceptance, editing in mixed English/Urdu, two-column and multiple-page overflow, accessibility and genuine connected-printer output. Continue issue #3. Paper recovery issue #2 remains separate (one-time bound authoring intent + disposable PG18 dual-worker acceptance).
3. **Academic Master:** Grade IX–X question drafts remain unapproved; approved snapshot selection under issue #1 must fail closed for all unreviewed data.
4. **Shared:** Preserve all historic official exams, source documents, tenants, worktrees, branches and metadata. No stale branch deployment or branch reset.
