# ASSPS Lesson Planner — A/B Unified Subjects and Class Exclusions, 17 October 2026

## Principal instruction
Exclude Class Eight Urdu and Pre-Nine Islamiyat from active lesson-planning import. Combine English A and English B inside ONE English subject row and Urdu A and Urdu B inside ONE Urdu subject row for Classes One, Two, Three. Keep each A and B subsection visibly labeled within the same subject cell, with original source provenance, assessments, pages and dates intact.

## Exact protected-source mapping
| Class | Original groups | Active rows | Treatment |
|---|---:|---:|---|
| Starter | 4 | 4 | unchanged |
| Mover | 4 | 4 | unchanged |
| Flyer | 4 | 4 | unchanged |
| One | 8 | 6 | English A/B merged, Urdu A/B merged |
| Two | 7 | 5 | English A/B merged, Urdu A/B merged |
| Three | 8 | 6 | English A/B merged, Urdu A/B merged |
| Four | 6 | 6 | unchanged |
| Five | 6 | 6 | unchanged |
| Six | 4 | 4 | unchanged |
| Seven | 6 | 6 | unchanged |
| Eight | 1 | 0 | Urdu excluded from active planner only |
| Pre-Nine | 1 | 0 | Islamiyat excluded from active planner only |
| TOTAL | 59 | 51 | 2 original groups excluded, 6 A/B pairs merged |

Active classes exactly 10. Original source archive remains 59 entries across 12 class labels. Mathematically 59 minus 2 excluded minus 6 redundant visible rows equals 51; no original WhatsApp content is deleted.

## Protected source, provenance and safety
The authorized school1 Principal-only original manifest is root-private at /root/secure-archive/composer-review-20261014/manifest_plus_classone_private.json. Its identity/sha, original 59 candidate keys, Class One 18-week image review, teacher/date/exercise text and 59 unresolved academic review states remain unchanged. Projection occurs only after existing source validation. There is NO academic auto-approval, student/parent publication, PDF bank rewrite, marks mutation, DB migration, service restart, Nginx change or production deployment.

## Code implementation
- New plannerSourceGrouping.js: canonicalLessonCandidates excludes the two requested classes in the active view, and merges exactly one A and one B in English/Urdu for One/Two/Three; unmatched or ambiguous duplicates are left separately reviewable (no fabricated missing counterpart). Each combined visible subject has a new stable composite identity, raw A and B candidate identities and source message IDs, and remains BLOCKED pending academic review.
- WeeklyNotebookStudio.jsx: class selector only permits ten active classes, six merged subject controls show canonical English/Urdu, and explanation banner gives source vs active counts. Existing source file and unrelated lesson drafts are preserved. Legacy server/local A/B saved drafts are recognized on reopen by their original candidate keys. Excluded-class saved documents are retained but cannot reopen as active plans.
- weeklyNotebookModel.js: A and B are first compiled independently by evidence-first weekly engine, then displayed as separate [A] and [B] lines in one English/Urdu row; source assessments, warnings and source IDs remain individually labeled. Local historical A/B editing keys remain readable.
- termPlanningModel.js: one subject row with [A] and [B] descriptions plus merged page boundaries and individually labeled assessments; First/Third Term remain UNSOURCED, never silently reusing Second Term text. Server document provenance.sourcePartsBySubject contains immutable A/B part keys and source IDs.
- weeklyServerPayload.js: one persisted English/Urdu draft subject with [A], [B] source text and provenance.sourcePartsBySubject; academicPublication remains BLOCKED.

## Reproduced evidence
- Protected real school source: 59 original, 51 active rows, 10 classes, 6 merged pairs, two excluded, class totals exact; longest term text 804 chars vs 6000 editor limit. Original source serialized JSON unchanged. Private receipt /root/assps-release-evidence/lesson-ab-20261017/private-manifest-audit.log.
- Node native model, original weekly and term regressions: 23/23 PASS, zero failed after fixing the actual document serializer behavior for new provenance fields.
- True Chromium browser, synthetic Principal and intercepted mock API with a dynamically allocated localhost port: active dropdown ten allowed classes; One/Two/Three term rows 6/5/6, one English and one Urdu row per class; both [A] and [B] preserved in weekly and term editors/print table; ZERO production writes, publication or real student PII. Private receipt /root/assps-release-evidence/lesson-ab-20261017/browser-qa.log.
- Frontend npm ci with pinned lockfile PASS after offline cache miss and documented network retry. Vite build PASS, six protected paper templates unchanged, source-lint checks PASS after unused-import cleanup. Recheck final current source after this report.

## Ownership and release
Isolated branch feat/lesson-ab-subject-unification-exclusions-20261017 based on latest reviewed integrated SaaS Core commit 58a111c82e4e2051ecab08960cf4c68c25085a24. Paper Studio Master owns Lesson Planner module integration and academic acceptance; SaaS Core owns final controlled deployment and database/RLS verification. Real authorized staff Save -> Reopen -> student print, physical Urdu A4 acceptance, source ancestry, protected regression and Core signed production release gates remain required. Do not equate the browser tests with a live deployment.
