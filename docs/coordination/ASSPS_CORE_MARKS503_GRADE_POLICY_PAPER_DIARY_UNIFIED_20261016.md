# ASSPS SaaS Core unified Marks Save + protected Paper/Diary checkpoint — 16 October 2026

## Scope, ownership and immutable source
Core-owned integration on top of Paper Studio's clean candidate `integration/core401-paper-unified-diary5-20261016@2bd42380d916db7014f497ed32f9f0eead04cff2`. New isolated branch `integration/core-marks503-paper-diary-unified-20261016`; source changes:
- `ec52c405`: exact scoped forward-port of existing live emergency `f0f87e1b` HTTP 503 signed DB infrastructure error classification, preventing incorrect forced /login on a valid teacher token when the catalog/role is unavailable. Real missing/expired/bad JWT still HTTP 401.
- `1fcfca6d`: forward-port of clean corrected 82-catalog synthetic role-binding fixture `884bc9b1`; new negative regression for one absent academic policy.
- `5b8777ef`: correct Marks Save to use `loadGradeBandsForSchool(schoolId,{previewDefaults:false})` instead of preview-only defaults for persisted grades. Previously actual Express synthetic teacher POST for a school with no configured bands produced invented grade `C` instead of SQL NULL. Fail-before was observed; PASS-after test verifies NULL and untouched score/tenant scope. A school with configured bands continues to use those school bands; no grade data migration or existing marks rewrite.

Only changed backend runtime paths: `src/middleware/auth.js`, additive `src/middleware/signedDbInfrastructureError.js`, `src/routes/examRoutes.js`. Other added files are focused tests and documentation. No Paper Studio, Diary, Question Bank, Connect runtime app changes. Existing clean branch/worktrees preserved.

## Evidence actually executed during this continuation
- Integrated signed DB catalog, 503 classification and blue/green role-binding synthetic regressions: **29/29 PASS**, no skips after fixture correction. Separate initial 28-suite had one stale 77-policy fixture failure (not counted green); repaired exactly.
- Synthetic Express/JWT teacher Marks Save, tenant/subject/school scoping, savedCount, idempotence, zero/null/absent and revision guards + other scoped marks suites: **22/22 PASS**, includes a fail-before grade `C` and PASS-after NULL grade.
- Frontend Marks Save 401 non-logout regression: **5/5 PASS**.
- Locked dependency install + clean Vite build: **PASS**, compiled `dist/index.html` SHA256 `db0ef46c9922c049f0b150a1a2b00323c15c67967483cd02ccdafa48d0134237` equals previously reviewed Paper candidate (frontend source unchanged).
- Explicit built Marks Register + Diary controller static checks: **13 PASS / 1 live-only intentionally SKIPPED / zero FAIL**. Supplemental Marks/Diary source tests **8/8 PASS**.
- Protected original templates: **6 unchanged PASS**.
- A separate broad test that genuinely requires a database session failed because the new isolated worktree has no valid isolated DB login (SASL client password not string). It is **BLOCKED / NOT PASS**, not a production verdict. No production database credentials were copied into QA.

## Live read-only facts and data preservation
Actual running app frontend release metadata `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`, backend metadata `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`; narrow live Marks POST 5093 runs separate `f0f87e1b1f136020f67995fb9c880cbc8635bc50`. Nginx marks map SHA256 `9ad70bc982cabe8bd29448a775111caee54e55c1e7d2a784b236982d181526cd`; route POST 5093 and /health HTTP200. Root-only recovery script under `/root/assps-release-evidence/marks-save-p0-20261016` remains available. No deploy/reload/restart performed by this integration.

Live PostgreSQL read-only verified `exam_results` 1,763 rows /213 actual numeric zeros/0 NULL. School1 Class One First Term 152 existing rows (38 each English, Islamiyat, Mathematics, Science), genuine zeros 2/1/1/2, left unchanged. School1 currently has six grade_settings rows; simulated missing-band defect is relevant for school configurations with zero grade policy rows. Public RLS has 83 FORCE including separate movement audit; signed Marks guarded scope explicitly excludes the separate audit table, yielding correct **82 FORCE guarded, 77 restrictive core and five separately exact academic approvals**. Never disable RLS or inflate counts to 83.

## Genuine release hold and next action
This is **SOURCE-ONLY, NO PROD CUTOVER**. No successful real authenticated principal/teacher Marks Save `success:true/savedCount/GET` on missing Class One rows; failed POST payload has not been recovered; do not fabricate or overwrite records. Frontend source has non-logout 401 protection but is not public. Full independent Core production security gate last **6/13 HOLD**: complete approved ACL backup, independent current offhost recovery, signed persistent worker transport, exact reviewed adapter actually deployed, separate authenticated persistent worker, effective inherited grants independent witness, real authorized School2 + unassigned-subject independent signed denial. Require backup, rollback, genuine staff acceptance, printed Urdu Diary witness, protected module regression and source/digest checks before platform promotion. Synthetic test proof is not independent live certification.

All evidence/logs for this continuation are root-private in `/root/assps-release-evidence/core-marks503-unified-20261016`; no student identities, real login tokens or secrets committed.
