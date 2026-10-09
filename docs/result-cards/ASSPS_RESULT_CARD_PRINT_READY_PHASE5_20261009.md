# ASSPS Result Card Studio — urgent print release candidate (10 October print deadline)

Date 2026-10-09. **SCOPE: RESULT CARDS ONLY. Production deployment remains HOLD until SaaS Core certification.**

## Deferred issue #4 release blockers
Per user's explicit print-deadline instruction, deferred authentication SMS/provider, refresh-token revocation, shared OTP multi-worker storage, and general Core RLS/HTTPS ingress/release gates to issue #4 coordination. These ARE NOT waived or cleared. Deferred checkpoint comment: `6086389947`. No other owner's source changed.

## Source
Exact clean base pushed Phase4 `f4bf31f8df8a93b24c64feaa3e85d67c9fe4d075`, isolated branch `feat/result-cards-print-ready-phase5-20261009`, worktree `/root/workspace/assps-resultcards-print-ready-phase5-20261009`.

## Printing improvements
- Result Designer retains three premium distinct flagship templates: Signature Editorial, Swiss Grid, Data Atelier. Existing ten protected legacy templates remain delegated to their original source (six protected hashes untouched). Thin vector performance donut and individually labeled all-subject horizontal bars remain mandatory in premium templates, paired with marks table, larger school name, teacher feedback and signatories.
- Mixed bulk printing previously applied a single term-selector mask to every exam. New per-exam `autoTermColumns` resolves first/second/third/annual/monthly independently for EVERY printed student, including a mixed full-school result batch. Unknown exam types avoid falsely labeled term columns. Teacher may disable auto and manually choose columns.
- Selection of authentic school logo is never replaced. Uses only existing SaaS `paperSettings.logo` URL through the configured tenant school settings; APEX logo NEVER appears in a result card. No generated crest PNG added or substituted.
- Print-readiness summary shows batch cards, recorded subjects, missing marks and missing SaaS school logos. Missing configured logo blocks printing; broken or not-yet-loaded logo in actual preview blocks Print action; partially pending/invalid marks require explicit confirmation. An opened print document additionally waits for fonts and logo and fails visibly when logo load fails.
- PDF action is accurately labeled "Save as PDF" (browser's standard Print dialog). Batch page-break CSS produces one A4 portrait page per student; print timer is bounded; actionable pop-up blockers. No unsupported landscape premium promise. Exact grade bands from configured school grade settings, no invented hardcoded 50% pass/fail label.
- Actual student `roll_number` now prioritized over GR/admission number for Roll No; school academic session/year can fall back to SaaS `paperSettings.examYear` and footer may use SaaS email. No marks, paper or student DB writes.

## Verified synthetic tests (NOT real-school acceptance)
- `node scripts/test-result-print-planning.mjs`: 8 exam types; auto/manual term flags; pending and school-logo preflight PASS EXIT0.
- `node scripts/test-result-designer-real-browser.mjs`: actual Vite/Chromium modal, three flagship thumbnail selectors, preview, mixed 3-student Print/PDF popup; absent/broken SaaS logo blocks Print action PASS EXIT0. Requests external to localhost aborted; fake school logo **only in fixtures** (transparent 1px test pixel), never in application branding.
- `CARDS=25 node scripts/test-result-batch-pdf-a4.mjs`: Chromium-generated PDF **25 pages exactly for 25 synthetic students** with 12 distinct subjects each, mixed First/Second/Final Terms and three templates, term-label integrity PASS EXIT0; 3-card run 3/3 also pass.
- `RESULT_EXTRA_SUBJECTS=1 node scripts/test-premium-result-a4.mjs`: real Chromium 12-subject A4 layout/geometry for all 3 templates PASS EXIT0.
- Existing premium grade, null/zero/invalid and school source URL SSR acceptance, `npm run verify:templates` protected originals, focused new-code lint, optimized frontend Vite build are captured in `/tmp/assps-result-p5-*.log`. No full repository lint or actual signed teacher/real-grade/physical printer tests claimed.

## Critical truth for deadline
A source-only commit is NOT a live deploy: `app.assps.edu.pk` currently still serves the last certified live build. Do not say the above new templates are already live or the actual enrolled students' results have been printed. Production must remain unchanged until SaaS Core certification; if it is not completed before 10 October, the only permitted immediate workflow is the currently deployed certified/previous printing flow, with careful marks, logo and A4 checks, OR print an authorized PDF generated from verified real student data separately. Do not fabricate class results, grades, or emblems.

### Open external acceptance
- Real authenticated teacher browser using original school exam API with proper role/tenant and actual SaaS school logo.
- Actual A4 printer paper/color/grayscale proof and official result data confirmation.
- SaaS Core source/release signing, restricted RLS, private upload ingress and rollback release gate.

## Final exact command exits (after all fixes)
`TERMS:0 SSR:0 SCHOOL_LOGO:0 DESIGNER_UI:0 BATCH25:0 A4_12:0 PROTECTED:0 FOCUSED_LINT:0 VITE_BUILD:0`.
Evidence logs: `/tmp/assps-result-p5-final-{planning,ssr,logo,designer,batch25,a4,protected,eslint,build}.log`; optimized Vite build 3.10 s. Actual print PDF internal inspection: `BATCH_PDF_PAGE_COUNT 25 STUDENTS 25 PDF_BYTES 481147`; no real student names, logos, school marks or outbound requests in browser fixture. Review confirmed no original first-term papers or protected template integrity files edited. Windowed local PC path was probed, but reported standby/offline; no Windows-local preview site or output was claimed.
