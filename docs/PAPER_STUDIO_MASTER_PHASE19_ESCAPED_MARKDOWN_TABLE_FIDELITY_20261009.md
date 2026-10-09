# ASSPS Paper Studio Phase19 — escaped Markdown pipe cell fidelity

2026-10-09 ~02:32–02:44 UTC. **Isolated owner change, NOT deployed.**

## Canonical governance

- Read GitHub issue #4 latest checkpoints and coordination `PAPER_STUDIO_MASTER_HANDOFF.md` plus `CHAT_CONSOLIDATION_AND_AGENT_GOVERNANCE_20261008.md`. Latest verified Paper Studio Phase18 `f64bdf4ae58ae0d27a91c592c21655e1e7f9a394`; SaaS Core Phase21 `f01638e7dbc9a7ea3f788619bc8cb44525c2ee24` independently controls the private uploads/Nginx gate. New clean worktree `/root/workspace/assps-paper-studio-master-phase19-20261009`, branch `feat/paper-studio-phase19-escaped-table-cells-20261009`, exact direct child of Phase18.
- Live prechange production frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`, backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`. No production service, PM2, DB, source/official First Term papers, marks, original templates, JWT/RLS, Academic IX/X questions, Connect, printer, or deploy changed.

## New user-content corruption bug: real negative reproduction

Existing SourceTable Markdown parser split every line with `.split('|')` even for escaped literal pipes (`\|`). Existing cell-editor serializer joined raw cell strings, so subsequent cell edits could lose original 3-column alignment. Genuine Playwright Chromium actual Vite/React Paper Workspace synthetic bilingual Science source fixture: escaped header, Urdu/English answer pipes, escaped scientific backslash and four unique ESCAPED markers. **Prepatch RED**: expected 3 cells in every row; browser DOM displayed `[4,5,4]` columns and a literal `\|` split across cells. Evidence `/tmp/paper-p19-escaped-red.log`. No official or tenant data involved.

## Narrow code, shared preview/editor/print

- Moved exactly two existing functions `parseMarkdownTable` and `serializeMarkdownRows` from `OfficialSectionRenderer.jsx` into directly imported pure `official/markdownTableCodec.js`. Scanner treats an escaped pipe as literal cell text and two consecutive backslashes as one backslash; preserves ordinary single TeX backslashes and unescaped structural separators. Serialize now escapes backslashes followed by literal pipes **before** building the three-column Markdown string. Markdown header divider rows (`---`, `:---:`, etc.) still excluded. Normal legacy/simple table parsing unchanged.
- Existing SourceTable cell edit callback continues saving `content:serializeMarkdownRows(nextRows)` and richText, with **no changes to global InlineEditable, question marks, typography, RTL or paper templates**.

## Executed evidence

| Gate | Measured result |
| --- | --- |
| Genuine browser before patch | **RED**, three rows column widths `[4,5,4]` instead of `[3,3,3]`. `/tmp/paper-p19-escaped-red.log` |
| Same browser after change + cloned print frame + headless A4 | **PASS**, preview and print rows `[3,3,3]`, literal pipe/backslash and Urdu text preserved, PDF **1 page**. `/tmp/paper-p19-escaped-green.log` |
| Real user edit then reopen preview + print | **PASS**, click Edit Paper → focus target cell → fill pipe-bearing revised rubric → blur → Done Editing → identical 3-column preview and cloned print frame with exact committed value and untouched other cells. `/tmp/paper-p19-escaped-edit-final.log` |
| Pure parser/serializer parity tests | **5/5 PASS**: escaping, Unicode, uneven backslash runs, TeX, original separators, source edited-cell roundtrip, legacy compatibility. Initial test had a JavaScript syntax typo, corrected prior to passing run. `/tmp/paper-p19-codec-tests.log` |
| New isolated codec, codec test, browser test ESLint | **PASS, exit 0**, `/tmp/paper-p19-eslint.log` |
| Previous 8 renderer browser print-test files | **12/12 PASS, process exit 0** (including Phase18 vertical maths and Phase17 exceptional Urdu sentence), `/tmp/paper-p19-prior-print.log/.rc`; ~326s concurrent shared VPS |
| 43 original First Term papers render/print parity | **43/43 PASS**, controlled process **exit 0**, test duration 493.50s / full TAP 500.24s, fail/skip/cancel 0; `/tmp/paper-p19-all43.log/.rc`. Exact source code unchanged throughout corpus run. |
| Protected template verification | **6 originals unchanged, exit 0**, `/tmp/paper-p19-templates.log/.rc` |
| Full frontend Vite build | **PASS 2,519 modules, 51.52s, exit 0**, `/tmp/paper-p19-build.log/.rc` |
| Original 43-paper DOCX model & maths images | **4/4 PASS exit 0**, 1027 nodes, 315 tables, 612 RTL blocks, 4 vertical-maths structures, `/tmp/paper-p19-docx-model.log` |
| Isolated Git staged whitespace, pushed remote SHA and clean worktree | Verify at final commit, link final comment to issue #4 |

**Known separate editor gesture observation:** Playwright `.fill()` without first manually focusing a synthetic `contentEditable` field in one exploratory run appended stale text; a real cell click then `.fill()`+blur committed the exact new value and printed correctly. This codec does NOT claim to fix the global InlineEditable interaction; if reproducible using standard user gestures, it is a separate Paper Studio bug and must have independent isolation/tests. No shared editor changes were made here.

## Release HOLD / exact Core handoff

SaaS Core must selectively integrate only this new pure parser/serializer module, renderer import and synthetic tests onto latest signed non-BYPASS Core descendant. **Do not merge a stale Paper Studio branch over Core Phase21 security**, which has still-failing production Nginx private-media gate and owns any release/deployment. Staff signed teacher Save→GET→reopen→DOCX/PDF, protected tenant RLS/77-table grants, Windows/USB printer/Nastaleeq visual page acceptance, server backup/rollback/perimeter and exact production source review remain uncertified. Academic IX–X human-approved question count remains 0; original Phase3AE signed reviewed ZIP/PG18 and complete historic chats cannot be independently byte-verified. NO DEPLOYMENT.
