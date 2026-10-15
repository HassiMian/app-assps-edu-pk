# ASSPS Result Cards V2 — Independent Production Stability Audit

Audit date: 2026-10-15 ~23:05 PKT. Audit mode: READ-ONLY production DB, public HTTP/active bundle verification, current production frontend/backend source and previously completed synthetic Chromium tests. No school marks, exam configurations, release routing or grade settings changed by this audit.

## Audited production baseline
- Public site https://app.assps.edu.pk/exams/results, active static root `/var/www/assps-resultcards-premium-v2-20261015`, index SHA256 `dc5d20ad39a52a69519214af0dbd6eadc682a0e43cb21fd35f67952f1f3bacbb`. Public app/API HTTP 200.
- 10/10 reachable premium templates in compiled active bundle; 11/11 Daily Diary controllers PASS; prior Marks View login-loop 401 fix retained.
- Synthetic browser checks: 2 students in a 2-page A4 PDF, one-student optional target, 4-card all-classes, all 10 templates tested with 8 subjects and no measured scroll overflow; synthetic only. Real authenticated Principal print and physical school printer are NOT independently verified.
- Live school 1 First Term Exam ID 9: 1,762 exam_result rows for 302 active enrolled students; 1 other school's result = 1,763 records total across two tenants, including 213 genuine numerical zero marks across the database. All 302 active students of the 11 participating grades have at least one saved First Term result. Database unchanged by audit.
- Smoke Test Exam removed previously with dependency and rollback record proof; live School 1 exam catalog only Assessment Class 1 id 7 and First Term id 9.

## Concrete findings
**P0 / Academic correctness — incomplete configured subjects silently omitted.** Per-student exam-subject configuration vs saved result records: 232 of 302 First Term students (76.8%) have fewer saved subject result rows than the configured subjects, totaling 283 missing expected subject-result cells. Counts refer to students *with* results; they do not equate to zero marks. The present `buildResultCardData` computes percentage/grade from the rows actually supplied; absence of a configured subject row is invisible to its `pendingCount`. As a result, some cards can present a final-looking percentage/grade based on incomplete subject sets. Require server-reconciled expected subject roster, explicit missing/pending state per student, and no final certified print until verified complete (offer conspicuous draft print if needed). Do not invent missing marks or change true zeros.

**P0 / Grade precision gap.** `grade_settings` for School 1 uses integer inclusive ranges [0,39],[40,59],[60,69],[70,79],[80,89],[90,100], and backend policy validation samples only whole percentages. Client `gradeLabel` compares unrounded fractional percentages to inclusive min/max; decimal intervals (69,70), (89,90), etc. are NOT covered. Read-only SQL finds seven subject-level saved records outside all bands (two in 69–70, five in 89–90), and 15 of 302 students whose aggregate saved-result percentage is outside all bands. These can render grade '—' even where recorded grade exists. Define an explicit approved fractional-percentage grading policy (e.g. contiguous half-open intervals or officially specified rounding rule), use one shared backend evaluator, test all boundaries and recompute preview without overwriting saved data.

**P1 / Academic approval provenance.** All 81 configured First Term subject records have `approval_status='pending'`. This is a *subject setup review state*, not proof individual scores are wrong. However final official publication currently lacks a visible fail-closed approval gate. Keep teacher/principal review identities/revisions separate and release approved only after genuine authenticated approval.

**P1 / Print-preview bypass.** In `premiumResultCardPrint.js`, regular auto-print includes `printReadyScript` to validate images, fonts and page bounds, but `previewOnly` skips that script. Its 'Print / Save PDF' toolbar invokes `window.print()` immediately, without equivalent validation. Could print before school logo loads or when layout is clipped. Use one shared readiness preflight for BOTH routes and block print with an actionable error if images/fonts overflow.

**P1 / Large batch capacity unverified.** Current integrated browser tests prove 1/2/4 card scenarios and 10 designs with 8 subjects. Real First Term has 302 student cards; `openResultPrintWindow` uses `cards.map(renderToStaticMarkup).join('')` and one browser window, no page chunking/streaming, progress indication or memory limit. Full 302-page browser PDF export and physical printer acceptance are **UNVERIFIED**, not proven defective. Implement deterministic 25–40 card chunks or streamed server print and validate page count, ordering, cancellation and recovery.

**P2 / Subject source mapping.** Of 1,762 First Term rows, 1,761 match a configured class/section/subject string; one Mover/Purple row uses saved subject `Computer` not present in that roster. All 1,761 matches have correct subject maximum and no denominator mismatch. Map by canonical `exam_subject_id` or reviewed alias mapping instead of relying on free-text names. Never delete/rewrite legitimate marks to hide it.

**P2 / Future terms and UX.** First Term class-coverage logic depends on hardcoded exam ID 9 and Starter–Eight allowlist; term rollover, recreated exams, IX/X participation or school adoption changes can silently alter eligibility. Replace with versioned exam_class enrollment and canonical class IDs. `canPrint` for All Classes can enable if exams exist even when current result list empty, only showing an alert on click. Replace with exact eligible student count and clear warning/summary for missing subjects.

**Production acceptance boundary.** Authentication/tenant restrictions exist in live GET API, and unauthenticated GET returns 401. The authentic school Principal account, independent peer-school denial, physically printed Urdu/English cards and Core offhost signed receipt remain unverified. Official Core intake receipt is absent; do not claim a full-stack certification based on a static frontend rollout.

## Recommended corrective sequence and acceptance
1. P0 freeze official/certified 'Final' marking for incomplete school results; add per-student configured-subject reconciliation and clear pending/missing indicators. Draft previews can stay available.
2. P0 grade-band decimal interval fix in a single shared, versioned policy, with official reviewed rounding and rigorous boundaries (0, 39.99, 40, 59.99, 60, 69.9, 70, 79.9, 80, 89.99, 90, 100).
3. P1 sign/review 81 subject configuration revisions independently; preserve historical marks.
4. P1 unify print readiness and ensure both auto-print and preview-toolbar Print run asset/overflow checks.
5. P1 302-student full-term 302-page stress test, chunk/split with stable ordering, tenant test, PDF page count and physical printer checks.
6. P2 normalize one subject alias and replace hardcoded term/class ID assumptions. Add automated CI coverage for all regression paths.
7. Deploy only via isolated migration/QA → accepted authorized browser → exact-hash rollback → SaaS Core signed security/tenant certification; no unreviewed production data mutations.

**Conclusion:** Current UI/build and small-batch printing are functioning. Do not describe Result Cards as '100% stable' or academically final-ready until P0 completeness and decimal grade defects are fixed and signed acceptance is obtained.
