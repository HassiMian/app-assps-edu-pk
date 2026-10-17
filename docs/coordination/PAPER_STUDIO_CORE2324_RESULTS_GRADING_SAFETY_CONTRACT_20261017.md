# ASSPS Paper Studio MASTER — Current Core2324 Result Cards + School Grade Safety Verification

**17 October 2026 PKT.** One unified source-only contribution to GitHub coordination issue #4. Owner: Paper Studio assessment results and official printing. The production SaaS release authority remains SaaS Core. **No production cutover, student data edit, role grant or school marks replay is authorized by this QA.**

## 1. Verified exact source, prior hosted blocker and real feature semantics

- Latest verified clean Core review parent: `fix/core78-hermetic-ci-gates-20261017@2324bcb9d8f27e8032b1bddfeb8b09133c4df7bc`. Its actual hosted Core workflow `38994413526` completed SUCCESS (24 steps), Lesson Planner `38994413538` SUCCESS (36 steps), but unrelated `Verify SaaS` `38994413572` failed the `Production safety gates` step. Current actual unmodified parent failed only **two** outdated literal assertions, preserved root-only baseline log SHA256 `53ed105ef1be3d5303c9684672c3f1a7b712bfd656df423eb3a8588632b5972e`:
  1. ResultCards checker wrongly demands a multi-exam `/api/exams/results?exam_ids` call even though current UI displays **`All Classes — all saved result cards` for ONE chosen examination**. Existing `GET /api/exams/results/${requestExamId}` is school/tenant-scoped on backend with both student/exam tenant clauses, exact exam and parent/student/teacher access policies; UI only prints if `loadedExamId===selectedExam`, discards stale responses and uses `activeResults` for All Classes. Existing fanout check remains.
  2. Grade save checker expects exact `loadGradeBandsForSchool(schoolId)` while reviewed backend in fact calls **`loadGradeBandsForSchool(schoolId,{previewDefaults:false})`** on MARK SAVE. This is stronger: approved school `grade_settings WHERE school_id=$1` is read and no policy default is fabricated into persisted grades. `gradeBands.length>0` required before calling `gradeFromBands`; otherwise saved grade is NULL, with valid numeric marks preserved. Grade-settings preview defaults remain a separate read-only UI convenience, not an approved grading policy.

## 2. Source-only fail-closed repair, not a gate waiver

- New pure Node source audit `ops/release/check-resultcards-grading-contract-20261017.cjs` checks the exact **loadResults handler**, the exact **`GET /results/:exam_id` route** (not a different broad handler), the exact **school grade policy loader**, and exact marks-save branch independently. It requires pinned selected exam, stale `.then` AND stale `.catch` guards, loaded-exam row provenance, All Classes from only `activeResults`, missing result warning, `protect,canReadResults`, per-exam ID SQL and two-school tenant/portal clauses, explicit preview-default prohibition for saves and NULL when grade bands missing. It also rejects a newly introduced "All Examinations" UI without its own bounded tenant-scoped batch endpoint; never permits Promise.all per-exam fanout.
- `ops/production-safety-check.js` retains all other existing gates and previous fanout rejection. It replaces ONLY the two stale exact-literal expectations with the above **stricter semantic cross-module check**. **Zero changes to ResultCards.jsx, examRoutes.js, service grade defaults, actual exam data/API behavior or tenant RLS**.
- New native adversarial suite `ops/tests/resultcards-grading-scope-contract-20261017.test.cjs` deliberately mutates actual *in-memory copies* of reviewed source, never tracked application files, verifying rejection for missing teacher/portal/student/exam access, stale requests/errors, wrong-exam rows, false all-exam print, global grading, preview/default grade, missing school bands and unsafe fanout. Handler anchoring prevents a check in an unrelated route/comment from counting as the required enforcement.
- Hosted `.github/workflows/verify.yml` adds a dedicated native negative test before its unchanged `Production safety gates` and other existing verification. The workflow remains least-privileged and contains no live DB credentials or deployment action.

## 3. Reproducible QA receipts

- Exact parent — `node ops/production-safety-check.js`: **exit1 with only original two diagnostics**, protected baseline receipt SHA256 `53ed105ef1be3d5303c9684672c3f1a7b712bfd656df423eb3a8588632b5972e`.
- New `node --test ops/tests/resultcards-grading-scope-contract-20261017.test.cjs`: **17/17 PASS, RC0**, SHA256 `a13b0ec1cd3a95bf1d759f296aee62c1cfce342adb018fb3654cd9a6e73e9759`.
- Full unchanged npm entrypoint `npm run production:safety`: **RC0 `Production safety check passed.`**, protected SHA256 `4d942ab9de0f8bc3539fe5144eea04b9e8b38bab72f1bdf386da73c65131ff42`.
- New CI YAML parses, has exactly one source negative test step and `contents:read`; Node syntax all three files PASS; `git diff --check` PASS. Hosted GitHub workflow **must be rechecked after source push**, never inferred green merely from local checks.
- Receipts stored root-only under `/root/assps-release-evidence/paper-studio-core78e-20261017/`.

## 4. Unchanged release HOLD

- Principal's authenticated 38 Class One Yellow Urdu scores were **already saved** and exact Core post-save verified; no marks replay. Live School1 results `1801` with `213` genuine numeric zeros protected. Subject approval remains pending. Last teacher assignment check **0 total/0 active**; 43 timetable-linked identity references not independently reviewed, so do not mint printer permissions.
- The previously genuine original 43-paper Chromium screen/print run was **43/43 PASS** against identical Paper Editor app source, but **physical Ricoh Urdu A4 hardcopy** is still not independently witnessed. Windows spooler accepted one synthetic A4 print command as recorded in #4; that proves dispatch only.
- SaaS Core full independent signed production security remains **6/13 HOLD** (offsite ACL owner restore, signed worker transport/adapter/auth and effective grants, independent peer School2 teacher denial). Neither a green Verify SaaS job nor a mock actor can substitute real signer, authenticated School1/School2 tests and rollback witness. No production marks, exam offers, backend/frontend runtime, Nginx, PM2, RLS or print queue changed by this branch.

## 5. Coordination handoff

- Source-only proposed patch: three files in `ops/`/`ops/tests/` plus `.github/workflows/verify.yml` and this documentation, isolated from any Core/Results owner dirty worktree. Maintain GitHub issue #4 as the single release source of truth; Core alone may forward-port this reviewed delta to its **latest** actual descendant after regression.
- If someone later adds true *all examinations* batch printing, expand the module contract and implement the bounded tenant-scoped batch endpoint, rather than weakening or bypassing this condition.
- Complete byte-for-byte older ChatGPT conversations are not recoverable from this session. Actual Git commits, current code, genuine hosted workflows, protected test receipts and read-only production checks supersede stale summaries.
