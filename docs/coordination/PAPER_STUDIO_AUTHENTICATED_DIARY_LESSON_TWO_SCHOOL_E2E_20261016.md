# Paper Studio — Real authenticated two-school Daily Diary, Lesson Planner and Paper E2E

Date: **16 October 2026**. This is a single integrated Paper Studio mission checkpoint; no public release cutover. Isolated clean base: Core/Paper reviewed integration `integration/core-paper-windows43-safe-20261016@4397a1836fedff3cba6a1062ed85b7c25e5388c6` (already includes latest signed-worker sensitive-DML guard, effective-grants audit, full 43/43 canonical Windows print QA). New source change is **one existing disposable teacher E2E browser test only**.

## Previously missing acceptance now actually executed

A private **PostgreSQL 16 schema-only clone** from a protected DDL-only production export, transient users in two entirely synthetic schools (`example.invalid` addresses), isolated Express on port 5410 and Vite preview on 5411, headless Chromium. No production student/teacher/marks/content rows or credentials were restored to the clone. Existing wrapper `ops/paper-studio/run_disposable_teacher_e2e_20261016.sh` fails closed unless root-only, an actual `pg_virtualenv` cluster with a non-production PG port, a root-owned 0600 explicit schema-only dump and strictly prefixed throwaway database name. Runtime browser was selected through an **existing isolated worker-owned Playwright browsers directory**, not by modifying a live browser installation:

```sh
PLAYWRIGHT_BROWSERS_PATH=/opt/assps-editor-worker/browsers \
  pg_virtualenv -v 16 -t env \
  ASSPS_PHASE3_SCHEMA_ONLY_DUMP=/root/paper_studio_private_qa_20261016/schema-only.pgdump \
  PLAYWRIGHT_BROWSERS_PATH=/opt/assps-editor-worker/browsers \
  /root/workspace/assps-core-paper-diary-e2e-20261016/ops/paper-studio/run_disposable_teacher_e2e_20261016.sh
```

### Actual positive checks

1. Real teacher login and Paper Studio authenticated role; assessment new source **Save → server revision → Reopen → A4 Chromium PDF**; forbidden Paper Studio permission for second teacher blocked.
2. Daily Diary authenticated POST with deliberately incorrect browser-supplied `school_name`: canonical server school name persisted instead; real returned server ID and correct tenant; GET Reopen preserved date/class/homework; authorized PATCH/PUT preserved original homework and changed only intended footer.
3. Cognitive Lesson Planning authenticated POST (HTTP 201) generated private `lp_...` plan revision 1 with correct source, lesson objectives and untrusted client `sentToPortal=true` forcibly reset to false; real GET list returned the exact saved document; optimistic PUT raised server revision to 2 while preserving objectives; stale revision 1 update correctly denied HTTP 409.

### Real authorization/tenant denials

- A **different teacher in the same school** was independently authenticated and denied Diary GET and PUT (HTTP 404). Their Lesson Planner list omitted the creator's private plan; Lesson PUT denied HTTP 404. Paper Generator UI permission also denied.
- A real authenticated **School2 tenant teacher**, created in the disposable DB, was independently authenticated. School2 Diary GET/PUT returned 404, and School2 Diary list was empty. School2 Lesson Planner list excluded School1's plan and cross-school Lesson PUT returned 404. Final direct disposable-DB readback proved both School1 documents retained original school_id, latest authorized content and safe revision/publication state after the attempted cross-school writes.

### Fresh verifiable outcome

The final fresh `pg_virtualenv` run printed:

- `PHASE4_REAL_TEACHER_DIARY_SAVE_PASS`, `REOPEN_PASS`, `PATCH_PRESERVATION_PASS`.
- `PHASE5_REAL_DIARY_SCHOOL2_LIST_READ_WRITE_DENIED_PASS`.
- `PHASE6_REAL_TEACHER_LESSON_CREATE_PRIVATE_PASS`, `REOPEN_PRIVATE_PASS`, `REVISION_UPDATE_PASS`, `STALE_REVISION_DENIED_PASS`, `LESSON_SAME_SCHOOL_OTHER_TEACHER_DENIED_PASS`, `LESSON_SCHOOL2_LIST_WRITE_DENIED_PASS`.
- Actual previously integrated Paper authoring and print acceptance, and same-school teacher Diary/Paper access denials.
- Node TAP: **1 comprehensive multi-stage E2E test PASS, 0 fail, 0 skip**, exit 0, approximately 25.8 seconds; ephemeral PG cluster **destroyed**. Additional reviewed lesson-planning static/publication/engine tests **13/13 PASS**. Shell syntax and Node JS syntax verified. A temporary shared dependency change led to a missing Playwright cache; rather than altering production services, the run was isolated to verified preinstalled worker browser binaries. Subsequent 201 versus 200 HTTP create-status correction uses the actual reviewed Lesson API contract.

## Release and records protection

No real teacher password, school marks, zero/blank semantics, curriculum question bank, public/official papers, Daily Diary print controllers, production DB grants, Nginx, systemd services or printer jobs were touched. Incidental unrelated untracked Argus JSON files created by other activity in the isolated worktree were **preserved untouched** and must never be committed/deleted as part of this patch.

This is real disposable authentication and PostgreSQL persistence/tenancy behavior, **not** independently signed live School2 acceptance, live Core 13/13 release certification, signed recovery/rollback, real authorized teacher first-login on live, or observed physical school hardcopy. Production promotion remains SaaS Core-owned and HOLD until genuine signoffs and rollback-ready postflight. Forward-port this scoped E2E test onto the newest verified Core descendant through GitHub issue #4.
