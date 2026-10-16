# Paper Studio: Daily Diary Chromium Save-Reopen-Print regression

Date: 16 October 2026. Paper Studio-only isolated source and test-fixture repair, NOT live deployment or a physical Ricoh printer job.

Source base: clean combined Core/Paper checkpoint 72b5e0fad9f772053d4f89a1c10d921193adde06. Preserve canonical Workspace, saved Diary content and controllers, all marks/results (including authentic zeros), Jameel Noori Urdu rendering and active Result Cards V3 deployment.

## Actual fail-before investigation

Running dailyDiarySaveStatusRaceBrowser.test.js on the original latest source FAILED a Playwright 30-second locator timeout: despite mock test role/session setup Chromium was redirected to /login before [data-dd-class] could be selected. The synthetic race test had not mocked a newly bootstrapped /api/question-bank route, permitting a real network 401/global logout interceptor to terminate this fixture. This was not evidence that the real teacher login or live Diary API failed. It was a broken synthetic test boundary.

## Narrow, isolated repair

Mock ONLY the additional /api/question-bank request with a synthetic empty successful bank in the existing synthetic test, keeping the existing academic/students/lesson/Diary API mocks, teacher identity and real product auth code unchanged. This does not automatically approve any provisional questions or weaken real production tenant security. No data migration or saved teacher record changed.

Added deterministic sequential Chromium runner ops/paper-studio/run_diary_release_browser_20261016.cjs. Each of three existing browser acceptance files starts its own fresh browser/Vite synthetic environment. Strictly require real exit 0, expected pass counts, zero skipped and zero failed, otherwise fail closed. The standalone GitHub workflow installs Node22 and Chromium on a CI runner, so future checked commits can repeat this.

## Actual PASS-after VPS evidence

- Diary Workspace dynamic A4 geometry, per-subject controllers, printer CSS: 1/1 PASS.
- Authenticated fixture Save-Reopen, revision/ID subsequent PUT and invalid duplicate/foreign-school protections: 2/2 PASS.
- Out-of-order save response must NOT mark later selected Diary as saved: 1/1 PASS.
- Combined real headless Chromium acceptance: 4/4 PASS, exit 0.
- No real SaaS API credentials, student data writes, physical print or owner repeat test.

Reproduce: node ops/paper-studio/run_diary_release_browser_20261016.cjs

Boundaries: These are *mock-server* browser tests, not real authenticated public-site tenant HTTP acceptance or human physical Ricoh signoff. This source branch is a feeder to current protected Core and GitHub coordination issue #4; no production release is authorized while independent signed security gates remain HOLD.
