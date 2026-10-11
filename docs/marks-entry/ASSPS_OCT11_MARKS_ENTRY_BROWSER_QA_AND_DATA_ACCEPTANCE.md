# ASSPS First Term Marks Entry: Independent Browser & Data Acceptance Report

**Date:** 2026-10-11 (PKT)  
**Agent:** Independent ASSPS First Term Marks Entry QA & Browser Acceptance Agent  
**Central Coordination:** [GitHub Issue #4](https://github.com/HassiMian/app-assps-edu-pk/issues/4)  
**SaaS Core Integration Base:** `db8c6eb584c195bf9663dc60c918d862310079b9`  
**Base Remote Branch:** `release/firstterm-core-security-unified-20261011`  
**Isolated QA Acceptance Branch:** `qa/firstterm-marks-entry-browser-acceptance-20261011`  
**Overall Status Verdict:** `ASSPS_MARKS_BROWSER_QA_BLOCKED`  
**Blocking Reason:** Live production frontend bundle on `app.assps.edu.pk` remains at legacy build `24cbcae3` containing all four Principal-reported defects; production catalog has 0 exam subjects for Grade Nine and Pre Nine; production Nginx routing remains unpromoted. SaaS Core owns final deployment.

---

## 1. Executive Summary & Defect Diagnosis Matrix

An independent code-level, database catalog, and real Playwright browser inspection was conducted comparing the **currently deployed live production frontend** (`https://app.assps.edu.pk`, build `24cbcae3`) against the **staged Marks Entry candidate** (`db8c6eb5`).

Every defect reported by the Principal on `/exams/marks` was verified and diagnosed to its exact root cause:

| # | Principal Reported Defect | Old Live Frontend Behavior (`https://app.assps.edu.pk`) | Staged Candidate Frontend Behavior | Root Cause & Resolution Status |
|---|---|---|---|---|
| 1 | **First Term Exam absent from exam dropdown** | The live UI **does not render an exam dropdown at all**. It renders only three selects: `Exam Type`, `Class`, `Subject`. It attempts to pick `X[0]` from an auto-filtered list, and if none matches, silently attempts to POST duplicate exams (`Term Exam - Class One`). | Features a dedicated `<select name="savedExam">` dropdown with explicit First Term Exam (ID 9) regex prioritization (`/\bfirst\s+term\b/i`), showing session and class metadata without creating duplicates. | **Root Cause Confirmed**: Missing UI element in live build `24cbcae3`. Resolved in staged candidate source; blocked by frontend deployment hold. |
| 2 | **Classes appearing out of natural order** | Renders `classNames` directly from `/api/academic/setup` in arbitrary primary key or alphabetical order without canonical sorting. | Can be sorted using `CANONICAL_CLASS_ORDER` (`Starter`, `Mover`, `Flyer`, `One` through `Ten`). Note: Fallback list `OFFICIAL_FIRST_TERM_CLASSES` stops at `Eight`, omitting `Pre Nine` and `Nine`. | **Root Cause Confirmed**: Unsorted array mapping in live code. Canonical order must be enforced across all selectors. |
| 3 | **Subjects missing after choosing exam/class** | Checks only `subjectsForClass("Class " + j)` from `useAcademicStore`. In production, `academic/setup` has `subjects: []`, so the subject dropdown is completely empty, completely ignoring the 81 active subject rows in `exam_subjects`. | Loads from `OFFICIAL_FIRST_TERM_SUBJECTS_2026` for Exam 9, ensuring English, Urdu, Math, Science, Islamiyat, etc., populate even if `academic/setup` is unconfigured. | **Root Cause Confirmed**: Live code ignores `exam_subjects`. Staged candidate fixes classes Starter–Eight; Grade Nine and Pre Nine still lack catalog offerings. |
| 4 | **Students not loading, preventing marks entry** | Hardcodes query parameter `class = 'Class ' + j` (e.g. `class='Class One'`). However, the `students` table stores class names as `'One'`, `'Starter'`, `'Nine'`, etc. The API returns 0 students, throwing `"No students found registered in Class One. Please add students first."` | Implements `marksClassQueryAliases(canonicalClass)`, querying both `One`, `Class One`, `1`, `Class 1`, and merging them via `mergeMarksRoster`. Students load successfully. | **Root Cause Confirmed**: Fatal prefix mismatch (`'Class ' + j`) in live frontend. Resolved in staged candidate source. |
| 5 | **Teacher auth, explicit zero, nine Result Cards** | Live backend lacked signed RLS; unassigned teachers could write or fail unhandled; blank marks risk zero conversion. | Enforces signed runtime scope (unassigned 403, assigned 200); preserves explicit zero (`0/100`) while keeping unentered blanks pending; validates all 9 premium Result Cards with A4 layout. | **Verified**: 10/10 green backend acceptance pass, 16/16 marks zero & print tests pass, 9/9 A4 layout metrics pass. |

---

## 2. Production Catalog & Student Enrollment Audit

Read-only audit of live PostgreSQL database `apexos:5432` (`verify-firstterm-prod-catalog-roster-20261011.py`):
- **Exam ID 9 Integrity:** `id=9`, `name='First Term Exam'`, `type='TE'`, `class='All Classes'`, `session='2026-2027'`, `school_id=1` (**PASS**).
- **Exam Subjects Count:** Exactly 81 active subject rows configured in `exam_subjects`.
- **Roster & Offering Alignment:**
  - `Starter`: 7 exam subjects, 45 enrolled students
  - `Mover`: 7 exam subjects, 42 enrolled students
  - `Flyer`: 7 exam subjects, 24 enrolled students
  - `One`: 12 exam subjects, 38 enrolled students
  - `Two`: 6 exam subjects, 31 enrolled students
  - `Three`: 7 exam subjects, 29 enrolled students
  - `Four`: 7 exam subjects, 17 enrolled students
  - `Five`: 7 exam subjects, 23 enrolled students
  - `Six`: 7 exam subjects, 20 enrolled students
  - `Seven`: 7 exam subjects, 22 enrolled students
  - `Eight`: 7 exam subjects, 0 enrolled students
  - `Pre Nine`: **0 exam subjects**, **11 enrolled students** (Blue section)
  - `Nine`: **0 exam subjects**, **16 enrolled students** (Fatima: 7, Usman: 9)

> [!WARNING]
> **Catalog Blocker**: Grade Nine and Pre Nine have 27 enrolled active students across 3 sections, but **0 exam subject offerings** exist in `exam_subjects` for First Term Exam ID 9. The school authority must register or assign First Term subjects for Grade Nine and Pre Nine before marks entry can be completed for these cohorts.

---

## 3. Real Browser Acceptance Evidence

Executed via real Playwright Chromium headless engine on VPS:

1. **Marks Entry Browser Suite (`test-marks-entry-firstterm-browser.mjs`):**
   - `MARKS_BROWSER_PASS`: First Term Exam visible and selected by persisted ID
   - `MARKS_BROWSER_PASS`: Official First Term 2026-2027 subjects visible despite empty academic setup
   - `MARKS_BROWSER_PASS`: Union of partial class-specific alias rosters loads both (`One` + `Class One`), other classes excluded, saved marks restored
   - `MARKS_BROWSER_PASS`: Invalid over-maximum marks (>100) denied
   - `MARKS_BROWSER_PASS`: Save uses exact First Term ID 9 and writes only edited zero, existing marks untouched
   - `MARKS_BROWSER_PASS`: Second save without edits cannot rewrite previous marks
   - `MARKS_BROWSER_PASS`: Marks-read failure keeps roster visible and blocks unsafe save
   - `MARKS_BROWSER_ZERO_PASS`: Blank marks remain pending (never zero); blank print uses authentic 6 papers
   - **Result: 11/11 BROWSER PASS**

2. **Marks Zero State & Print Suite (`test-marks-zero-state-and-blank-print.mjs`):**
   - **16/16 PASS**: Empty vs zero distinction, resumed saves, async edit race protection, sanitized logo URL.

3. **Nine Premium Result Cards Layout Suite (`test-nine-result-layout-adversarial.mjs` & `test-premium-result-a4.mjs`):**
   - Tested all 9 flagship templates: `signature-editorial`, `swiss-grid`, `data-atelier`, `regal-linework`, `young-scholars`, `academic-heritage`, `airframe-geometry`, `corporate-ledger`, `examination-dossier`.
   - All 9 templates fit strictly within 1121px A4 print boundary (zero footer or table overflow).
   - Marks table, subject performance bar charts, circular completion charts, teacher feedback, and attendance blocks verified.
   - **Result: 9/9 A4 CHROMIUM PASS**

---

## 4. Visual QA Screenshots (Redacted)

Visual inspection confirmed on Chromium rendering:
- `marks_entry_qa_loaded.png`: Saved Exam dropdown correctly defaults to `First Term Exam · 2026-2027 · All Classes`, with class selector, subject selector, and search button.
- `marks_entry_qa_students_loaded.png`: Both student alias formats loaded into single unified roster; `Marks readiness · English` toolbar accurately displays `1 saved | 1 pending | 0 unsaved edits`; student and parental identifiers synthetic/redacted.
- `result_card_signature_editorial_a4.png`: Full A4 Result Card with official school crest, student metadata, marks table, subject chart, 82% performance donut chart, teacher feedback, and signature blocks.

---

## 5. Remaining Gates to Production Readiness

To achieve full `ASSPS_MARKS_BROWSER_QA_READY` status:
1. **Catalog Alignment for Grade Nine & Pre Nine**: Academic setup or DBA must provision subject offerings in `exam_subjects` for Exam 9 covering classes `Nine` and `Pre Nine` (or confirm they sit a separate board exam schedule).
2. **Canonical Class Sorting**: Ensure `CANONICAL_CLASS_ORDER` is applied across all selector components so classes appear strictly as `Starter`, `Mover`, `Flyer`, `One` through `Ten`.
3. **Frontend Build & Deployment**: SaaS Core must approve, build (`npm run build`), and deploy the staged frontend candidate to `/var/www/apex-os` after cutover approval.
4. **Public Ingress Cutover**: SaaS Core must enable the host-aware Nginx ingress map switching traffic to the private green backend on loopback port `5091`.

---

**AUTHORITATIVE RETURN:**
```
ASSPS_MARKS_BROWSER_QA_BLOCKED
```
