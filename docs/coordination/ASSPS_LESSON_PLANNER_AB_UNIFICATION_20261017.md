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

## 17 October 06:xx PKT — legacy-draft preservation and live preview QA

Additional audit found possible legacy-record overwrite: editing an OLD separately stored English-A/English-B or Urdu-A/Urdu-B weekly/term document in the new unified editor might issue PUT against its original ID. This was remediated before production release.

- Pure isLegacySeparateABPlan detects historic A/B saved documents only for One/Two/Three. New unified subjects and unrelated classes are unaffected.
- Reopen of a legacy Weekly or Term document carries original A/B source statements and provenance to the merged editor, but clears current existing server ID. Save creates a NEW grouped private draft via POST and leaves original separate A/B records/revision intact. Subsequent updates to new grouped documents preserve normal revision flow. Excluded Eight/Pre-Nine old Day/Week/Term saved records cannot be reopened in this active planner, though still stored.
- Actual real Chromium, strict mock API and original manifest fixture, with exact source candidate IDs: LEGACY_WEEK_CLONED_POST_NOT_PUT PASS and LEGACY_TERM_CLONED_POST_NOT_PUT PASS, no old record mutated, no publication. First test's deliberately invalid fake source candidate IDs were correctly blocked; fixture corrected to original verified IDs.
- Additional real Chromium synthetic five-student roster and A4 student print preview: 2 cards per page yields 3 sheets; 3 yields 2; 4 yields 2. Each personalized student card retained synthetic roll number and both English/Urdu [A] / [B] text. No physical print or PDF dispatch claimed.
- Receipt paths (root-only) /root/assps-release-evidence/lesson-ab-20261017/legacy-clone-browser-v3.log and ab-card-print-browser-v2.log. No live database, student marks, academic approvals or other agent worktree changed.


## 17 October 2026 ~06:4x PKT — Paper Studio owner CI and authentic disposable PostgreSQL Express round-trip

### Reviewed owner handoff safely integrated
- Paper Studio Master owns independent `audit/paper-lesson-ab-core58-regression-20261017@60e9a1e354f683bff9d2bd2658803cc52d51b5c1`, reviewed +1 on original A/B source `a36fd532`. Its **two and only two** changes (`.github/workflows/paper-lesson-ab-regression-20261017.yml`, `docs/coordination/PAPER_STUDIO_MASTER_20261017_LESSON_AB_INDEPENDENT_QA.md`) were cherry-picked with original source attribution (`-x`) directly onto our newer legacy-protection source `ebf13f4cf0e87a655d9c55be6d4aaca2319b9388`. No other Paper-owned worktree touched. This gives a **separate GitHub-hosted test-only source-integrity CI gate** triggered by the A/B branch without deploy credentials/actions. Local manual execution of its exact steps: 16/16 original+AB Node tests PASS, six locked official templates integrity PASS, frozen 43-paper canonical corpus integrity PASS. GitHub combined commit statuses have been empty to date; this is **not** evidence that hosted CI passed.
- No production website/runtime source included in this CI cherry-pick, and no stage/prod service mutated.

### Actual backend HTTP + real disposable PostgreSQL 16 evidence
- New **test-only extension** to `al-siddique-backend/src/tests/lesson-plans-http.test.js` adds a canonical grouped English+Urdu synthetic document with a single subject for each and separately preserved `[A]` / `[B]` statements plus `plannerDocument.provenance.sourcePartsBySubject` message/candidate keys.
- The test is NOT a DB mock: it uses the actual Express lessonPlanRoutes, signed synthetic school-admin HTTP actor and authentic `pg` connection in an **entirely temporary localhost PostgreSQL16 cluster**, restoring the pre-existing private current database archive `/root/assps-release-backups/core-premarkscutover-20261016T170653Z/apexos.dump` with `pg_restore --no-owner --no-acl`. A/B candidate IDs are fictional test IDs and are not tied to actual student names. The test creates two additional synthetic schools only inside the disposable clone, then verifies real HTTP POST201 → subsequent GET200 with all A/B JSONB content/part-labels/source IDs equal, peer-school GET denial, POST payload `sentToPortal:true` forced false by server, unapproved share rejected 409 `LESSON_PLAN_ACADEMIC_APPROVAL_REQUIRED`, unapproved provenance-upgrade PUT rejected 409 `LESSON_PLAN_ACADEMIC_SOURCE_LOCKED`, and unchanged original revision 1/publication hold after rejection. Original generic two-school revision and distribution test also passed. No real student data printed to stdout.
- Exact successful receipt: root-only `/root/assps-release-evidence/lesson-ab-20261017/ephemeral-ab-server-roundtrip-v3.log` showing **4/4 backend test suites PASS**, `REAL_PG16_TWO_SCHOOL_AB_SAVE_GET_PRIVATE_PROVENANCE_14_CHECKS_PASS`, `EPHEMERAL_2SCHOOL_LESSON_HTTP_PASS`; temporary `16/regress` cluster **automatically dropped**, confirmed absent. The two initial trial iterations failed due *test fixture-only* escaping/expected error code mismatch, corrected from actual server contracts; production application code unchanged. Final test pass evidence is unambiguous.
- **Bounded evidence caveat:** `--no-owner --no-acl` and synthetic PostgreSQL privileged test login do NOT prove production's signed transport, effective role/ACL, independent live peer-school/subject denial or offsite recovery. Those formal Core gates remain HOLD.

### Fresh final regression and production truth
- Fresh Node UI source/weekly/term native tests **24/24 PASS**; lesson backend engine and publication static **11/11 PASS**. Earlier actual real Chromium legacy A/B Weekly and Term clone create-POST-not-update-PUT, class dropdown, Term and Weekly A/B, synthetic student A4 cards **2, 3, 4 per page** accepted. Fresh candidate Vite build and six protected templates passed prior to test-only CI/backend modifications.
- Current production frontend release-meta `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`, backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`, public app and API health **HTTP200**. School1 original `public.lesson_plans` **3 saved, 0 published** and `public.exam_results` **1,801 rows / 213 genuine zero** all unchanged during this work.
- No production DDL/DML, private source modification, marks overwrite, paper/data removal, RLS/ACL edits, PM2/Nginx reload, new privileged teacher identity, physical school print job or unapproved curriculum publication. Independent Paper Studio signoff, authentic Principal Save→Reload→A4 Urdu physical print, signed 13 security/recovery gates, hosted CI and controlled rollback-ready release remain required before a general cutover.

**Only source/test changes are promoted to GitHub until those gates pass; no false "deployed" claims.**
