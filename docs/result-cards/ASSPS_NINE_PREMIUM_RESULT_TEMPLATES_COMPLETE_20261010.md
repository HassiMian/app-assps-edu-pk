# ASSPS Premium Result Card Studio — NINE PRINT-READY TEMPLATE SOURCE

Date 2026-10-10. Branch `feat/resultcards-nine-premium-phase8-20261010`, based on result-only Core integration `5cd56b989eb7c3411fee4601553f8ea1997a2a26`. **Result-card scope exclusively; NO production deployment or school record mutations.**

## Nine original premium designs (not color-only duplicates)

| ID | Name | Independent composition/print language |
|---|---|---|
| signature-editorial | Signature Editorial | restrained traditional editorial typography and low-ink sectional framing |
| swiss-grid | Swiss Grid | modular profile/marks bands and sharp column geometry |
| data-atelier | Data Atelier | teal analytics-forward typography with score donut beside subject-bars in reversed order |
| regal-linework | Regal Linework | fine champagne linework, scholastic ribbon, serif header and reversed insight order |
| young-scholars | Young Scholars | light cyan/teal/coral pill accents, numbered student, results and growth sections |
| academic-heritage | Academic Heritage | forest-green ceremonial rules, centered school-year seal and green register |
| airframe-geometry | Airframe Geometry | asymmetric left axis, technical labels and spacious angular information flow |
| corporate-ledger | Corporate Ledger | silver/charcoal corporate folio, monochrome statement bands and restrained analytic dividers |
| examination-dossier | Examination Dossier | formal navy official-file architecture, labelled sections A/B/C and dashed analytic cells |

Each document reuses *the same verified original exam marks*, grade band settings, configured SaaS `paperSettings.logo`, student identity, response data, and section/marks/total renderer. No synthetic or generated logo is installed. Thin-ring donut and individual subject-wise labeled bars are mandatory for all nine. All premium templates use printable A4 portrait, white page background and minimal colored surface coverage; existing ten protected reference templates remain unchanged.

## Academic accuracy hardening
- Auto-detect Term 1/2/3, First/Second/Third/Final, annual/monthly using the same term-key planner used in the designer. Explicit manual choice remains possible.
- Per-subject maximum marks are read from actual subject row or exam maximum, not an invented default; marks outside [0, max] or no known maximum become pending and ungraded.
- Explicit zero (`0/100`), decimal (`33.5/50 = 67%`), and absent/missing marks have distinct representations. Weighted complete example `113.5/250 = 45.4%`, not average of individual subject percentages.
- Partial multi-term rows do not get a fabricated calculated grade. If **any** selected subject is missing/incomplete, the aggregate percentage and grade remain pending (while individual recorded scores still show). School grading bands evaluate the unrounded underlying result, matching the existing backend grade-rule semantics; displayed numeric percentages show at most one decimal place.
- Student class/section/roll from tenant-scoped result API, not "All Classes" filter. No arbitrary student marks or pass thresholds created.
- Authentic tenant logo only from SaaS paper settings; missing/broken logo preflight prevents printing. APEX logo belongs to login screen and never enters result cards.

## Fresh nine-template source acceptance and traceable logs (ALL exit code 0)
1. `node scripts/test-nine-premium-mark-accuracy.mjs`: 9/9 distinct template SSR, 80/100, 33.5/50, 0/100, missing, grade settings, mandatory donut+bars, manual two-term incomplete, Term1 naming and fractional boundary PASS.
2. `node scripts/test-premium-result-cards.mjs`: all 9 premium + legacy reference delegation, zero/missing/invalid/pass behavior PASS.
3. `node scripts/test-result-print-planning.mjs`: exam-term selection/preview readiness PASS.
4. `node scripts/test-result-student-identity.mjs`: real class/section/roll SSR identity PASS.
5. `node scripts/test-saas-school-logo-source.mjs`: 4/4 strict SaaS-configured logo-source checks PASS.
6. `node scripts/test-result-designer-real-browser.mjs`: 9 template thumbnails; real headless Chromium template switching (Swiss, Dossier, Heritage), 3-student popup, missing/broken original logo printing block PASS.
7. `RESULT_EXTRA_SUBJECTS=1 node scripts/test-premium-result-a4.mjs`: **9/9** real Chromium one-page A4 PDFs; 12 subjects per card, no clipping or extra sheet PASS. Nine screenshot files generated under isolated VPS `/tmp/assps-premium-*-20261009.png`; their nine SHA256 hashes were distinct.
8. `CARDS=25 node scripts/test-result-batch-pdf-a4.mjs`: **25 students → exactly 25 PDF pages**, all nine distinct templates in same PDF and correct first/second/final term headers; 751229 bytes, Chromium PASS.
9. `npm run verify:templates`: six protected source hashes unchanged PASS.
10. Focused ESLint on premium module and affected regression scripts with inherited mixed-export react-refresh rule disabled PASS.
11. `npm run build`: Vite optimized frontend build PASS in 3.14s.

Logs: `/tmp/assps-p8-{nine-marks,premium-regression,print-plan,student-id,logo,browser,nine-a4,batch25,protected,lint,build}.log` (VPS-local). All tests are synthetic; no authorized actual student marks fetched or changed.

## Release boundary
This is finished source/automated-template testing, NOT a claim the live school app has these templates. Current Core production certification, actual authenticated tenant acceptance and physical school printer proof remain separate release responsibilities already deferred to issue #4; **do not deploy without certified approval**. No auth/payment/RLS/printing-device/module code changed in this sprint. No generated crests or grades were injected.


## Phase 9 post-completion visual stress regression (10 Oct 2026)
An additional print stress case exposed a genuine hidden clipping defect in the previously 9/9 PASS standard-length fixtures: 12 realistic, **long English and Urdu subject labels** plus a long student/father name made card content extend 166–243 pixels beyond the fixed A4 page even though headless Chromium generated exactly one PDF page. This could silently crop teacher remarks/signatures on real reports. A passing PDF page-count check alone was insufficient.

**Scoped corrective implementation:** `BaseTemplate` detects 10+ subject rows with lengthy labels/names and adds a `premium-dense` class. The conditional print CSS preserves every marks row, the complete head/footer and both mandatory charts, while rebalancing subject width, compacting repeated labels, and reducing only layout whitespace/font sizes for the dense scenario; normal-length styles remain unchanged. No arbitrary truncation, `display:none`, zoom scaling, source marks mutation, or synthetic logo substitution. Student class/sections and official tenant-branding still come from SaaS.

**Executed verification after fix:** `node scripts/test-premium-result-long-text-a4.mjs` 9/9 strict PDF A4 checks PASS for long English and Urdu titles, 12 subjects, no horizontal/vertical overflow and footer within fixed canvas; page count 1/1 in each. Original 12-subject 9-template A4 tests, 9-template grade accuracy, 25-card/25-page mixed-design Chromium PDF, browser Designer real interactions, 6 protected source hashes, focused lint and Vite optimized build also EXIT0. Logs `/tmp/assps-p9-long-rtl.log, /tmp/assps-p9-marks.log, /tmp/assps-p9-template-ssr.log, /tmp/assps-p9-normal12.log, /tmp/assps-p9-batch25-rerun.log, /tmp/assps-p9-lint-final.log, /tmp/assps-p9-build-final.log` (where lint is `/tmp/assps-p9-lint-final.log` and build is `/tmp/assps-p9-build-final.log`).

**Release boundary unchanged:** source and tests are ready, but no certified production deployment or real school marks/physical printer acceptance claimed.
