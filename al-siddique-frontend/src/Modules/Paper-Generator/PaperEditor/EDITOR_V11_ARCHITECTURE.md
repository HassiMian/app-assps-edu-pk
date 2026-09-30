# Editor V11 – Selection, RTL and Light Appearance
Date: 2026-09-30. Isolated branch: feature/paper-editor-v11-selection-light-20260930.

## Evidence and scope
Affected surface: PTSPaperGenerator Paper Workspace > Edit Paper, not the separate Canonical Paper Editor V2.
- Screenshot: selected Urdu heading, pressing B does not visibly emphasize that heading; marks show heavy weight.
- Existing PaperInlineEditor uses applyRangeStyle which blindly inserts spans and never toggles back off.
- Native browser focus/selection changes plus eager onBlur/commit can invalidate the active range.
- Existing section heading and instruction explicitly use fontWeight 900 even before Bold, obscuring any selected bold result.
- StableClosingBracket text glyph has Urdu/Latin baseline and relative-size mismatch.
- Light mode tokens exist, but several controls, select/options and fixed inspector/toolbar panels have dark inline colors.

## Architecture and invariants
1. Selection transaction is keyed by sectionId and fieldKey; never mutate a different field.
2. Preserve noncollapsed DOM Range as offsets while targeting selected editable; toolbar button pointer down must not steal field focus; select/color controls may blur but must not eagerly commit/rewrite highlighted DOM.
3. Inline B/I/U/S use reversible explicit formatting with Word-style toggle. Preserve mixed styles and independent surrounding content, and expose aria-pressed for active formatting state.
4. Formatting must retain selection for subsequent clicks and preserve content on Done Editing, Save, preview and print; unmodified onBlur must not cause rerenders.
5. Default question instruction weight is distinct from selected bold; serial number and marks remain separate and immutable unless edited directly.
6. Urdu option bracket must be actual isolated LTR closing parenthesis after label; normalize optical size, baseline and spacing in actual MCQ table, not merely abstract tests. Keep text content and option order unchanged.
7. Three-color workspace appearance: neutral white/background, navy text/surface, muted gold interactive accent. Neutrals are shades, status red/green only when semantically necessary. Do not change printable paper typography/colors or other modules.
8. Paper Workspace Light Mode defaults on, is switchable to Dark locally and persists. The main app's stored global theme remains untouched.

## Implementation sequence
A. Add targeted red/green tests for heading selection Bold twice, Underline twice, Italic twice, marks isolation, focus transit to toolbar and save/print persistence.
B. Replace irreversible applyRangeStyle for marks with reversible field-scoped formatting. Eliminate eager no-op blur commits and keep selection snapshot anchored.
C. Normalize Urdu option bracket size/baseline; test geometry + option ordering and print clone.
D. Audit Light Mode controls: theme tokens, native inputs, inspector, floating toolbar, dropdown contrast, focus and disabled states. Use scoped styling/data attributes, not blanket print selectors.
E. Browser acceptance in Chrome, static render/print parity, full production build, metadata and rollback. No production rollout until relevant tests pass.

## Separate review tracks
- Selection/State: DOM field identity, range mapping, history and reversible actions.
- Urdu/Typography: RTL reading order, optical parenthesis and print fidelity.
- UI/QA: contrast/visibility and no data changes outside scoped editor.
