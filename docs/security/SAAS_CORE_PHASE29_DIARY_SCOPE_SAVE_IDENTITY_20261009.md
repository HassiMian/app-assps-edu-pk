# ASSPS SaaS Core Phase29 — canonical Daily Diary save ID scope safety

**2026-10-09 UTC · Isolated source-only owner reconciliation · SaaS Core release HOLD.**

## Canonical source and owner boundaries

- Exact latest independently pushed Core Phase28 base `8fe6324f55d6789946e4c196ba0dc6c6c25845a5`; isolated `/root/workspace/assps-core-phase29-diary-save-scope-20261009`, `feat/saas-core-phase29-diary-save-scope-20261009`.
- Latest issue #4 Paper Studio Master Phase24 clean owner `f72ca05fa13a8d3efd6c795370d05eb7fda3657c`, isolated owner worktree `/root/workspace/assps-paper-studio-master-phase24-20261009`. Paper Studio retains Diary development authority; Core imports only completed, owner-tested integration necessary to protect the canonical SaaS tenant/school data.
- EXACT owner `DailyDiaryWorkspace.jsx` patch applied with `git apply --check`, two replacements in a single JSX file; copied original real Chromium browser acceptance test with only synthetic localhost port 5571→5791 to avoid parallel agents. No branch merge, no test harness modification to other owners, no DB or live school information.

## New defect independently reproduced on latest Core

- Original Core Phase28 `savedDiaryId` retained only numeric ID across class/section/date changes, so `saveDiary` would `PUT /api/daily-diary/{savedDiaryId}` to the same previously saved day after the teacher changed to a different date or section/class. This risks wrong-record overwrite **within the same school** and cannot be prevented by tenant-only controls.
- **Fresh Core Phase29 PREPATCH real Vite+Chromium controlled synthetic mock HTTP RED, 0/1 PASS, exit1**. Captured exact `POST /api/daily-diary` for Class Eight, Blue, 9 Oct; `PUT /api/daily-diary/201` on unchanged scope (correct); then **`PUT /api/daily-diary/201` after date switched to 10 Oct, WRONG**. Explicit test assertion `new school-day diary must create a new ID rather than rewrite yesterday` failed. Log `/tmp/assps_p29_prepatch.log`. No real student, teacher or diary record used; synthetic fixture only.
- Same test after exact owner fix **1/1 PASS exit0**. Component stores `savedDiaryIdentity={id, scopeKey: JSON.stringify([classLevel,section,date])}`, uses PUT only if current tuple equals saved tuple; otherwise POST creates a separate diary and stores successful returned ID with its original tuple. Actual captured HTTP sequence **POST Eight/Blue/Oct9 → PUT ID201 unchanged → POST Eight/Blue/Oct10 → POST Eight/Green/Oct10 → POST Seven/Blue/Oct10 → PUT ID204 unchanged**. `/tmp/assps_p29_postpatch.log`. Safe Save/Update behavior remains subject to server-side tenant authorization and revision/version checks.
- The owner explicitly notes current component caches only the **most recently** saved scope; switching back to a prior scope may create a duplicate POST rather than reuse historic ID. This integration does NOT claim deduplication or signed DB version conflict protection. It does not change any existing saved diary data.

## Integration evidence on exact Core Phase29 descendant

- Real standalone Chromium identity test **1/1 PASS**; Vite production frontend build **exit0, built in 3.35s** `/tmp/assps_p29_frontend_build.log`; unchanged package-lock SHA256 `4d9385d6d72de6827d33f2e45eefda7424629e1d85bd3c5ea883965876fed7f4`, isolated clean ancestor node_modules symlink (no new npm ci claim).
- Original protected First Term six template integrity verifier PASS; exact owner new Chromium test focused ESLint **exit0 PASS**; whitespace check PASS.
- Canonical DOCX/math source model **4/4 PASS exit0** `/tmp/assps_p29_docx.log`; backend **264/264 JS syntax PASS** `/tmp/assps_p29_backend_syntax.log`; Phase21 backend private-uploads HTTP **2/2 PASS exit0** `/tmp/assps_p29_media.log`. Backend, signed tenant RLS/Paper restrictions, hardened Phase24 Nginx candidate and official printing renderer source are byte-identical to Core Phase28.
- **Fresh 43/43 protected original First Term paper actual Chromium screen/cloned-print text parity PASS on exact Core Phase29 source**, all 43 individual document markers, TAP parent 1/1 PASS, 0 fail/skip/cancel, process **exit 0**, TAP `243876.01ms`. Evidence `/tmp/assps_p29_corpus43.log/.exit`. Not inherited Phase28 or Paper Studio owner's corpus.
- **Fresh exact Core Phase29 inherited eight-script real Chromium/Node acceptance 17/17 PASS**, controlled process **exit0**, 0 failed/skipped/cancelled, `140124.93ms`, `/tmp/assps_p29_inherited.log/.exit`, sequentially after original-paper corpus. Includes scoped Diary POST/PUT anti-overwrite, A4 personalized student cards, owner month-end lesson schedule, legacy/canonical school dates and New Blank Paper exam date/manual overrides, revision-bound Lesson Save/Share and Cognitive multi-subject Student Card bridge. All HTTP teacher/admin students synthetic/mock only; not a signed role DB acceptance.
- Whole frontend lint remains prior FAIL (707 errors, 46 warnings), not cleared by focused lint.

## Production release barriers and risks

- Verified current deployed frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`, backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`; active production Nginx read-only scan remains **FAIL: 5 unrestricted `alias /var/uploads/;` in four enabled files**; Core Phase24 production-like private ingress candidate and 35/35 synthetic host tests are staged, NOT deployed. Live signed Core RLS / Paper restricted DB feature flags OFF.
- Mandatory HOLD: actual signed non-BYPASS tenant RLS/GRANT effective read/write actor authorization across 77 tables, student/guardian/fees/attendance and same-school peer denial, media per-student authorization, Diary backend ETag/revision/cross-scope update denial, restricted teacher JWT Paper Save→GET→Reopen→PDF/DOCX, Urdu Nastaleeq human/glyph and connected printer, full frontend lint, actual production DB backup/restore and safe fail-closed Nginx rollback, frontend/backend artifact ancestry, Hostinger SSH/firewall recovery. Grade IX/X academic independent textbook/page and human question approval/published 0; Connect owned separate code and remote publishing unresolved. Historical original Phase3AE ZIP/PG18 and full old chat transcripts unverified.
- **No production deployment, SQL, Nginx reload, PM2 restart, real student/diary changes, academic publication or other-owner worktree modifications** during this Core Phase29.

**SaaS Core RELEASE CERTIFICATION: HOLD.**
