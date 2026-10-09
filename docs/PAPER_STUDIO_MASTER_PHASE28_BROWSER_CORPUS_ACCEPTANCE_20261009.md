# Paper Studio Phase28 browser and protected corpus verification — 9 October 2026

## Baseline and isolation
Paper Studio isolated branch `feat/paper-studio-phase28-diary-save-status-race-20261009`; source fix `8c110365d98f07de2912bc2ecccd8393d57b1b69`, browser fixture `25dfb671a7d5a43ecfdf816877040f5de1477ca4`. Core exclusively controls production integration/deployment. Production untouched.

## Actually observed evidence
- Deliberately deferred HTTP POST while selected Oct9 diary changes to Oct10: new Chromium fixture isolated serial `1/1 PASS, exit0`, `/tmp/paper-p28-race-serial.log`. Verifies previous Oct9 save confirmation never claims current Oct10 is saved. Test uses synthetic tenant/HTTP and does NOT establish signed teacher database RLS.
- Existing two scoped Diary Save/revisit browser tests `2/2 PASS exit0`, `/tmp/paper-p28-inherited.log`.
- Complete 43 original protected First Term paper canonical Chromium screen/cloned-print-text parity: `43/43` distinct document PASS markers; TAP `1/1 PASS, 0 fail/skip/cancel`, duration 203393.297177ms, `/tmp/paper-p28-all43-final.log`. Initial remote execution command timed out at 50 seconds, but its child continued and finished to complete successful TAP result; shell's original exit marker was not retained and therefore a separate numeric process exit0 is NOT claimed.
- Concurrent 3-browser test initial `2/3 PASS`, other visibility timeout at 15 seconds during Vite optimize; new delayed-save test serial PASS after this, `/tmp/paper-p28-race-all.log`, `/tmp/paper-p28-race-serial.log`. Concurrency stability is NOT certified.
- A duplicate independent corpus launch was rejected because its required localhost port 5194 was occupied by the still-running first corpus process; `0/1` hook failure `Port 5194 is already in use` in `/tmp/paper-p28-corpus-complete.log`, distinct from the successful original 43-document run. No competing test processes were terminated.
- Complete isolated frontend Vite build PASS exit0, 3.18 seconds `/tmp/paper-p28-build.log` and git diff integrity PASS.

## Not certified / release HOLD
No actual prepatch delayed-save RED was demonstrated; Phase27/28 source unchanged during corpus. Signed restricted-role PostgreSQL/77-table tenant RLS, Core teacher/guardian permissions, backend Diary uniqueness/revision, Nginx private upload HTTPS, physical printer and Urdu Nastaleeq glyph/PDF/DOCX parity, original signed historical Phase3AE bundle and qualified Grade IX-X content approvals remain release gates. No deploy, migration or service restart. Rollback: withhold owner feature branch from Core release.
