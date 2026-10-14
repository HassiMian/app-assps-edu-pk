# ASSPS Grade IX–X — Single mission, authoritative release reconciliation
**Execution date:** 14 October 2026 (Pakistan), source-and-restore certification; NOT a live production publication certificate.

## Source-of-truth continuity
This isolated Academic Master fix branches from the *more complete* Paper Studio owner feature `feat/grade910-paperworkspace-verified-import-20261014` at `7e45b2f59615455de708642b0da16407173e0f9f` rather than overwriting its implemented signed-publisher canonical bridge. It preserves the parallel Academic integration `b14680d05eb21edc4d3696003bce3a014980ef95` as a reference, does not merge incompatible duplicate implementation, and forwards only gaps backed by tests.
Previous original 2,581 authored question/answer/MCQ option revisions in 73 files, 56 original catalog references, 43 historical paper versions, existing school marks and student data are untouched. The 56 entries are research-source references, NOT 56 school-approved book adoptions.

## Closed engineering checkpoint — every output path rechecks live verified revision
Existing Paper Studio owner implementation already does server-side Grade IX/X signed publication lookup and immutable question+answer+option/marks checks on approved-only selection and canonical assessment Save, Finalize and new/reprint print job creation. This branch now additionally rechecks:
- GET canonical paper / Reopen (stored content hash and exact verified signed source, school scope and user actor)
- GET latest released snapshot (stored hash and current authorized publisher certification)
- GET existing print-job metadata (joined release and active signed revocation status)
- PATCH existing print-job status for every non-FAILED/print-capable transition
- GET personalized student print projection (reject revoked authority)
- GET staff answer-key print projection (reject revoked authority)
Every verified reference is revalidated on the server through the Paper Studio owner `grade910PaperWorkspaceReleaseGuard`. Revoked publications, changed question/answer contents, changed MCQ key/marks, lost teacher assignment, missing signed school publication, stale release or missing referenced release cannot pass as academically verified. Manual, historical and unsigned paper workflows remain separately supported and never promoted to verified. No client-supplied `approved:true` or handwritten PNG claim can insert certified rows.

## User-requested signatures
- Principal can click **Principal: upload your own adoption signature** inside the actual Grade IX–X approved-only insert panel to visit the existing authenticated `/academic/grade910-signoffs` page, draw/upload their OWN signature and submit a pending claim. Teacher signatures are expressly deferred by the school, not faked, backdated or auto-approved.
- Principal self-signature is *not* equivalent to a qualified independent academic answer review or to a school-root Ed25519 publisher trust chain. A staff-login role mismatch cannot be resolved by impersonating or password recovery. The assistant has not generated real Principal or teacher signatures.
- Original staff-capture backend migration `030` + signed reviewed-only publication migration `031` remain additive, tenant-scoped, encrypted/signature provenance constrained, and **not applied to live PG5432**. Real private key, independent qualified reviewer and authenticated institution cert must be provided through genuine school actors before publication.

## Fresh integrated QA
- Full mission `ops/qbank/run-grade910-academic-mission.cjs`, executed on this isolated combined source: **30/30 stages**, **19/19 process/source gates**, Paper Studio staging **510/510**, Academic regression **557/557** = **1,067/1,067 PASS**, 0 failed, 0 skipped. Evidence JSON: `/tmp/assps-grade910-final-reopen-cert-20261014/mission-audit.json` SHA256 `e7c0cebbf038776679ffd22c1159895b837819ee92ca03e4b6d943b01c960bfc`.
- Extra real local Express HTTP routing test (synthetic authenticated actor and mock DB, not genuine staff credentials) checked unauthenticated 401, successful authorized Reopen/Release/Print Job, and HTTP409 rejection after revocation on Reopen, latest release, existing print job, print-status action, personalized student and answer-key projections.
- Earlier inherited signed-publisher guards and canonical bridge: **31/31 focused tests PASS**; separate Principal-signature handoff **2/2 PASS**. No counting the same tests twice as academic human verification.
- Optimized Vite frontend `npm ci` and `npm run build` PASS.
- Actual isolated frontend build old → candidate → old atomic rollback PASS. Original 8 referenced entrypoint assets validated, old hash restored byte-exact. **No live frontend/Nginx symlink touched; no live traffic cutover or rollback claimed.**

## Fresh real database backup/restore and migration proof
- Live PostgreSQL production `apexos` at **14:17 UTC** was read-only checked: school1 Exam9 **1,762 saved scores**; new Grade IX/X evidence/publication tables were **absent**.
- Subsequently generated a fresh *consistent* root-only read-only `pg_dump` with globals to `/root/assps-release-backups/grade910-live-readonly-restore-20261014T1419Z/`; directory 0700, data and SHA files 0600, `sha256sum -c` PASS; never copied to public GitHub or logs.
- **RESTORED** this snapshot to a *separate disposable PostgreSQL 16 cluster, port 55432*, database `grade910_live_restore_qa_20261014`; observed snapshot: **1,763 Exam9 saved results, 322 students, 5,190 existing question-bank rows, 0 school academic approvals**. Difference from previous 1,762 count was a genuine ongoing school write between two read-only observations, not our activity.
- QA-only restricted role `grade910_release_readonly_qa` was **NOSUPERUSER/NOBYPASSRLS**. Applied ACTUAL migration source `030_grade910_signed_human_evidence` and `031_grade910_verified_paper_selector`: both PASS on *restored real Core schema*. Both new tables FORCE RLS `true`, 0 teacher/Principal submissions and 0 published records; without an actual signed actor context neither exposes any records. Runtime permission matrix: verified-publication SELECT **true**, INSERT **false**; signature-intake INSERT conditional upon signed-school row policy. No production seeding/import.
- After QA additive migration checks: same **1,763 marks/322 students/5,190 question-bank** data counts; original archived school records untouched. Disposable restored QA DB and temporary QA role completely **dropped** after tests. Private read-only backup remains for Core-controlled restore, not for destructive rollback over newly created student scores.

## Hard truth / remaining non-code evidence blockers
**Engineering source complete does not equal LIVE release.** As of this audit:
1. Real school Principal must personally submit adopted-book/source + handwritten signature via their actual authorized Principal account; no fake Principal action can be recorded.
2. User deferred qualified teacher/Urdu subject reviewer signing. Any revision lacking independently verified academic correctness must stay *research candidate*, even if Principal uploads personal adoption signature. Original question approved=0; published=0.
3. Institution-owned Ed25519 publisher private signing key, externally pinned public trust root and revision-specific approval evidence have not been authenticated. The Academic Master cannot issue a real school certificate itself.
4. Latest live `/api/grade910-verified-picker/approved-only` endpoint returns HTTP404 and live `grade910` evidence/publication tables are absent. SaaS Core deployment of these migrations, signed traffic, secrets and principal identity still requires owner acceptance. **No live backend deploy, live print or production rollback.**
5. Existing current full-app Core signed RLS and real teacher/Principal JWT/section/subject assignment certification remain distinct; school should not turn provisional teacher name matches into permissions.
6. Canonical Paper Studio's physical printer/browser acceptance against an authenticated real actor, and production rollback after cutover, can only be recorded at an actual Core-owner coordinated deploy window with zero uncontrolled mark loss. Exam9 is the **school exam ID**, not Grade IX First Term; do not promote Grade IX candidates from Exam9 records.

**Status:** ISOLATED ENGINEERING/RESTORE/SECURITY CONTRACT GATES PASSED. **ACADEMIC VERIFIED PUBLICATION + LIVE PRODUCTION CUTOVER/ROLLBACK: HOLD**, until genuine actor and Core/Paper owner approvals. Never misreport 0 approved/published as a count to inflate.
