# ASSPS Lesson Planning — Provenance Fail-Closed Continuation (25 October 2026)

## Mission and starting checkpoint
Existing ASSPS Final SaaS Audit mission, no new scheduled task.
Source parent: `ff1c6ce1` (2026-10-25: original assessment source replay immutability).
Clean isolated worktree: `/root/workspace/assps-lesson-provenance-failclosed-20261025`.
Branch: `fix/assps-lesson-provenance-failclosed-20261025`.
Source-only: **NO PRODUCTION DEPLOYMENT OR DATABASE WRITE**.

## Red controls reproduced on untouched parent
1. A proposal `src:` ID with a replayed manual override could masquerade as `ORIGINAL_SOURCE`, carry `academicApproval:true`, replace the original source ID and original date. Independent repro returned negative exit 7.
2. A manually entered or auto-suggested event could carry a forged original-origin/approval field.
3. A paired English/Urdu A/B original page range (31–40 in a synthetic test) could be overwritten by draft edits to 1–999 with no warning.
The three purpose-built tests failed on parent (0/3 pass, 3/3 fail).

## Safeguards implemented
- Original source events remain immutable as established in parent. Edits to source proposals may change the date/name, but are now expressly `MANUAL_PROPOSAL`, `academicApproval:false`; authoritative source ID, original date, subject and source context come only from the original candidate.
- Manually created/auto-suggested events are not accepted as approved/original due to replayed payload flags. Preserves editable dates and names and never claims independent academic approval.
- A/B Second Term original page bounds are restored from original source, not replaced by legacy manual drafts; a clear review warning marks any discrepancy, and `sourcePageFrom/sourcePageTo` carry source-derived bounds.
- Unsourced First/Third Term remain teacher proposals, **not** copies of Second Term sourced pages. The existing 59 academic source candidates are **not** automatically approved or published.
- No changes to lesson-plan DB schema, tenant identities, row-level-security policy, live marks, timetable or teacher grants.

## Checks actually executed
- Parent red controls: 3/3 regression cases reproduced.
- New + existing frontend/unit corpus: **44/44 PASS**.
- Scoped backend unit/HTTP fixture: **8/8 PASS**.
- Targeted Node Term model including new negative cases: **16/16 PASS**.
- Scoped ESLint **PASS**, frontend Vite optimized build **PASS**, `ops/production-safety-check.js` **PASS**, `git diff --check` **PASS**.
- Synthetic headless Chromium Term Planner: **PASS** including server fixture POST→PUT (revision 1→2), reopen/reload, 6-subject list, assessment numbering, date provenance, styled A4 PDF.
- Synthetic headless Chromium student A4 density: **2/3/4 cards per sheet PASS**; synthetic students, no real student personally identifying data.
- Browser tests intercepted backend APIs on localhost using synthetic identities; **not** authenticated live school delivery or proof of production release.

## Fresh live read-only checkpoint
- HTTPS `app.assps.edu.pk/` **200**, `api.assps.edu.pk/health` **200**, anonymous Lesson Plans API **401**.
- PostgreSQL School 1: **3 lesson plans; 0 sent to portal**. School 1 **54 active class teacher assignments**.
- Nginx config test **PASS**. No authenticated positive-role browser authorization was proven.
- Separate Core audit retains G11/G12 **RELEASE_HOLD** due to P0 cached-private-media CDN denial lacking independently certified purge, protected First Term marks provenance/actor authorization drift, signed source identity, cross-tenant account tests, off-host backup restoration, real printer witness and release/rollback certification. Do not equate health 200 with live Lesson Planning acceptance.

## Remaining Lesson Planning release gates
1. Independent academically authorized review of source candidates (latest pinned school corpus **59/59 review pending; publication blocked**); no invented First/Third Term data.
2. Real Principal/Teacher and peer-school denial via signed authenticated sessions; scoped school/teacher assignment and revision conflict tests; real Save→Reopen→Edit→Publish.
3. Verify paper/Diary/lesson source identity and matching deployed artifacts. Preserve protected original results, real zero marks, tenant data and all other worktrees.
4. Real Urdu/Jameel physical A4 print witness, School 1 student/scope parity and offsite dual-Postgres restoration certificate.
5. Core-owned controlled deployment only once G11/G12 privacy, backup, authorization, actor provenance and rollback gates genuinely pass.

**Decision:** Source candidate ready for further integration review; **NOT LIVE, NOT PUBLISHED, NOT PRODUCTION-CERTIFIED**.
