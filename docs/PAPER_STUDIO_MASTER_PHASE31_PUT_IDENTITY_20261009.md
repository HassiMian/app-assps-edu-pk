# Paper Studio Phase31 — reject mismatch between requested PUT ID and returned saved ID

2026-10-09. Paper Studio isolated owner development, not production.

- Base clean Phase30 `e578959ee36705913e6cf2bcb0b35388cd022848`. Production component and signed Core security remain untouched.
- In an existing saved diary PUT, a successful HTTP200 `{success:true,data:{id:999}}` could replace locally known diary ID201 even when request went to `/api/daily-diary/201`. This is wrong-resource confirmation/next-update risk, not proven production data corruption.
- Narrow guard compares positive validated response ID with expected saved PUT ID before registering identity or confirming Save. New POST ID creation unchanged. A mismatch routes to existing failure handler and preserves editor content.
- New real Chromium synthetic POST ID201 then PUT/201 returning ID999 **1/1 PASS** after patch, `/tmp/paper-p31-put-test.log`, process exit0. Same new fixture against prior unmodified Phase28 source **0/1 PASS exit1** `/tmp/paper-p31-prepatch-red.log` because failure warning was absent; prior source also lacked later Phase29/30 improvements, so this is a historical original-source negative rather than an isolated Phase30 exact-parent RED.
- Six serial existing and new Vite/Chromium Diary regressions **6/6 TAP PASS, zero failures/skips** `/tmp/paper-p31-regression.log`; shell's original numeric exit status was not retained by remote executor. New test scoped ESLint PASS exit0. Vite build PASS exit0, 3.97s `/tmp/paper-p31-build.log`.
- No fresh 43-paper Chromium corpus on this Phase31 source; Phase30 43/43 exit0 historical only. No signed restricted PostgreSQL/77-table RLS, backend endpoint ownership or response identity tests, Nginx private HTTPS media, physical Urdu Nastaleeq print, PDF/DOCX binary artifacts or production release authorization. SaaS Core alone selectively integrates onto its newest signed descendant after independent verification. No deployment.
