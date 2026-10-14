# ASSPS Result Cards: one batch, all pages visible, one print command
Date: 2026-10-14. Scope: **Result Card Designer preview and print UX only**. Exact production frontend source base: `4aa0e0276bfa791e687a5f7d636f69d6e35012e6`. Existing marks/grades, teacher permissions, documents, backend endpoints, PM2, and RLS are unchanged.

## Root-cause evidence
The existing modal constructed a correct `dataList` (e.g. 45 students) and `openResultPrintWindow(dataList,...)` already serialized every result card into a single HTML print document. However, in `ProfessionalParametersModal`, preview was hard-coded to `dataList[0]` and claimed 'Previewing first card'. Operators couldn't visually verify the full batch, leading to student-by-student printing. This is a visibility/workflow bug, not an exam marks data bug.

## Locked architectural pipeline
1. Existing authenticated exam selection → current exact class+section filter → pre-existing authorized saved marks fetch. **No new marks queries or enrollment inference.**
2. Build immutable per-student print cards once for each modal options state; `useMemo` recalculates only for data/template/options changes, not for page jump.
3. Existing `summarizePrintBatch` fail-closed gate (official logo, identities, per-subject marks, grade bands, pending confirmation) applies to the ENTIRE batch. A print request isn't allowed to silently omit an invalid student.
4. New `ResultBatchPagesPreview`: **All Pages by default**, stacked A4 student cards, each labeled Page N/N + name + GR, with "Go to page" selection; optional One Page mode for detail inspection. Screen preview uses CSS scale wrappers to preserve A4 proportions and independent scroll. **No hidden filter limiting the print job to the page currently visible.**
5. Prominent modal header **Print All N Cards**, existing toolbar **Print All N Cards**, and bottom print command all use the **same** guarded callback. Save All as PDF opens the same print-ready complete batch for users to choose Save as PDF in the browser's system dialog. System printer selection remains user-controlled (USB/WiFi/network), not invented/remote-spooled.
6. Existing independent print renderer `openResultPrintWindow(dataList)` outputs all N cards in one new browser print window, with one A4 page break per student. All document-level fonts, print overflow checks and logo readiness checks stay unchanged. Reuse existing nine templates without rewriting their protected structure.
7. No live school marks/status edits; no teacher/auth scope changes. Preexisting class filtering, single-student output, and all-exam output remain unchanged. Examinations publication hold is untouched.

## Live acceptance gate
- Isolated Playwright/Chromium run with **45 synthetic students**, 2 complete subject marks each, and **no production credentials**: 45 page sections and 45 A4 card previews, first and last students distinct, jump to Page 45, switch to One Page (1 visible) and back to All Pages (45 visible).
- Template changes to Swiss Grid update both the focused preview and **all 45 printed pages**. Clicking Print All **once** from One Page mode opens **one popup with 45 distinct A4 cards**, and print-ready script actually invokes `window.print` in isolated QA without cropping/asset errors. No student re-selection.
- Scoped ESLint, protected templates integrity 6/6, Vite build, existing marks-register unit/browser regression.
- Frontend-only release: snapshot actual Nginx root index/meta; retain existing assets; stage new immutable chunk assets before swapping index atomically. Validate public HTTPS, result route, new chunks, and anonymous API 401. Preserve documented immediate rollback.
- Physical printer and authenticated principal acceptance need a human confirmation; synthetic browser success is **not** a claim of successfully printing 45 physical papers.
