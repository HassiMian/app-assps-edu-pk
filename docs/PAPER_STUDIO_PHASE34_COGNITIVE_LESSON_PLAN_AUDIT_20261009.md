# Paper Studio Cognitive Lesson Planning isolated browser audit — 9 October 2026

Exact clean source `7ce92e83d83f934a1f13939e93588a3a586014f7`. Fresh serial real Vite/Chromium browser acceptance `lessonPlanBrowserAcceptance.test.js` plus `lessonPlanningWorkspaceBrowserAcceptance.test.js`: **2/2 TAP PASS, numeric EXIT0**, `/tmp/paper-p34-lesson-existing.log`, 11786ms. Existing tests cover term multi-subject plan generation, capacity checks, Save and student-card bridge.

Uncertified risk to reproduce: `DailyDiaryWorkspace.jsx` `saveLessonPlan` unconditionally replaces lessonDoc and sets success after awaited API response. If user edits or switches a lesson plan during a pending request, stale response handling has no equivalent to Diary selection epoch guard. No actual delayed-lesson-response RED test has been run, so this is a proposed adversarial regression target, NOT an established product defect. Obtain RED then implement isolated fix with no lost edits. No implementation or deployment in this checkpoint.

Core Phase38 already selectively imported Paper Phase34 wrong-date/section response tests; do not repeat. Real restricted signed non-BYPASS tenant PostgreSQL/RLS, backend documents revisions, live HTTPS private media, physical A4/Nastaleeq/PDF-DOCX visuals and Core rollback/release gates remain HOLD.
