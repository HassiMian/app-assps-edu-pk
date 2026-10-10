# ASSPS Result Card Studio Phase7 — results-only Core-descendant integration

Date 10 October 2026, urgent school result printing.

## Exact source relationship
- Verified Core descendant `1d30251bf0c2bc717da0422b89d7169e5e977843` is the base, containing latest positive real disposable signed-policy test from issue #4. It is **not** proof of Core production release certification.
- This integration selectively forward-ports result-specific Phase2 `2337f0da`, Phase3 `9d729b03`, only the `premiumResultCardTemplates.jsx` SaaS dynamic logo fix plus related isolated test from Phase4, Phase5 `e0aab470`, Phase6 `dfd04312`.
- **Never merge the original Phase4–6 feature-branch ancestry directly into production:** those ancestors contain deferred APEX authentication/reset changes. This branch intentionally contains only ResultCards and exam-result read API, plus tests/documentation; compared against Core base, `authRoutes.js`, LoginPage.jsx and App.jsx are byte-identical, confirmed `git diff --quiet` exit0.
- Existing six protected paper/official template hash sources unchanged and original reference card templates delegated unmodified. Result card emblem comes ONLY from SaaS paperSettings.logo, with no fallback to APEX or synthetic/uploaded crest.

## Correctness and print coverage
- 3 premium template architectures, preview/print parity, light-weight vector subject and doughnut charts, 12-subject A4 geometry.
- Per-card automatic term selection in mixed First/Second/Third/Annual/Monthly exam print batches; manual teacher override. No hardcoded passing threshold or invented grade band.
- Authentic student class and section from existing school-scoped single-exam GET query `s.class AS student_class`, `s.section AS student_section`, and all-exam data, not from `All Classes` exam filter; print roll number from student field, session from actual SaaS settings.
- Missing/unloaded original SaaS school logo blocks Print/Save-as-PDF; missing marks require confirmation, invalid records stay ungraded/pending. Chrome standard Print dialog chooses Save as PDF. Real Chromium generated exactly 25 A4 pages for 25 synthetic students; no real student data accessed.

## Fresh acceptance (on THIS Core integration branch)
- `node scripts/test-result-student-identity.mjs`: 15 source/SSR checks PASS exit0.
- `node scripts/test-premium-result-cards.mjs`: 3 template SSR + null/zero/grade/legacy-source delegation PASS exit0.
- `node scripts/test-saas-school-logo-source.mjs`: 4/4 same-tenant configured logo source + no APEX fallback PASS exit0.
- `node scripts/test-result-designer-real-browser.mjs`: actual Vite/Chromium premium selection/mixed batch/missing+broken logo DENY PASS exit0.
- `CARDS=25 node scripts/test-result-batch-pdf-a4.mjs`: actual generated Chromium PDF 25 pages / 25 synthetic student records and term headers PASS exit0; 481161 bytes.
- `npm run verify:templates`: six SHA-protected originals PASS exit0.
- `npm run build`: optimized Vite production frontend build PASS exit0 (3.09s).
- Logs `/tmp/assps-result-core-p7-{identity,ssr,logo,browser,batch,protected,build}.log`.

## Explicit HOLD and finishing step
No real authenticated teacher/test marks/logo availability, actual school physical printing or signed Core production release has been confirmed. Core base is a test descendant, not a certified deployment baseline. SaaS Core release owner must verify current canonical ancestry, real tenant-role RLS/HTTPS uploaded school logo, grade-settings response, rollback, batch print actual school data and receive school print sign-off; then approved release can promote result-only frontend/backend changes. No production, PM2/Nginx, database or school records changed here. If release remains unsigned on print day, school must use existing certified live result print workflow, after manual checking logo, term, grade and A4 pages, or provide authorized real exports to prepare an accurate private PDF; do not fabricate school marks or a logo.
