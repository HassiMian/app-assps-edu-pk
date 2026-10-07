# Paper Workspace V12 — regression recovery architecture
Date: 2026-09-30. Release base: 259c80f (V11 production, with Nine fee hotfix preserved).

## User-observed evidence
Class One/Seven Urdu screenshot: question-heading selection is visible, yet selected Bold/Italic may be invisible, Underline does not reliably toggle off; marks badge looks bold. Editable text clicks do not reliably open the inspector. The portal and workspace may show contradictory themes. Earlier programmatic Q1 tests did not cover field transitions, computed style or the global ThemeProvider.

## Root-cause audit / architecture decision
- V11 toolbar's activeEditable React object could become stale while the native selection moved to a different field. Command ownership MUST derive from the actual DOM selection and exact section + field identity, never an unrelated cached marks range.
- Native execCommand can report inherited styling and fail to remove prior nested CSS spans. Normalize inline markup to per-text-run marks; update ONLY the selected range for reversible B/I/U/S, preserving other marks and rich text properties.
- Use live WeakMap editor-to-current-handler registration, plus a short-lived last real selection snapshot only for toolbar focus transfer. Reject cross-field selection and avoid React parent remounts during dragging.
- Maintain scoped semantic formatting history for Undo/Redo; native fallback covers multiline fields. Test actual computed style and persisted rich HTML, not merely toolbar colors.
- First focus/click on an editable question must activate its matching section/inspector without moving the paper or changing print.
- Global ThemeContext is the ONLY theme authority. Remove the independent Paper Workspace storage key; toggling from global header or workspace updates both and respects persistence without forced route reset.
- Color families are navy, muted gold and white/neutral. Red/green are status colors only. Printable paper and other modules remain unchanged.

## Required release gates
1. Transition from Q1 marks to Q2 heading: only selected Q2 word changes; both marks remain identical.
2. Single-click Q2 heading opens its inspector.
3. Previously styled underline toggles OFF then ON without Clear.
4. Global header and workspace themes synchronize both ways.
5. Selected Bold, Italic, Underline have visible computed style, toggle OFF independently, and do not change marks or wording.
6. Scoped Undo/Redo of formatting preserves question wording.
7. Real Chromium mouse drag stays selected after inspector updates and affects only its owning field.
8. Existing V11, Urdu RTL/print and canonical regression suites plus production build pass.
9. Isolated release worktree, version/hash verification, rollback preserved. No database mutation, paper deletion or voucher regeneration.

## Review tracks
Selection/State, Urdu/Typography/Print, UI/Contrast/QA are separate checks. External Claude/Bedrock review was unavailable (account access denied), so do not claim external agent approval.
