# ASSPS UNIFIED DAILY DIARY + LESSON PLANNING V4
## Verified architecture before runtime integration
Date: 2026-10-15. Product owner: Paper Studio. Database, RLS, auth, backup and production release owner: SaaS Core. Curriculum provenance owner: Grade IX-X Academic Master. GitHub issue 4 is central coordination.

### A. Why the last restoration design was incomplete
Current public build contains a 1,732-line rich Daily Diary editor and ~1,703-line stylesheet with adjustable subject/diary sizes, subject bold, footer, logo, row-height and student print. The recovered Lesson Planner source has an older 261-line Diary module and only two lines of Diary CSS. The production Daily Diary must not be overwritten to restore Lesson Planning.
Actual public JS: legacy LessonPlanModule-D149cpax.js, advanced DailyDiaryWorkspace-UmxZExBI.js and printEarlyYearsPaper-DVs1Rdwx.js. Recovered new LessonPlanModule-DhHP1vdi.js is NOT live.
Clean source baseline is 2709ea9664b755ed383c2d8d929f1da29cadacbf. In an isolated comparison eight live-source patches were checked: six apply cleanly, Diary JSX/CSS have seven independent merge conflicts. Dirty source owner tree must not be overwritten.

### B. Four first-class user workflows, not one mixed editor
1. OPERATIONAL DAILY DIARY: class and section; exact date; English, Urdu, Maths and other subject work; student-specific A4 diary slips; Saved Diaries / Reopen / Edit / Duplicate / Print. Remains an independent daily module preserving every currently live controller. Never auto-overwritten by new lesson-planning functions.
2. TERM LESSON PLANNING: class/section, term, session and date window; single all-subjects syllabus table, chapters/pages from-to; separate numbered Assessment and Date table. Save Term, Saved Terms, Edit and Print Master. Non-Second-Term source content must be explicitly unsourced unless verified; no silent source copying.
3. WEEKLY LESSON PLANNING: class/section, term link, selected week/date range, multiple subjects and teacher instructions/outcomes, independent assessment table. Save Week, Saved Weeks, Reopen; printable class plan OR authorized personalized student sheet. Term-linked information is an editable proposal until teacher review.
4. DAILY LESSON PLANNING: class/section/date, multiple subjects, objectives/activities/homework, independent Save Day / Saved Days / Reopen and class print. A deliberate action may copy reviewed daily teaching notes into an operational Diary draft; never silently saves or publishes homework.

All four share control semantics, but they must not share a single school record identity or overwrite each other. The current WeeklyNotebookStudio has navigation for Term, Week, Daily Student Cards; that is NOT yet three independently persisted Term/Week/Day editors. Daily Card currently derives content from Weekly notes.

### C. Non-negotiable shared formatting controller
Shared versioned PrintSettings object with global values and optional per-subject overrides:
- Subject Font Size: clearly visible plus/minus buttons, editable numeric display and slider; default large enough to read on intended A4 density. Changes must be visible in both editor and print preview.
- Subject Bold toggle; row-specific override/reset where supported.
- Homework/body font size AND editor input font size (different fields).
- School-name and section-heading size, footer font, logo size and placement.
- Subject column width, assessment column width, minimum row height, margins.
- English Times New Roman; Urdu Jameel Noori Nastaleeq with RTL and separate numeric direction handling; proper font embedding when printing/PDF.
- Portrait A4, 1/2/3/4/6/8-card density options where appropriate, overflow detection, preview zoom separate from physical print size.
- Reset formatting is local to current draft, not a global reset or silent school-data mutation.

Live source already implements: globalDiaryFontSize, globalSubjectFontSize, globalSubjectBold, footerFontSize, logoSizeMm, subjectColWidth, rowHeightMm, editorFontSize and fontStyleId. Subject size + / - handler currently clamps 8..22 pixels and body 9..24; these are implementation bounds, not evidence of adequate default readability. Per-row subjectFontSize and subjectBold are used. Live Save serializes them into style_settings and Reopen restores them; maintain this backward-compatible schema.
Current Term/Weekly candidate has a DIFFERENT design object including subjectNameSize, fontSize, rowHeight, fontFamily and subjectWidth. The shared adapter must normalize both without silently dropping values or resetting numeric zero into unreadably small text.

### D. Student printing architecture
Authorized class+section -> read-only school roster -> names, rolls and selectable checkboxes -> one master lesson/diary content document -> selected students -> separate printable cards with each own name/roll.
Each printed sheet must be bound to one authenticated school and selected class/section. Never save all student names in the master plan, export to public source, or use a stale foreign-class roster. If a student was withdrawn/moved, current roster wins; show scope warning.
Same renderer and CSS is used by live preview and actual A4 print/PDF. Urdu, multi-line text and 2/3/5 slip layouts require overflow safety. The font controller must influence actual printer output, not only browser preview.
Term class-master print does NOT automatically add student names. Weekly and Daily personalized sheets can use names explicitly after selection.

### E. Data model and migration architecture
PlanDocumentV4 envelope: schemaVersion, schoolId/tenant actor, academicSession, classLevel, section, planningType TERM|WEEK|DAY, termId, weekId, planDate, startDate/endDate, stable subject rows and assessment IDs, source provenance/applicability, revision, printSettings, approvalStatus PRIVATE_DRAFT, savedBy. Strong scoped revision checks (409), no duplicate date keys, no unapproved publishing.
Keep the operational Daily Diary table and endpoints as independently owned persisted records; allow an adapter from existing Diary style_settings and V2/V3 Lesson Planning layoutSettings into V4 PrintSettings. Preserve existing saved 3 school1 lesson drafts, published 0. Keep First/Third Term separate from Second Term private WhatsApp source archive.
Source provenance: original academic date vs MANUAL_PROPOSAL, textbook pages never invented. No result/marks/student data migration for frontend typography changes.

### F. Functional component design
AcademicPlanningShell (Term | Weekly | Daily lesson navigation, each saved-draft library)
TermPlanEditor + WeeklyPlanEditor + DailyPlanEditor (distinct document identities)
DailyDiaryWorkspace (existing rich separate daily homework editor)
PrintSettingsPanel (reusable controls; plus/minus, bold, numeric and slider, inheritance and reset)
StudentRosterPicker (read-only scoped roster, selection)
StudentSheetRenderer and A4PrintEngine (single print/preview styling)
PlanPersistenceAdapter (V2/V3/V4 formats, revisioned server saves)
SourceProvenanceGuard (never bypass school academic approval)
All true school identity/subject access enforced by current core API/tenant RLS, not merely client filters.

### G. One safe implementation and deployment mission, NOT visual-only fragments
1. Verify current exact running frontend/backend releases and other agent owner/source SHAs. Existing live dirty Diary source is read-only, copied only into an isolated review.
2. Independently review seven Diary conflicts, retain live UI controllers and Early Years print changes. Rebase/follow latest clean canonical source, never overwrite dirty worktree or duplicate an existing tested feature.
3. Build shared PrintSettings and typed adapters with backwards-compatible saved values. First wire the currently rich Daily Diary without changing user-visible behavior; verify style_settings Save/Reopen/Print.
4. Build distinct Term, Weekly and Daily lesson editors and server CRUD with stable class/date/term/week scopes. Preserve other Grade IX-X/Question Bank/Paper Studio modules and existing records.
5. Wire authorized student selection and common A4 renderer. Validate title readability at different densities and physical Urdu font on the school printer.
6. Test independently: term class master; Weekly class master and selected student sheets; saved Daily lesson; operational Daily Diary with per-student names. Compare exact Save/Reopen typography and printer CSS.
7. Upgrade the existing versioned release guard so it checks actual reachable JS plus subject-size +/-, bold, Saved/Reopen actions, separate modes, and Diary/Early Years companion modules. Future reviewed redesigns can update versioned contract and tests; no fixed commit lock.
8. SaaS Core completes authentic teacher/Principal/School2 session and RLS denial, worker transport, signed offsite recovery, current artifact ancestry, snapshot, controlled atomic Next/Nginx promotion, live HTTP/browser smoke, and real rollback acceptance. Do not claim source tests are live certification.

### H. Acceptance matrix and true release decision
- Daily Diary: Subject Size +/- visibly changes subject name, Bold works; values persist on Save/Reopen and appear identically in A4 PDF/print; footer/logo/header/column/row controls also persist.
- Term: all subjects and independent numbered Assessment/Date table, page ranges, saved Term and original/proposed source distinction.
- Weekly: correct week dates and subjects, saved Week reopens and print selected students with real scoped names.
- Daily Lesson Plan: independent Save Day and Saved Days (not a merely renamed weekly card); multi-subject; selectable students for sheets.
- Security: no impersonated teacher credentials, unauthorized subject/class/peer tenant, academic auto-publication, student marks writes or record resets.
- Regression: any Grade, Connect, Result Cards or Paper Studio frontend deployment which removes the current Diary controllers or Term/Weekly/Daily planning controls FAILS, regardless of stale chunks stored on disk. A reviewed newer version is still deployable.
- Release: source changes require code/build/negative and real browser tests; public cutover remains HOLD until Core gates and genuinely observed physical output pass.

Status: SOURCE ARCHITECTURE AND EVIDENCE DESIGN. This document does NOT itself implement or deploy the complete V4 UI. It is the binding coordinated implementation specification.

### I. Initial isolated source implementation (DO NOT CONFUSE WITH V4 PRODUCT COMPLETION)
On 15 October 2026 the owner-safe design worktree began the controller architecture with a pure normalized subject typography model and accessible + / - / Bold controls wired into the existing Term and Weekly/derived Daily Student Card UIs. The stored design fields are subjectNameSize and subjectNameBold. Existing V3 missing bold property remains bold by default, and explicit false persists across server saves. A new class draft has a visible 14px subject-size default and size bounds 10..23 px. Preview and print share the exact CSS variables. Scope is intentionally limited to the already available modes: there is still NO independent persisted Save Day workflow, and the rich live operational Daily Diary implementation has NOT been replaced or rewritten.

The v4 compiled runtime contract requires both Term and Weekly actual reachable plus/minus and bold controls, and existing Diary companion preservation requires actual visible subject/diary buttons, saved style_settings and Early Years print. Fully reviewed next versions can update that contract; no permanent SHA pin.

Fresh evidence: pure typography model tests 5/5 PASS; source validation/Grade tests 42/42 PASS; release Python negative/positive tests 16/16 PASS; Vite build and changed-module ESLint PASS; Term synthetic Chromium Save > Reload > Reopen > PDF verified button changed CSS, bold survives; Weekly synthetic Chromium Save > Reopen and printed A4 verified controller CSS and daily card mode inherited it. These tests use synthetic school identity and mocked API, never real student/account credentials or live database writes.

Current cross-owner preservation gate still returns HOLD because the released source has NOT reconciled the advanced 1,732-line live Daily Diary editor, other layout controls and the dedicated live Early Years printer; seven source merge conflicts remain. Signed Core release gates remain HOLD. Only Paper Studio owner-reviewed isolated integration may proceed after independent acceptance.
