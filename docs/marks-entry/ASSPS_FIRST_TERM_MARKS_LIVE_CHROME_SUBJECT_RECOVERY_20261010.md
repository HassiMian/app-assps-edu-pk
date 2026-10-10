# ASSPS First Term Marks Entry — live Chrome root-cause and scoped frontend fix (10 October 2026)

## Live authenticated user Chrome inspection (read-only)
- User confirmed Chrome already signed in to school portal and opened Marks Entry.
- Connected browser's separate automation profile redirected to login; that was not the user's logged-in Chrome state.
- Native Windows accessibility inspected the school Chrome window and verified the actual Marks Sheet with Exam Type = Term Exam, Class initially Select class, Subject initially Select subject, and First Term Exam text displayed elsewhere on the page.
- Read-only UI selector interaction selected Class One. Expanding Subject displayed ONLY Select subject (no English or other subjects). This is directly observed live and explains why Search Students cannot proceed. Whether underlying academic subject configuration is absent or class keys mismatch is not independently verified.
- No passwords, tokens, cookies, student personal records or marks read or exported. No Save/post actions performed.

## Canonical source and implementation
- Isolated branch fix/core-firstterm-official-subject-recovery-20261010, based on exact clean Core Marks Entry predecessor 3c941234cbb5bc29526c444bfca82802ae2a5121. No other agent worktrees changed.
- Canonical backend schedule al-siddique-backend/src/config/firstTermExam2026.js defines 75 First Term exam papers and 11 applicable classes, session 2026-2027, exact name First Term Exam, type TE.
- Generated exact class-by-class subject options into officialFirstTerm2026Subjects.js, mechanically from the backend canonical source. Cross-source test compares all 11 lists, 75 total entries and subject ordering against the original backend code.
- marksSubjectsForClass applies these subjects ONLY when a real saved exam has exact First Term Exam name, 2026-2027 session and TE/Term Exam type. Other exam types, future sessions and unsupported classes retain their normal academic configured subjects. No database exam, subject or results are created.
- Class One options: English, Mathematics, Urdu, Science, Islamiyat, Quran / Nazra. Early Years oral/written variants and other official class subjects preserved exactly.
- Existing frontend marks recovery protections retained: explicit saved exam selector, tenant/teacher API-scoped student lookup, previously saved marks recovery, edited-only POST, intentional zero vs blank, invalid exam ID, student ID or wrong-class rejection and stale request safeguards.

## Verification and release
- Node pure model contract PASS including official 75-source parity and non-First Term negative selectors.
- Real Vite+Chromium browser PASS with intentionally empty Academic Setup subjects: all six official Class One options visible; synthetic First Term exam selected; two canonical/legacy class-alias students loaded (unrelated class denied), prior saved 76 restored, only new edited zero submitted, 101 and repeated no-edit saves rejected, failed saved-result GET retains students but disables Save.
- Focused ESLint PASS EXIT0; Vite production build PASS EXIT0 (3.59s); original six protected Result Card template checks PASS; canonical backend source schedule tests 4/4 PASS.
- Actual production still running older frontend SHA 24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92 and backend SHA 16ab8f346ba27aa6b2e29a8f03c68db32a326cb9 when inspected. No server, school records, database, Nginx/PM2 or production artifacts changed.
- Live signed-role marks-write acceptance, protected private upload Nginx cutover, restricted PostgreSQL/JWT tenant-RLS gates and safe rollback remain outstanding; do not claim fix live or deploy unapproved application.

Verdict: LIVE_SUBJECT_DROPDOWN_EMPTY_VERIFIED=TRUE; SOURCE_FIX_TESTED=TRUE; PRODUCTION_DEPLOYED=FALSE; CORE_RELEASE_CERTIFIED=FALSE.
