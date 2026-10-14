# ASSPS SaaS Core — Saved Marks Register V2: Editing + Sequenced Workflow

Date 14 Oct 2026 · Baseline frontend commit c110a05b0ec9da315a63fbb5bc156ff03579998e. Scope: **only Saved Marks Register** and its pure model/tests. Existing Marks Entry, Result Cards, Grade Setup, teacher app, school exams, RLS and print/paper modules remain unchanged.

## User workflow
1. Select **academic session → assessment/exam type → actual saved exam/term**. Every selection is from the authenticated exam catalog.
2. Select **class → section → subject**, optionally find a student by name, GR or roll number. Defaults preserve all classes. Explicit reset restores scope. Ordering may be **class → section → GR/roll**, GR/roll, subject A–Z, highest%, or lowest%.
3. Review joined saved server records in a scrollable register with class/section grouping, score, stored maximum, known pass policy, and status. The endpoint is `GET /api/exams/results?exam_ids={oneId}`, because the older `GET /results/:exam_id` omits class and section in the deployed backend. No client-side fabricated student or marks rows. Saved score 0 stays 0; null is missing, not zero.
4. To correct an **existing** numeric score: click **Edit** on one subject, enter a score with at most two decimals, **Save Correction**; client requires a valid student/exam/subject ID, existing total marks and a score from the server, 0 ≤ score ≤ stored total, and agreement with the currently available authoritative class/section/subject maximum. The UI disables navigation, filters, refresh, other edits and printing while this edit is active. Cancel discards local unsaved changes.
5. Before POST, the UI re-reads the saved exam and compares the original row identity, old score, max, state, grade and revision where available. If already changed, **abort with no write**. If unchanged, submit **exactly one** `POST /api/exams/results` record, using the existing principal-authorized tenant-protected write endpoint. Never submit blank rows, a whole class, a new mark, or an inferred maximum. Require `savedCount:1`, re-read and verify saved score and total. If server accepted a change but verification failed, show an explicit **do not blindly retry** warning. Successful changes show one-saved-record confirmation; existing server decides updated grade using configured grade boundaries.
6. **Print Filtered List** produces A4 landscape HTML with escaped content, limited to selected, sorted, server-saved records. Print is disabled in edit mode.

## Security and limits
The route remains principal/admin leadership + existing marks permission; no new teacher access. Preflight detects changes that happened before the last read but is **not atomic optimistic compare-and-swap**; a simultaneous update in the narrow interval between preflight and write cannot be fully prevented without a dedicated, authorized database conditional UPDATE endpoint. Thus **do not claim full multi-writer conflict certification**. No authorization changes, direct SQL, mutation of existing academic records, fake test marks or production backend deployments occur in this release.

## Acceptance and deployment gate
- Unit tests: 13/13, including numeric zero, missing score, precision/out-of-range, total maximum mismatch, identity drift, class/section sorting, and percentage sort missing-values behavior.
- Mocked Chromium browser: exact class/section filters, one-row edit payload, score 0 correction and verified reload, negative overflow disabled, conflicting staff correction detected and rejected without POST, filtered printing, result-cards untouched, teacher route denied.
- Scoped ESLint and Vite build, six protected templates unchanged.
- Production deploy only hashed Vite assets plus atomic active `index.html` swap with prior index/meta snapshot, no backend/PM2/db changes, public smoke 200 and anonymous results API 401.
- A real authenticated principal user acceptance and physical printer check remain separately necessary. No academic publication/authorization gate is bypassed.
