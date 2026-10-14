# ASSPS School Regular Timetable — 2026-10-14 authenticated SaaS import

## Source authority and constraints
- Latest user-uploaded photograph: SHA-256 `263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589`. Picture footer reads **Academic Year 2024–2025**; the user expressly requested applying the supplied layout today to SaaS. Imported as session **2026–27 regular-day reference**, source label preserved for traceability; **not** a claim image was originally printed in 2026–27.
- Older recovered `ASSPS_Complete_Timetables_2026_27.docx` SHA-256 `e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724` contradicts supplied image. That file omits Period 5 altogether and shifts several class assignments (e.g. Class5 P3 science Miss Aqsa vs new Mam Afsa; Class6 P3 Math Miss Asma vs new Miss Isma; Pre-Nine P4 Computer vs new Chemistry; P8 Holy Quran vs new Tarjuma). Do not blindly merge.
- Original regular school times recovered from the Aug 23, 2026 locked conversation: assembly 08:00–08:15, periods [08:15–08:55,08:55–09:30,09:30–10:05,10:05–10:40,10:40–11:15,11:15–11:50], **BREAK 11:50–12:15 (25m)**, periods 7 [12:15–12:50] and 8 [12:50–13:30]. Image lists no weekdays; stored under **day_name='Regular'**, not fabricated Monday–Saturday or Friday slots.

## Imported records and safe authorization boundary
- Live PostgreSQL `apexos` school1: `timetable` formerly 0 rows, now **42 entries**: Five classes (Four,Five,Six,Seven,Pre-Nine) ×8 periods =40 lectures plus School-wide Assembly and Break. Section remains blank because none specified in image. Teacher display strings retained including `Mam Afsa`, `Miss Tayyaba` normalized to school's requested spelling.
- Migration added `teacher_display_name`, `academic_session`, `source_sha256`, `source_notes`, `staff_identity_reviewed` to the existing tenant-protected timetable. **All 42 teacher_id NULL, all staff_identity_reviewed=false; no teacher account/role/assignment created or modified.** Some employee matches are ambiguous/inactive (Nazra active+inactive, Maryam source inactive), and some subjects/teachers differ from previous docx.
- User has **not** supplied weekday-specific Friday lessons or sections. The regular-day reference is not an authorization to promote exact `teacher_class_assignments` to teachers' marks-entry scopes.
- Root-only pre-upload backup SHA chain: `/root/assps-release-backups/timetable-upload-20261014T0930Z/`. First rehearsal imported 42 to disposable PostgreSQL55432 `assps_timetable_qa_20261014` and verified 40+2/0 grants; exact same guarded SQL imported 42 rows to production. Live exams9 1,588 results,203 real zero scores; active teacher grants0, original 77 signed FORCE RLS catalog unchanged.
- Current old Timetable Manager form does not persist server data and loses class-scoped edits. New isolated authenticated regular-view API and print-oriented reference page show saved data without overwriting that editor or requiring a full frontend bundle replacement.

## Remaining cross-project gates
- Genuine signed school account must validate names against active employees before teacher permissions or exam marks scopes can be issued.
- No subject maxima, results, exams, Paper Studio, APEX Connect or unrelated academic timetable records were modified.
- Full official school publication/RLS cutover and school-authenticated Save→Reload→Print gates are independent.

## Live simultaneous teacher check (do not invent substitute assignments)
- Period 3: **Miss Isma appears in Class Four and Class Six simultaneously**, distinct cohorts. Conflict flagged in the authenticated viewer; original uploaded source preserved.
- Period 5: Miss Sumaira appears in Class Four and Class Five; earlier school room policy combines Four and Five, so no automatic conflict or double-grant was inferred.
- Period 8: Qari Imran appears in Class Four and Class Five; same combined-room caveat.
- Active employee lookup did not find exact active `Afsa` or `Asma` staff-name matches; separately the older docx named `Miss Asma` for Class Six Period 3. Do not secretly replace the user's uploaded Miss Isma with a different person, nor map inactive staff accounts.
