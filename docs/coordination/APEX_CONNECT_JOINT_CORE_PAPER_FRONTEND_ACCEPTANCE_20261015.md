# APEX Connect — Joint Core/Paper/Connect candidate acceptance (15 Oct 2026)

**Ownership / purpose:** Connect-only read-only technical verifier for cross-owner release readiness. Does **not** sign human attestations, promote Paper, deploy Next, change Nginx, SQL, staff passwords or official school marks. SaaS Core alone owns actual release authorization.

## Source chain and exact machine artifacts
- Connect current QA continuation parent `b181c9411d1b253ad9685cd9c5eea8e8965f3227`; protected Next reviewed private candidate `rc1vIlE6prAQ8pHrw7ohX`.
- Latest clean integrated Core/Paper frontend branch `integration/core-paper-diary-v5-immutable-frontend-20261015` at `bb78a4267041f53d7fc754257799265af066f763`, proven descendant of `ca86b846ea8bc4bcf40556befdf1633c3ba59027`; exact candidate `index.html` SHA256 `9d0d07585831504c82a4d37c39354ff5ccc9c006447ac5d15335abe4b7f40255`.
- Actual public Grade root `/var/www/assps-grade910-draft-save-print-b18a8aae`: HTML SHA256 `ed6d77130aae12c1a72087d3a4854b9ffc7f42488e81b8c6f67066e7ac35e2c0`. Public Diary missing 9 controller signals, with exact active-entrypoint inspection, even though legacy rich JS remains orphaned. **LIVE FAIL**.
- `ops/connect/verify_joint_frontend_connect_core_20261015.py` dynamically verifies exact reviewed frontend source via Paper's existing guarded non-apply preflight, active Diary 11-control guard, Lesson Planner V5 term/weekly/daily contract, Early Years print companion, reviewed private Connect role/login/401/public boundary tests, current live Grade index immutability, and the **actual official SaaS Core** source/release verifier. This does not copy source between workstreams and runs no database-changing tests.
- The verifier distinguishes `technical_candidate_status=PASS`, `public_diary_active_graph_status=FAIL`, `official_core_release_status=HOLD`, `production_release_authorized=false`. CLI `--production-release-gate` returns **exit2 regardless of candidate result**, because this Connect-owned code cannot replace the official SaaS Core institutional signature/release decision.

## Actual fresh execution
- Joint candidate matrix: **10/10 candidate/contract checks PASS**, with separate currently deployed public Diary `FAIL` recorded (11 fields total). The public FAIL is intentionally not concealed or used to pretend the candidate is deployed.
- Review of real V5 bundle: 11/11 reachable Diary controls PASS; indexed Lesson Plan and rich Diary/Early Years companion gates PASS; guarded `READY_FOR_CORE_GATE` / `production_changed=false`.
- Protected Connect first-login/role: 13 role-neutral, 7 Axios-401, 6 temporary password and 10 public-route negative QA validations PASS.
- New synthetic release matrix regression: **15/15 PASS** on malformed/replaced source, missing controllers, live drift, degraded rollout, fake Core GO, missing Next build, bad auth and public gate.
- Independently rerun Chromium exact-scope Daily Diary Save→Reopen / School2 mock negative: **2/2 PASS** on unchanged integrated candidate; log SHA256 `3d84c6fd012dcd66d0b700c5c21109a1319b67001e7ef0f73b5ab2742a40dd84`.
- The reviewed Lesson Planning Chromium QA initially failed because its synthetic API fixture lacked an auth probe mock, and then used old advanced-first selectors after a weekly-first UI upgrade. Both fixture issues recovered **only in isolated Paper owner handoff** branch `fix/connect-crossowner-lesson-browser-fixture-20261015` at `40a8c0f05fe2c2416506e45738365d1182e394ac`. Fresh Chromium lesson generation/save/student-card bridge **1/1 PASS**; log SHA256 `8070c2a38755b057e8bc89be0f4d40ef88be73bcaeb47a0a6b8e079e9d395656`. Do not merge this Paper-owned QA file without Paper Studio review; product runtime code was not touched.

## Release verdict / protected production
Official Core technical checks 20/20 PASS, **production HOLD / exit2**, six separately authenticated worker/tenant/recovery/signer gates still missing. Current running restricted worker module absent in backend, Connect public Next remains old BuildID `ONDwxEIZlx5onDIKY7wYf`, anonymous dashboard admin-biased; actor-session review not digitally certified. School-reported teacher/principal/printer checks acknowledged and should not be repeated merely to fill paperwork. **Do not promote** solely from machine-issued unsigned receipts.

Exam9 School1 exact observed invariants: 1,762 result rows, 213 genuine numeric zeros, no NULL marks. Protect Diary subject font/bold/row/print settings, all Paper draft/print features, Early Years, Grade IX–X and official answer keys. No production mutation in this QA mission.

Run source-only CI with `python3 -m unittest discover -v -s ops/connect -p 'test_verify_joint_frontend_connect_core_20261015.py'`. Run live candidate matrix only on authorized VPS with explicit SHA-bound arguments; never on GitHub runners with production credentials. Commit, review and merge to a clean current descendant, then SaaS Core signed GO is a **separate** step.
