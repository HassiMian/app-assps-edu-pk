# ASSPS Class IX & Employee Subject Reconciliation — 14 October 2026

## Sources and requested exact changes
- User's current photographic regular-day reference: SHA256 263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589, originally printed 2024–25. Imported on 14-Oct as Regular pattern for 2026–27; 40 original class lectures + Assembly and Break.
- Recovered genuine user-provided 11-Oct-2026 `ASSPS_Complete_Timetables_2026_27.docx` (SHA256 e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724): Grade IX Boys section Usman (8 periods) and Girls source section Fatma (8). Live student roster has section Fatima (7 enrolled) and Usman (9), so imported the girls label as **Fatima** while retaining original `Fatma` spelling in source_notes. Usman P7 = Computer Science / Miss Isma (not Biology/Sir Haseeb).
- User's latest fixes: **Class Six Period 3 Mathematics = Miss Ghulam Fatima** (replaces Miss Isma); **Class Five Periods 3 Science and 4 Social Studies = Miss Ausa** (user spelled A-U-S-A, replaces Mam Afsa and Mam Aqsa). Honorific normalization for three clear existing Mam→Miss references: Miss Ghulam Fatima, Miss Tayyaba, Miss Mehreen. No other original assignments altered.
- Same recovered regular schedule: Assembly08:00–08:15, P1–P6 08:15–11:50, BREAK11:50–12:15 (25m), P7 12:15–12:50, P8 12:50–13:30. Do NOT invent weekday or Friday-specific session; day_name Regular.

## Full Grade IX original rows
Boys Usman: P1 Tarjuma/Miss Maryam, P2 Chemistry/Sir Haseeb, P3 English/Miss Ayesha, P4 Physics/Miss Ghulam Fatima, P5 Islamiyat/Qari Fida-ul-Rehman, P6 Urdu/Miss Nazra, P7 Computer Science/Miss Isma, P8 Mathematics/Miss Ghulam Fatima.
Girls Fatima (source Fatma): P1 Physics/Miss Ghulam Fatima, P2 Mathematics/Miss Ghulam Fatima, P3 Chemistry/Sir Haseeb, P4 Biology/Sir Haseeb, P5 Quran/Miss Maryam, P6 English/Miss Ayesha, P7 Islamiyat/Sir Fida-ul-Rehman, P8 Urdu/Miss Nazra.

## Employee & subject capability architecture
- Added **employee_teaching_subject_evidence** normalized row-per-class-period, tenant-scoped, RLS ENABLED (non-FORCE to preserve 77 existing signed gate contract); only restricted signed green role SELECT, no PUBLIC privileges. Employee ID is a verified active same-school reference, never a teacher-auth mark scope. Evidence categories STEM / Mathematics, STEM / Science, Computer Science / IT, Languages, Humanities / Social Sciences, Islamic Studies.
- 56 timetable lessons all create evidence records (period 1–8 ×7 cohorts), with **43 unique active employee-name matches**, **6 provisional active Nazra matches** because historical inactive Nazra also exists, and **7 unresolved** (Miss Ausa 2 without matching active A-U-S-A employee, Miss Maryam 5 where the historical Maryam Naveed account is inactive and active Mariyam Yaqoob is not independently confirmed to be the same teacher). Names in timetable display as Miss/Sir/Qari appropriately. Do not invent/rename employee records or take over unrelated HR payroll/profile columns. Existing employee department/subject strings (some are educational qualifications!) retained; new dedicated grouped curriculum capability evidence satisfies user request with provenance, not inflated qualifications.
- **0 official teacher_class_assignments**, **0 school approval event**, no staff login/portal permissions changed. Subject evidence status `schedule_reference_only` everywhere, never authorized marks entry.

## Safe migration and rollback
- Fresh production root-only PG dump+globals, SHA verified: /root/assps-release-backups/timetable-class9-staff-20261014T1005Z/. Snapshot already includes 1762 First Term marks (213 genuine zero), uploaded concurrently with timetable development; earlier 1588/203 count is STALE. Guard accepts ≥1588 to avoid aborting genuine concurrent marks while protecting all marks from edits.
- QA PG55432 restored the backup, applied corrections+16 GradeIX rows+56 employee evidence records successfully: timetable58, evidence56, marks1762, grants0. QA-only rollback script `004_qa_only_grade9_staff_rollback.sql` strictly checks clone DB+port, reversed 16 IX rows/6 staff-name updates, dropped capability table, restored 42 references, preserved results. Reapply to clone also PASS.
- Signed JWT school admin GET `/api/timetable/staff-subjects` reads matched employee names, scheduled courses, department and identity review; teacher users forbidden (403), peer-school data inaccessible. Regular reference API serves all 58 rows including two distinct Grade IX sections.
- Backend HTTP tests and isolated Chromium 7-class print test use synthetic sessions. This is not authenticated live teacher login or a human-approved qualification.
- Independent Paper Studio, APEX Connect, grade IX academic question owners unaffected.

## Known follow-ups / risk
- Unresolved A-U-S-A staff account (do not assume Miss Aqsa Bibi is identical to Miss Ausa without confirmation).
- Unresolved Miss Maryam account and historically inactive candidate; one active `Mariyam Yaqoob` is not automatically proof of identity.
- Nazra Parveen active vs Nazra Nafees inactive: name provenance should be acknowledged.
- No approved teacher capability/teacher subject maxima or actual real teacher login acceptance inferred from this timetable; subject qualifications and period teaching are not the same.
- The recovered Class IX document labels Girls `Fatma`, actual enrolled section `Fatima`; mapping recorded to avoid cross-section authorization mistakes.
- Live application/print route cutover requires scoped deployment and green/rollback verification; do not claim until actually verified.
