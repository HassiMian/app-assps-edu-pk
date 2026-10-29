# ASSPS — student term lesson planning print UI, source review only (29 October 2026)

## Locked visual specification

School owner approved last printed design: A4 landscape (841.89 x 595.28 pt), three portrait student diary cards per sheet, narrow margins, small official crest, first-class table borders, soft class/section colors, readable English/Urdu, five subject assessment-date columns, centered Urdu note (right-to-left).

Approved private print PDF reference (school offline artifact; do NOT add student data to repo): SHA256 `53d61f68306e6368b6e8544ca35effa5d18b187f91aea03e8a876670fb008519`, 104 pages, 302 students. Do not modify content here; the live academic records and student roster remain the source of truth.

## Scope of this source patch

`DailyDiaryWorkspace` in `mode='lesson'` now offers an **additional** `Student Term Diaries · 3-up Landscape` print option. Existing daily diary and normal print remain untouched. Uses the **already authenticated school-scoped SaaS `/api/students` roster** and currently selected students; student IDs are required, duplicate IDs, inactive students, and cross-class rows are refused. No individual student names, father names or GR/roll values are baked into the bundle. Uses the current source academic term plan (not a harvested PDF text or invented lesson names). Only `planningType='term'` is eligible. No Second Term Class Eight. Assessments sourced by subject, max five; missing dates remain blank and overflow fails rather than silently discarding. `MIG26` is labeled `SaaS Ref` rather than a verified official GR; no roll number invented. The output HTML is escaped, print-only, with Jameel Noori Nastaleeq as preferred local font and a Nastaleeq fallback.

**Known limitations:** It does not upload the 302-student offline PDF to SaaS, sign a curriculum, add lesson plans to school database, certify an account session, embed a licensed Jameel font, or trigger any production release. Users must select a real saved *term* source and let SaaS load each class roster. The browser print may use Noto Nastaliq if the local Jameel font is unavailable; source CSS naming alone is not proof of actual embedded font rendering.

**Verified active roster correction:** the existing `DailyDiaryWorkspace` student API fetch previously omitted `active=true`, while the server defaults to `active=all`; the review patch now requests `active: 'true'` so struck-off records cannot poison printable class population. This is a read-only filter, not a database change. Unauthenticated public HTTPS `/api/students?class=Seven&active=true` returned 401 in a fresh negative check.

**Not affected:** Existing school student records, First Term marks/history, saved lessons, assessment status, original Daily Diary print and live Paper Studio V4. Deployment requires authorized review/merge and current live branch reconciliation. Do not publish generated `dist` from this old Core baseline; staged asset must be rebuilt on the reviewed current live baseline with rollback plan.

## Quality evidence

- `node --test src/Modules/Paper-Generator/tests/studentTermDiary3Up.test.mjs`: 22/22 pass
- `node src/Modules/Paper-Generator/tests/studentTermDiary3Up.browser.mjs`: 5/5 Chromium layout sets pass, 3 cards fit, table/note no overlap
- `npm run build`: PASS
- `eslint src/Modules/Paper-Generator/studentTermDiary3Up.js`: PASS
- `DailyDiaryWorkspace.jsx` inherited a baseline preexisting ESLint `react-hooks/refs` rule (line 383); no new lint issue was introduced by this patch. Do not claim full-file lint clean until this independent baseline issue is fixed in a separate review.
- `git diff --check`: PASS

## Real acceptance gates still required

Authenticated School1 Principal and Teacher Save-Reopen-Edit-Print, independent School2 denial, academic original page/source ratification, account roles, independently verified encrypted off-host full restore and authorized signed production cutover. None are auto-PASS by these local tests. Do not grant roles or mutate historical marks as part of a print UI patch.
