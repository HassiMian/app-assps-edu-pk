# ASSPS Paper Studio — live Diary / Early Years preservation candidate (15 Oct 2026)

**Engineering verdict: isolated source QA PASS for listed tests; official production release HOLD.**

## Source custody and ancestry

- Clean latest Paper/Grade canonical starting commit: `2709ea9664b755ed383c2d8d929f1da29cadacbf`, branch `integration/paper-term-grade910-current-live-20261015`, verified current on 15 Oct 2026.
- Original uncommitted live-derived Result Cards owner workspace at `/root/workspace/assps-resultcards-core-review-20261012` was **READ-ONLY** to this work. Its eight tracked modifications, one untracked Early Years print module and live frontend records were preserved; no reset/force-push.
- An entirely separate worktree `/root/workspace/assps-paper-diary-earlyyears-reconcile-20261015` carries a new source-only candidate. No school or private student records, signing keys, .env, proprietary fonts or live DB rows were copied into Git.
- Rich Diary JSX and CSS imported into the clean descendant to retain school-specific editable subject/diary font sizes, subject bold, footer controls, school/header/logo sizes, saved library, per-student A4 cards and integrated Lesson Planning. Three compatible Early Years printing changes applied as clean source diffs; independently authored owner-side `printEarlyYearsPaper.js` preserved. SaaS layout/topbar dirty changes were NOT copied.
- Corrected real render regressions exposed by existing Chromium acceptance: printed Flyer outer border removed and physical A4 sheet CSS restored to 210 × 297 mm (content padding remains).
- Updated two synthetic browser/pure tests to support current live-derived Diary formatting and mock all nonessential API calls. The genuine delayed Save handler still executes in VM and preserves scope/editor on stale responses (3/3 PASS). Real backend authentication is **not** mocked in production.
- Tidied React Hook stable saved-list callback, unsafe render-time `Date.now`, empty catch/unused references; changed JSX tests/modules pass strict targeted ESLint.

## Actually executed technical QA

- Optimized frontend Vite build EXIT0, log SHA256 `b393bfe63ee1ba26ddad383c018a186983f39b76ed9e10291b41a1dbbf43c8d9`.
- Protected template integrity: 6 baseline files unchanged.
- Daily Diary late-save + Early Years assets, layout, font and controls: **25/25** tests PASS.
- Real headless Chromium Daily Diary class/section, 2–10 A4 slips, students and integrated Lesson mode: **1/1 PASS**, log SHA256 `20993c770d1f2282a99b1c6c97ac9c41b9e7e08d052e71071218e8f25c3a16e3`.
- Real Early Years render/geometry across nine original papers, print media, A4 PDF and PaperGenerator route print: **8/8 PASS**, log SHA256 `3d01d0e1f544558431ad6b65951706f29bfee44158081466ed2a3f62bffe12be`. Earlier test failures and their fixes are retained in test logs, not hidden.
- Independent synthetic Chromium Term Planner six subjects / source assessment dates / mock server Save–Reopen–Edit / A4 PDF: PASS. Weekly Notebook source and mock server Save–Reopen, safe A4 overflow, class-wise PDF: PASS. No actual school-authenticated actor used.
- `check-preserved-companion-features.py`: **9/9** source + reachable compiled Diary/Early Years/print checks PASS, production authorization `false`.
- `check-lesson-planner-ui.py`: PASS, advanced Term/Weekly module reachable, previous live legacy-only module not the build candidate.
- Strict targeted ESLint: EXIT0; `git diff --check`: PASS.

## Hard remaining gates — do not convert source QA into a public cutover

The current public frontend is still a different unapproved artifact and original running lesson backend guard/worker not installed. Core release must recheck exact latest source and human acceptance before any deployment. School-issued staff first-login/password change/relogin, Principal authenticated Save→Reopen→Print, independent School2 genuine denial, signed current offsite recovery/worker attestation, Core-controlled traffic promotion and actual postflight/rollback remain distinct, unsatisfied gates.

Windows CYBERSPACE printer diagnostics on 15 October showed `RICOH MP C307` as `WorkOffline=True`; its printer-class PnP device and the Samsung printer were `Present=False`. A one-page synthetic Urdu PDF embedded Jameel Noori Kasheeda, but Ricoh queue job remained 0/1 printed and was cancelled without touching user jobs. The school must restore physical printer power/USB and inspect a *real printed* Urdu page before certification.

No live school papers, term drafts, attendance, exam marks/results including genuine numeric zero scores, staff passwords, production services, Nginx, PM2, PostgreSQL roles or user data were modified by this isolated source QA. Source handoff coordinated in GitHub issue #4; SaaS Core alone owns promotion.
