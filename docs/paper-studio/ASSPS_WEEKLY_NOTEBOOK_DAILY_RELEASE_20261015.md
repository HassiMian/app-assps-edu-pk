# ASSPS Weekly Notebook Studio — 15 October 2026

## Release boundary and source
This is a **new frontend-only daily-use feature** based on actual public production frontend source `23d208d86b47d121695dca389816b5b2075c62f3`. This source already preserves 14 Oct current result-card/daily-diary fixes. No backend code, database rows, marks, fees, students, tenant RLS, user permissions, Paper Workspace, or academic publishing is altered. Never deploy older `/var/www/apex-os` frontend metadata over the actual public Nginx root.

## Original source re-audit
The original Miss Adiba WhatsApp archive carries 59 grouped candidate subjects in 12 classes, 1 unassigned Islamiyat message, and Class One image evidence. All original data stays in the authorized user's private verified JSON, never in public build assets.

The week compiler recognizes dated school lesson blocks, source page ranges and exact explicit Islamiyat assessment dates. It produces **clearly labeled proposals** for month-inferred dates, 24 undated class-subject groups, multiple-submission conflicts (13 groups), class/page overlaps, and end-of-block assessment placement. Class Four English proposed assessment: 14 Nov and 14 Dec 2026; Class Four Islamiyat original assessment: 27 Oct, 18 Nov, 18 Dec and 22 Jan. Class Seven Islamiyat original assessments: 5 Nov, 25 Nov, 18 Dec, 18 Jan. Do not pass these proposals off as authenticated academic approvals.

Class One source is a private 18-week visual transcription, cryptographically pinned to the original 14 Oct image and independently pinned 18-week transcript digest. It is marked **VISUAL_TRANSCRIPTION_REQUIRES_INDEPENDENT_ACADEMIC_CONFIRMATION**, not published. If the user imports only the older 59-group file without verified Class One image transcript, Class One printing fails closed rather than guessing.

## Daily-Use UI
The existing Lesson Planning route now defaults to `Weekly Notebook Studio` and retains the prior `Advanced Lesson Editor` as a separately selectable mode. Source JSON is verified in the browser against 59 pinned original hashes, then remembered only in the currently authenticated user's tenant-scoped browser storage on that device. User can explicitly replace it with a verified revision; original text is never sent to an unauthenticated endpoint.

Left side: class, section, session dates, source-derived/proposed week, included subjects, brief editable statements, original/proposed assessment dates with separate label, proposed activity date, live authenticated student roster and per-student checks, saved class/week working copies (same-browser only), low-ink A4 designer. Right: live A4 student notebook slips with official school header and existing emblem. Palette navy/teal/silver, adjustable 1/2/3/4/6/8 slips per A4, subject name/column/font/row/header controls and Jameel Noori/Noto Urdu fallback with isolated LTR numerals.

User-confirmed classroom in-charges are labels (not permission assignments): Starter/Flyer Miss Mubeen; Mover Miss Laiba & Miss Abida; One Miss Amna; Two Miss Aasia; Three Miss Alisha. Miss Adiba is the original composer/forwarder, not automatic class teacher.

**Student-safety boundary:** Class/section roster is loaded through existing authenticated `/api/students`, the returned list is independently re-filtered by exact normalized classroom and section, and any response missing matching class fields is rejected. A roster belonging to the prior class is suppressed immediately on class/section switch and cannot print under another class name. No student names are persisted in the saved lesson draft or downloaded JSON. Empty selection cannot silently generate personalized slips.

## Executed tests
- Week-parser original/different-term-date, Class Four assessment proposal, Urdu numeral/page, Class Two/Three undated-source warning, Class One image-only fail-closed, Sunday exclusion and teacher-label tests: 8/8 PASS.
- Chromium private 59-group SHA verification, original Class One 18 weeks + W17 test, Class Four 14 Nov proposal, synthetic principal roster, class switch isolation, selectable 1/2/3 A4 cards, subject correction, local Save→Reopen, popup print: PASS.
- Chromium generated 3-card A4 PDF: one PDF page; existing Daily Diary browser acceptance regression: 1/1 PASS; modified code lint PASS; Vite optimized production build PASS.
- Academic original integrity: user-provided trusted academic JSON is NOT embedded in the public static assets.
- Genuine staff HTTPS login, physical printer Urdu Nastaleeq installation, school-owner approved 18-week image transcription and production database multi-device persistence: NOT CERTIFIED. Do not claim otherwise.

## Controlled deployment/rollback contract
Before touching public files, confirm current effective `app.assps.edu.pk` Nginx root, SHA and actual release metadata; protect newer agent releases. Rebuild exact pushed source, stage without removing older hashed JS, test compiled asset references, preserve full current root directory. Atomic rename replacement under exclusive release lock, no Nginx config or backend reload. Check HTTPS index/asset 200, anonymous API 401, A4 print browser acceptance, existing DB marks/zero counts/lesson plan digest. If smoke fails, restore entire previous root immediately. Keep previous root until user accepts current release.

The full authenticated tenant-RLS, school-class teacher assignments, secure server-side 59-source import, academic publication and cross-device school database lesson-plan persistence remain separately owned production gates. No teacher/Principal signatures may be invented and no real marks may be changed.
