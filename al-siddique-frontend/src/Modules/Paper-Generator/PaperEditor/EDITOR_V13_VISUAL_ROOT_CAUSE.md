# Paper Workspace V13 — verified Urdu visual-rendering repair

Date: 2026-09-30. Baseline: V12 d92fddc. Scoped fix branch: fix/paper-workspace-v13-font-bracket-visual.

## What V11/V12 missed

- A formatting test asserted generated markup / computed font-weight 700 without checking visible font raster. Chromium showed **0 changed pixels** after applying Bold to selected Urdu text.
- Global/shared and print @font-face descriptors falsely declared the single installed local Jameel Noori face as a variable weight range `400 900`. All weights resolved to the same glyph outline. Declaring the actual face `400` allows synthesized Bold; measured **530 changed/darker pixels** in the same selected Urdu phrase. The invalid /fonts/JameelNooriNastaleeqKasheeda.ttf URL returned 200 HTML (SPA fallback), not font bytes. Removed that broken URL; use the user's installed local Jameel face, then the existing Noto Nastaliq / Urdu Typesetting fallback. Do not distribute an unlicensed font file.
- Browser font-style:italic for this Jameel face changed CSS but rendered **0 pixels**. The editor now retains semantic italic and gives Urdu word runs a safe, optically small -8deg skew; spaces stay text nodes so lines can wrap. Measured **462 changed pixels**. Pasted styles only allow exact editor-generated inline-block and skewX(-8deg). Toggle OFF restores original pixels and save/preview/print retains the effect.
- StableClosingBracket formerly isolated the logical `)` as LTR; in a right-to-left option label this made the curve face the wrong way. Isolate `)` as RTL (DOM character stays a true closing parenthesis) for proper mirrored appearance. The print-frame CSS must not override RTL to LTR.
- The user's second screenshot also showed giant `(✓)` *inside the question heading*. This is a different rendering path from MCQ option labels and earlier fixes never reached it. For the question-heading field only, compactly render `(✓)` in isolated 0.85em Arial while preserving original editable text. The markup is idempotent, survives selective formatting, sanitization, Done Editing and print.

## Verification

1. V13-01: selected Urdu Bold raster changes and restores, without touching marks.
2. V13-02: selected Urdu Italic raster changes and restores.
3. V13-03: Urdu option closing punctuation faces correct RTL direction in preview and print.
4. V13-04: saved italic persists through sanitization and print clone.
5. V13-05: exact screenshot-like Class 7 Urdu heading containing `(✓)` keeps compact typography in edit/preview/print without changing statement/marks.
6. V11/V12/Urdu Workspace compatibility: 21/21 PASS.
7. Canonical advanced/metadata regression: 16/16 PASS.
8. Production Vite build: PASS. No unresolved bogus font URL warning.

Scope: editor presentation and the shared Jameel @font-face descriptor correction only. No backend/database mutation, paper regeneration/deletion, voucher edits, other feature logic changes, or new font redistribution. Retain V12 production backup for rollback.

Caveat: browsers without a locally licensed/installed Jameel face will use declared Urdu font fallbacks. Consistent Jameel on those machines requires a properly licensed, hosted font asset, not an HTML SPA fallback.
