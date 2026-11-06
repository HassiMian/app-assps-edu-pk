# A210 — Assessment Marks Authorization UI & Academic Readiness Source Parity

**Status: REVIEW ONLY — never deployed.** Source continuation from A209, no school records created/modified.

## 1. Assessment marks UI safety

- `ManageExams` requests `/api/exams?include_subjects=1`, whose genuine live backend returns **only Principal-approved, active, school-scoped AS subject offerings** with non-null `approved_at`, positive `approval_revision`, active Principal/Admin approver and class/section scope.
- A new Assessment **header** must not be misrepresented as a ready marks-entry exam. Empty/missing signed catalog → disabled **Marks Locked** button. `Review Catalog` remains read-only. Term Exam retains marks access.
- `assessmentMarksReadiness.js` checks actual class/section/subject and integer total/pass marks; it cannot infer approval from arbitrary Academic Setup subjects or client flags. This is a visual guard; authorization for every marks write remains server-side.
- Failed refresh invalidates previously shown Assessment offerings while preserving exam headers. Request generation rejects out-of-order old HTTP successes or failures; cleanup invalidates requests on unmount. These behaviors have browser tests, including StrictMode delayed stale responses.

## 2. Academic Readiness evidence parity

- The existing protected `/api/academic-approvals/assessment-catalog/readiness` report previously checked active teacher+employee but did not require **identity-reviewed timetable entries**, despite stricter Assessment candidate staging and A209 Cohort Coverage. A210 review route requires exact teacher, class, section and subject on reviewed timetable; it labels the resulting evidence policy and never certifies signed Principal approvals.
- Adds school-scoped **read-only** counts for separate paper storage authorities (Paper Vault, legacy Saved Papers, canonical Paper Documents, Assessment Studio headers and revisions). These counts are **not deduplicated** and cannot establish the completeness of historical saved-paper migration. Under observed School1 data: 14 active vault, 0 legacy saved-papers, 0 canonical paper-documents, 4 Assessment Studio paper headers, 2 revision records.
- READ ONLY PostgreSQL execution of the exact candidate readiness population query verified 329 students, 13 cohorts, six with missing teaching evidence containing 220 students. No live table or role change.

## 3. Verification and release blockers

- A210 backend source and mocked integration tests: 33/33 PASS (including A208/A209 regression).
- Academic/marks unit regressions: 37/37 PASS.
- Headless browser (actual rendered React, mocked authenticated API): 8/8 PASS.
- Modern frontend isolated Vite build: PASS. Published production site remains unchanged.
- Historical First Term 1,854 marks SHA, original Paper Vault approved/draft hashes, authenticated real Principal/Teacher staging, 73 protected tables owned by generic login, off-host full data+role+ACL restore and root disk >=16 GiB are separate release requirements.

**No source push, production deployment, academic approval, student marks write, teacher assignment creation or DB migration was performed in A210. RELEASE HOLD.**
