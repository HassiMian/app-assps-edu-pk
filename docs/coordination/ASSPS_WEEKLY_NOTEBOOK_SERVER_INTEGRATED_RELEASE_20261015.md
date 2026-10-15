# ASSPS Paper Studio / SaaS Core — Verified Weekly Notebook Server Integration, 15 October 2026

## Incident and chosen canonical source

The Principal's screenshot showed the old "Lesson Planning Workspace", because a concurrently promoted Grade IX–X / Paper Studio frontend `6531e42839fff7f4c56d332e833037e697895723` replaced the active public Nginx static root after the earlier Weekly Notebook frontend `ae4e88eebe22afc4d2627096ed80a1ff8dca31d0`. The earlier root copy was NOT the actual Nginx root. Preserve the newer Grade IX–X / ResultCard / Paper / Daily Diary changes. Current fix is a clean descendant of `6531e428`, not rollback to the old frontend.

## Delivered code: single, discoverable SaaS UI

Under Paper Studio → Lesson Plans, the screen defaults to **Weekly Notebook Studio**, and an explicit second button preserves **Advanced Lesson Editor**. Within Weekly Notebook: **1. Term Syllabus → 2. Weekly Plan → 3. Daily Student Cards**, visible in one workflow. Choose school year/date range, class/section, precise source week, subjects, optional assessment, authorized class roster and selected students. Right side is the live low-ink A4 card preview, separate Urdu number isolation, printable student name and roll, 1/2/3/4/6/8 cards per page, typography and row/column sizing. An overflow preflight rejects clipping before printing. This is compatible with the existing Paper Studio rendering surface, without changing the Daily Diary module.

## Authentic original source library without user re-upload

New authenticated **Principal-only** `GET /api/lesson-plans/planner/private-source-bundle` automatically serves school1's root-protected original WhatsApp 59-group academic review archive and private reviewed Class One 18-week transcription. Requires protected role, school1 match, principal designation from JWT's current active-user lookup AND a second school1 active Principal database receipt. File SHA-256 must equal `4d2ccdce5ec644750a530c890df5a0a41eaee5b76f1e4ba47d912617db5c0cda`. Cache-control private no-store, Vary Authorization/Cookie, no source in public JS/assets/GitHub. Unauthorized/peer-school/ordinary-teacher access fails closed. Browser verifies each source independently against pinned 59 SHA256 groups and Class One transcript before displaying. If this API returns unavailable, explicitly allow private original JSON file as a fallback; never claim successful auto-loading without auth.

## Persistence and correctness

"Save Week to School Server" now calls EXISTING scoped `POST /api/lesson-plans` or revision-required `PUT /api/lesson-plans/:id`. Stores class, section, week, per-subject brief editable statements, separately marked assessments, original source refs and provenance; no student PII, no publish/share API invocation, no fabricated teacher access or academic approval. "Server Saved Weeks" fetches from school-authenticated GET, filters with `provenance.marker='ASSPS_WEEKLY_NOTEBOOK_V1'` and `academicPublication=BLOCKED`, and reopens by class/week. Update can target ONLY a specifically reopened server ID with matching canonical week identity and revision; never auto-overwrite existing teachers' drafts. "Older local working copies" are distinctly labeled device-only; no shared guest storage. Existing 3 misattributed legacy draft rows are never changed.

School source grammar: 59 school1 subject candidates / 12 classes and Class One 18-week image transcript; source dates kept literal, 24 undated groups clearly proposed, 13 multi-source groups flagged. Class Four English 14 Nov/14 Dec end-block assessments are **proposals**, explicit Islamiyat assessment source dates preserved. No automatic teacher account assignment or student portal notifications.

## Executed QA and release gates

- Protected original source hash 59 + Class One 18 weeks PASS.
- Mock actor HTTP principal-only source route: authorized principal positive; no token, ordinary teacher, another school, misleading Principal claim or nondesignated admin fail: 3/3 test groups PASS.
- Lesson planning engine and static route regression: 8/8 PASS (stale base regex corrected to match an existing extra auth middleware).
- Frontend Chromium mock school API: no file upload; auto original source 59 + reviewed Class One; real class-wise & week selection; revision-safe POST, update with expected revision, GET and reopen; no student PII in server payload; 3 personalized student cards, 1/2/3 per A4 pagination, single A4 PDF, class-switch negative; term→weekly→daily navigation and Daily print PASS.
- Node week parser 8/8 PASS; frontend optimized Vite production build and modified code ESLint PASS.
- Existing Daily Diary acceptance test on actual newer `6531e428` baseline FAILED due pre-existing unauthenticated `/login` routing in local test runner; failure reproduced unchanged on exact baseline with separate detached worktree. This is a harness-auth mismatch, **not** code-change regression proof. No unrelated Daily Diary source changed. Do not claim that existing test passed on this specific source.
- **Not certified:** genuine Principal authenticated browser Save/Reopen/physical Urdu print and peer-tenant live signed RLS (mock HTTP tests are not real JWT acceptance), institutional textbook/teacher evidence, academic publication. This narrow software release is *private draft only* and remains distinct from full Core RLS/cutover certification.

## Controlled production change boundary

Additive private source API to current backend ONLY if exact current route file matches source base and protected DB+backend backups exist; no migrations, no role/grants changed. Existing backend PM2 restart/reload only when real necessity and safe rollback reviewed. Protect user's original 1762 Exam9 marks, 213 numeric zero scores, 3 old unpublished drafts, fee/attendance/papers.

Frontend promotion ONLY if Nginx actual currently active root is still GradeIX–X `/var/www/assps-grade910-paper-studio-live-6531e428`, release source checksum matches, and no newer agent release has superseded it. Stage new Vite static assets onto a full fresh copy of current effective root; preserve old hashed JS; exclusive deploy lock, atomic swap, validate public exact HTTPS index, JS 200, login 200, anonymous source API 401, nginx test. Original entire live root retained as rollback. Do not switch to stale previous root.
