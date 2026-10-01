# First Term Marks Configuration Audit — 01 October 2026

Scope: ASSPS School 1, canonical exam ID **9**, session **2026–2027**. READ-ONLY production audit; no mark, student, fee, paper or exam row was modified.

## Production database facts
- Official date-sheet matrix: **75** class/subject papers, Starter–Eight only.
- Snapshot: **12** enrolled class/sections and **81** section-expanded subject rows (One/Blue and One/Yellow).
- `exam_subjects`: **81/81** active rows have `total_marks = NULL` AND `pass_marks = NULL`; **0** are configured/locked.
- Parent `exams.id=9` stores **100 / 33** as generic legacy metadata. It is **NOT** the grading source for individual papers.
- `exam_results` for exam 9: **0** rows at audit time.
- Production SQL `saved_papers`: **0** rows. Paper Studio uses versioned seeds plus tenant-local working copies; an empty SQL table does NOT imply that no editor papers exist.
- Live One/Yellow: **38** active students. One/Blue exam snapshot remains enrolled but live roster is empty.
- No Class Nine or Sunday 04-Oct scheduled rows.

## Source coverage and authority
Date sheet defines **subjects and dates**, not the marks scheme.
Seed packages contain 43 official paper records plus 6 recovery records (49 source records). Matching by canonical class and subject gives **45 unique scheduled paper candidates**, **30 without a directly matching seed**, three off-matrix sources, and one duplicate-variant pair.
The **30 unrepresented slots** are 21 Starter/Mover/Flyer Written/Oral papers, eight Class One–Eight Quran/Nazra papers, and Class Three General Knowledge Written.
Seed metadata is a **reference candidate**, not proof of the final printed paper or manually edited tenant working copy. Placeholder `__________` exam dates are unknown and must be reconciled to the canonical matrix; they are not real competing dates.
## Per-paper *candidate* total marks from versioned seeds
| Class | Source total marks candidates (not auto-approved) | Special consideration |
|---|---|---|
| Starter / Mover / Flyer | No directly matching paper seeds | Seven Written/Oral subjects per class; verify original printed papers and oral sheets |
| One | English 50, Mathematics 50, Urdu 50; Science 0, Islamiyat 0 | Mathematics unresolved section marks; **0 is invalid** for Science and Islamiyat; Quran/Nazra missing |
| Two | English 75, Mathematics 60, Urdu 100, Science 60, Islamiyat 60 | English flagged HOLD_FOR_MARKS_CONFIRMATION; Quran/Nazra missing |
| Three | English 75, Mathematics 60 (recovery), Urdu 100, Science 80, Islamiyat 50 | Urdu marked HOLD; GK Written and Quran/Nazra missing; archived Social Studies is NOT the official GK paper |
| Four | English 60, Mathematics 60, Urdu 75, Science 60, Social Studies 50, Islamiyat 50 | English HOLD; Quran/Nazra missing |
| Five | English 75, Mathematics 60, Urdu 75, Science 50, Social Studies 50, Islamiyat 50 | Mathematics SOURCE_CONFLICT; Islamiyat Version A and B both exist (select actual administered version); Quran/Nazra missing |
| Six | English 75, Mathematics 60, Urdu 75, Science 50, Social Studies 50 (recovery), Islamiyat 50 | Quran/Nazra missing |
| Seven | English 75, Mathematics 60, Urdu 75 (recovery), Science 60, Social Studies 50, Islamiyat 50 (recovery) | Mathematics SOURCE_CONFLICT; Urdu HOLD_FOR_MARKS_CONFIRMATION; Quran/Nazra missing |
| Eight | English 75, Mathematics 60, Urdu 75 (recovery), Science 50 (recovery), Computer 50, Islamiyat 50 | English REVIEW_SOURCE_MCQS; Quran/Nazra missing |

Flagged seed candidates (8): One Mathematics; Two English; Three Urdu; Four English; Five Mathematics; Seven Mathematics and Urdu; Eight English. Two additional candidates (One Science and One Islamiyat) explicitly carry an invalid zero total.
Off-matrix seeds must stay as reference records, not become scheduled First Term subjects: Three Social Studies, Eight Social Studies, Eight Tarjuma-tul-Quran. This does not alter their archived source content.
## Safety and functional findings
1. MarksSheet on the reviewed branch loads `exam_subjects.total_marks/pass_marks` and keeps both fields empty until configured; its student inputs stay disabled. The first successful real-marks batch locks that section/subject scheme. The parent exam's 100/33 must never silently fill this blank.
2. Subject-level passing marks do not come from the date sheet or available seed metadata. School approval is required for each paper, including rounding conventions, Oral and Quran/Nazra.
3. The backend letter-grade calculator applies fixed 33% thresholds, independently of the selected `pass_marks`; the active Result Card template also calculates grades from percentage. A separately defined policy/consistent implementation is required before publishing final pass/fail.
4. A partially entered result can currently feed Result Cards before every scheduled subject is marked. Prevent publishing an incomplete student's result as final. Distinguish blank/unentered from an actual zero and from Absent.
5. In active Result Card marks-table rendering, `row[field] | '-'` is a bitwise-OR bug (it coerces blank marks to 0 and truncates fractional marks; actual zero must remain 0). A narrow `??` source fix has been staged, not yet deployed during this audit.
6. The Result Cards examination header previously displayed parent `exam.total_marks || 100`, misleading for variable paper totals. A narrow First Term header fix shows **Per scheduled paper** instead.
7. Never copy totals across sections without checking that the same paper was administered. One/Blue remains an exam enrollment snapshot, though its current roster has zero active students.

## Execution gate / next action
- Use the final printed paper/header or approved oral marking sheet as the authority for `total_marks`.
- Confirm `pass_marks` and rounding/Absent rules. Do not derive them from an undocumented universal 100/33 default.
- Reconcile the 8 flagged paper sources and 2 invalid-zero sources. Verify the 30 unrepresented subjects from printed originals/working copies; choose actual Class Five Islamiyat version.
- Only then configure the corresponding `exam_subjects` rows with an auditable, validated batch (non-destructive and idempotent); preserve unrelated students, fees, attendance, saved papers, and Paper Editor V13.
- For final live save/reload/result-card acceptance, use **genuine actual obtained marks** rather than introducing mock results in production.

## Passing percentage decision and implementation (updated)
- For all official First Term papers, including Written, Oral, GK and Quran/Nazra, **33% is the starting default, not a compulsory fixed percentage**.
- A Passing Percentage input allows the operator to select a rate from 1–100% (up to 2 decimal places) per scheduled class/section/subject before its first marks save.
- Passing Marks are calculated and displayed automatically as `Math.ceil(actualTotal * chosenPercentage / 100)`. Examples: 50 marks at 33% = 17; 50 at 40% = 20; 60 at 30% = 18; 75 at 35% = 27.
- The selected percentage is stored separately in nullable `exam_subjects.pass_percentage` via `migrate_exam_passing_percentage_v1.js`, alongside its calculated `pass_marks`. On reload the saved choice is shown. The chosen scheme remains locked after its first genuine marks batch to prevent changing the threshold underneath existing results.
- Backend rejects mismatches between supplied percentage and passing marks and rejects attempts to overwrite an already-configured scheme. All changes are scoped to canonical School 1 / First Term exam 9.
- Rollout order: verify production data and files -> backup -> run the *additive, idempotent* new percentage-column migration once -> deploy matching backend policy and exam routes -> deploy validated frontend build -> confirm setup/roster and no unexpected mark changes.

## Integrated Result Cards validation and incomplete-result protection — r5 candidate
- The result API now returns authorized `scheduledSubjects` (class, section, subject, total, passing marks and selected percentage) along with saved rows. The schedule query is tenant-scoped; **do not deploy backend before** the additive `pass_percentage` migration.
- The frontend reconciles each student's actual current class/section against the canonical scheduled paper list. An unconfigured paper, missing row, blank mark, duplicated subject, wrong total, or passing-marks/percentage mismatch is **Incomplete** and cannot be printed as a final result.
- A saved numeric **0** is an entered mark (normally Fail), never silently treated as missing.
- Grade/status uses the paper's own stored passing threshold. If a complete student's any scheduled paper is Fail, overall status/grade is Fail/F, even if aggregate percentage is high. The percentage is displayed separately.
- Printable single cards and batches contain only verified complete records. Class batch print is restricted to students **with saved marks** in that section; it does not imply that a currently enrolled student with no saved results already has a card. If a saved-mark student in the requested batch is incomplete, the batch is blocked.
- The active A4 templates use `Pass`/`Fail` status, rather than the old hardcoded 50% remarks. Printed First Term cards do not fabricate attendance totals (220/205/15) when verified attendance has not been supplied, and do not imply automatic promotion.
- Local fixtures are synthetic test-only data. No production results, students, fee records, attendance, printed papers, or school rules were mutated by these checks.
- V13 Paper Editor remains unchanged. Verified test gate: backend **6/6**, combined frontend/Examination/Paper Editor V13 **40/40**, production safety check pass, frontend build pass.
- Live release currently observed at r3. r5 candidate requires reviewed release-meta update, staging, backups, additive migration, narrow backend route/config overlay (mirrored paths), frontend release with preserved hashed assets, health check, read-only invariants and authenticated acceptance.
