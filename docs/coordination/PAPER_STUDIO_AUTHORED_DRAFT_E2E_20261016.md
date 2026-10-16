# ASSPS Paper Studio — user-authored blank paper recovery and real disposable teacher E2E

Date: 16 October 2026. Source: fix/paper-user-authored-blank-workspace-20261016; protected integrated Core ancestor e6911732 plus latest scoped Paper QA commits. Source work only. Public deployment remains SaaS Core owned.

## Real defect and precise fix

A blank self-authored paper wrongly displayed Open Question Menu, not Type First Question. The editable question inspector and edit toggle were restricted to isOfficialPaper, which intentionally excludes user-authored papers. An empty teacher-authored draft therefore could not add a custom question without a Question Bank source.

The source correction gives non-finalized user-authored drafts their own edit-toggle/structural inspector and the existing Type First Question handler, which creates a structured question and starts edit mode. Finalized user-authored drafts remain excluded. The canonical newer Workspace, protected official papers, scoring/marks, Question Bank gating, original papers, Urdu Nastaleeq and print engine remain unchanged.

## Actual tests, not assumed

- Existing local Chromium manual Weekly Assessment authoring flow: 1/1 PASS. Synthetic empty Question Bank bootstrap interception is scoped to the test fixture; actual application authentication is not changed. The test creates manual Q1, saves a canonical mock server revision, finalizes, reopens and previews printing.
- Actual disposable PostgreSQL16 and real isolated Express backend: 1/1 PASS, with a fresh schema-only production DDL export and NO saved student rows. Random private throw-away QA passwords; genuinely authenticated synthetic teacher via JWT/HTTP, authorized teacher Paper Studio UI, saved server revision, reload/reopen of the paper, Chromium A4 PDF (64,255 bytes), and separately authenticated synthetic teacher without permission denied access. No live school password, real teacher role or printer involved.
- Root-private reproducibility receipt /root/assps-phase3-e2e-qa-20261016/verified-run.log mode 0600. Source schema dump mode 0600, root private. Temporary postgres cluster auto-deleted.
- The disposable database login has BYPASSRLS ONLY within pg_virtualenv to permit synthetic fixture row inserts under copied signed RLS policies. This is genuine backend/teacher workflow acceptance but is NOT independent production tenant-RLS certification, School2 acceptance or signed-release authority.

## Reproduction, zero production writes

Generate a root-private schema-only PostgreSQL archive through a read-only pg_dump run by the postgres OS user; ensure its private file owner/root and mode 0600. Build the isolated frontend and make backend packages available in its worktree. Then invoke:

pg_virtualenv -v 16 -t env ASSPS_PHASE3_SCHEMA_ONLY_DUMP=/root/private/schema_only.pgdump ops/paper-studio/run_disposable_teacher_e2e_20261016.sh

The source runner refuses execution outside a root-owned, private pg_virtualenv; rejects protected production database ports 5432 and 55432; generates ephemeral QA passwords; performs no live DB DML; never signs anything; never invokes physical printing. CI covers only no-backend local Chromium and runner syntax; no remote CI success should be asserted without actual run evidence.

Production marks/results (including true zeros), existing Diary controls, approved academic papers, production Next/Nginx and restricted worker untouched. Previously witnessed owner physical print and first-login evidence carried forward without repeated requests. The official Core gate remains 6/13 HOLD until independently signed offhost recovery, fresh approved backup, live signed worker, effective grants, peer-school/unassigned-subject denial and genuine postcutover tests are authenticated.
