# V13: real Urdu glyph and RTL-bracket recovery (2026-09-30)

## Screenshot-level failures previous tests missed
1. B button and span style changed, but the Urdu glyphs did not get heavier; the Latin tick did. The Jameel Noori font is a static face while existing global CSS advertised it as a variable `font-weight: 400 900` face.
2. React committed selected Bold with CSS `font-weight: bold`, but sanitizeInlineHtml serialized it as `font-weight:bold`. A print/screen emphasis selector requiring a space silently stopped matching after saving.
3. LTR ASCII `)` was visually oriented as a Latin close rather than an RTL option-label close in an RTL flex row. Rendering `)` in a fixed isolated span alone did not correct its physical orientation.
4. Chromium clamps a drag across independently editable question serial and title to the first editing host; the selected text was only `سوال نمبر 2:`, not the statement. Earlier tests programmatically selected the instruction alone and missed this case.

## Scoped implementation
- Use `ASSPS Paper Static Noori` with a *single* regular `@font-face` (400 only) in the Paper Workspace. Set `font-synthesis: weight style` for paper content; keep Nastaleeq family/fallback consistent in both print iframe entry points.
- Apply a minimal selected-bold optical complement only to explicit bold spans, matching both sanitizer forms (`font-weight: bold` and `font-weight:bold`). Unselected prose, question number and marks stay unchanged.
- The one shared StableClosingBracket component keeps a semantic `)` for text/storage and mirrors *only its visual glyph* (`scaleX(-1)`) to close the Urdu label when laid out right-to-left. Screen and print share this inline transform.
- For full question-serial drag clipped by Chrome, redirect the action to the *same section* heading instruction. Do not touch marks, MCQ serials, other sections or the school identity. Normal independent heading selection remains unchanged.
- Preserve V12 single-click inspector and global ThemeContext. No fees/database migrations, paper deletions, or other modules.

## Required gates
- Screenshot-pixel difference must show *Urdu* heading ink visibly thicker after B (not just `aria-pressed`, DOM styles or a Latin check mark).
- Drag from question serial across title (Chrome clips to serial) must emphasize the complete corresponding instruction, leaving marks untouched.
- All four MCQ option brackets must have correct physical order, compact geometry, stable RTL mirror and same print transform.
- After Done Editing, print iframe must use the paper-scoped static font and the saved bold optical complement (including compact sanitizer CSS).
- V13 focused + V12 + V11 + Urdu print + canonical editor regressions and Vite build must pass before release.
