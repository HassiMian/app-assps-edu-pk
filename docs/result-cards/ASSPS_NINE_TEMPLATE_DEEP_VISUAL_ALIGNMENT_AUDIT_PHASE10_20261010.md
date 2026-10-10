# ASSPS Result Card Studio — Phase 10 adversarial design/layout/print audit

**Date:** 10 Oct 2026. **Scope:** nine premium result-card templates and their teacher-facing editor ONLY. Isolated worktree `/root/workspace/assps-resultcard-adversarial-layout-phase10-20261010`, clean parent SHA `b986d18467000091cd5ea3dc96cda877e927324b`. No original ten reference templates, protected hash baselines, live school data, API/RLS/auth/payment modules or production services modified.

## Challenge method
The source was challenged beyond the previous normal 12-subject A4 tests. A new *actual headless Chromium* adversarial test measures every template's 210×297mm page height/scrollWidth, the marks-table and chart, the remarks and footer rectangles, horizontal/vertical clipping inside actual rendered table/header/student/chart fields, and PDF page count. It is not an approximate screenshot-hash test.

Scenarios × all **9** templates:
1. **minimal:** 1 recorded subject;
2. **normal:** 9 standard subjects;
3. **dense:** 12 lengthy English/Urdu subject labels, long school/student/father names;
4. **extended:** 16 lengthy subjects;
5. **identity:** 10 subjects with long identity and school details;
6. **remarks:** 12 lengthy subjects + full 520-character teacher feedback;
7. **fiveTerms:** 12 long subjects + all five assessment/term columns;
8. **overflow:** 20 long subjects + long names and 520-character teacher feedback.

**Final actual results:** **72/72 passes**, nine separately validated PDF pages per scenario, no horizontal/vertical clip, no overlap between table/analytics/feedback/footer and text element scrolling; logs `/tmp/assps-p10-final-{minimal,normal,dense,extended,identity,remarks,fiveTerms,overflow}.log`, each `LAYOUT_GREEN ... 9/9` and exit 0.

## Genuine source failures challenged and fixed (RED → GREEN)

| Before | Reproduced failure | Fix | Evidence after |
|---|---|---|---|
| Manual 5-term Corporate Ledger | Full `Assessment` heading overflowed cell by 5px (previous tests did not include five manual terms) | 3+ term columns now use semantic compact labels `Assess.`, `Term 1`, `Term 2`, `Term 3`, `Final`, auto multi-term width/letter-spacing/padding; source term metadata unchanged | FiveTerms 9/9 PASS, new grade calculation `400/500=80%` SSR PASS |
| 20 lengthy subject rows + long remarks | All 9 A4 results overflowed and placed footer/signatures 68–150px beyond paper; a one-page PDF deceptively counted as PASS | Conditional `premium-ultra-dense` low-ink geometry, cell/subject label wrapping and rebalanced chart/table/footer spacings; never removes marks rows, charts or feedback | Overflow 9/9 PASS; each actual PDF exactly one A4 sheet, footer inside canvas |
| 9 lengthy subject names | Compact layout previously activated at 10+ rows; 9 lengthy names produced ~295px overflow | Density now activates for >=7 sufficiently long subject names, even at 9 subjects | Real Chromium good two-student print preflight PASS |
| Teacher Remarks data source | Default modal copy silently took precedence over an already-saved exam-specific teacher remark | Preserve each `exam.teacherRemarks` or `exam.teacher_remarks` unless the teacher **explicitly edits** the modal remarks; support intentional cleared text. Preview textarea follows selected first exam's true original remarks; editing in multi-card batch explains it applies to all cards | SSR per-exam distinct remarks + explicit edits/blank override PASS, teacher UI Chromium test PASS |
| Print popup failing silently on unknown future content | Fixed-size A4 with `overflow:hidden` could crop late contents while print proceeded | Preflight scans **every** card's A4 root dimensions, rendered footer and table/student/subject/remarks text boxes after fonts/assets ready; if ANY overflow, abort browser Print with card index and correction notice. Original SaaS logo fetch preflight retained. | Actual valid two-card batch prints once; deliberately oversized 39-subject second card blocks print with clear message; zero print calls. |
| Urdu motto style | Original shared line-height 1 and left-aligned masthead could clip Nastaliq ascenders or position RTL inconsistently | Premium-only centered RTL / glyph-safe 1.65 line height (original protected template unchanged) | All 72 scenarios rerun after style change PASS |
| Designer Remarks editor colors | Dark/slate buttons and textarea mixed with otherwise light/silver premium editor; batch override semantics not stated | Light readable input/preset surfaces, teal section accents, explicit note that edits apply to all cards while unchanged source remarks remain per-exam | Vite+Chromium real Designer regression PASS |

The 20-subject extreme card necessarily uses smaller text than a 9-subject normal card; it remains physically A4 sized, never zooms page or hides data. Truly excessive records (e.g. 39 very long subjects plus 1,900-character feedback) **fail closed at print preflight** rather than produce a misleading clipped report. The original logo always comes ONLY from the persisted tenant SaaS `paperSettings.logo`. Test logos and names are synthetic fixtures, never substituted into application production.

## Independent final regression (all numeric EXIT 0)
- `node scripts/test-nine-premium-mark-accuracy.mjs`: all nine themes, real grading band source, decimal score, zero vs missing, term-based source alignment, vector chart label/bar ratios.
- `node scripts/test-nine-result-feedback-and-five-terms.mjs`: real exam/teacher-edit feedback precedence, five manual term headings and `400/500=80%`.
- `node scripts/test-nine-result-print-overflow-guard.mjs`: end-to-end print run/deny on good and deliberately overflowing batch.
- `node scripts/test-premium-result-cards.mjs`: all premium and unchanged legacy reference mapping.
- `node scripts/test-result-designer-real-browser.mjs`: real browser nine-theme controls, true exam remarks edit, 3-card popup, real configured-logo loading/denial.
- `CARDS=25 node scripts/test-result-batch-pdf-a4.mjs`: **exactly 25 A4 PDF pages for 25 synthetic students**, nine style classes, mixed exam terms.
- `node scripts/test-premium-result-long-text-a4.mjs`: nine English/Urdu 12-subject A4 sheets with no horizontal/vertical overflow.
- `npm run verify:templates`: **PASS original six fingerprint-protected source files unchanged**.
- Focused ESLint on the changed React/template and new test modules (existing inherited mixed-export-only rule excluded) **PASS**.
- Vite optimized production build **PASS**, 3.58s.

Execution logs `/tmp/assps-p10-final-{accuracy,a4-guard,browser-batch,lint-build}.log` and separate evidence above, all generated on isolated VPS and not user-downloadable conversation attachments.

## Release boundary and honest exclusions
Static/synthetic A4 browser tests are complete; actual authenticated live teacher session, real school data, physical printer/color/grayscale/Nastaliq font installation and signed SaaS Core production release/rollback certification are still separate responsibilities. There was **no production deployment** and no mutation of records. Follow existing issue #4 governance. No new AI-generated crest, no hardcoded pass mark, no source marks fabrication.
