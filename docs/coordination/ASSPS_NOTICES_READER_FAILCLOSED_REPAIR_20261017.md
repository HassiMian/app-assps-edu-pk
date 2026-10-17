# ASSPS legacy Notices reader-access isolation — source-only repair

Date: 2026-10-17 PKT. Base: `integration/assps-core742-notice-diary-unified-20261017@c303edc05f7a90050838c8bf5ec358831b1b5c63`.

## Problem and contained repair

The legacy GET `/api/notices` selected all rows within an authenticated school and had no effective recipient/teacher audience filter. A signed-in school teacher could potentially read notices not addressed to them. The legacy table contained 0 rows at the read-only audit, which cannot guarantee safety after records are added.

Until authoritative recipient-to-teacher identity linkage and a separately authenticated School2/unauthorized-subject negative test exist, require existing management roles for this GET (`super_admin`, `admin`, `school_admin`, `principal`). The existing school ID SQL boundary and service-scope check are retained. Teacher and service requests fail closed (HTTP 403), including otherwise scoped service reads, rather than receiving an unbounded list. The functionality cost is intentional: teacher notice inbox requires a verified audience-filter contract and explicit follow-on review. No notice POST/PUT/DELETE logic, DB/RLS/grants, subject setup, marks, paper, print or deployed service changed.

## Actual source QA

- Native isolated tests `node --test al-siddique-backend/src/tests/notices-principal-issuer-tenant-isolated.test.cjs ops/tests/notices-read-audience-source-20261017.test.cjs`: 26/26 PASS, 0 fail/skip.
- `node ops/notices/verify-notice-audience-source-20261017.cjs`: `SOURCE_GUARD_PRESENT_NOT_LIVE_CERTIFIED`, `production_release_authorized:false`, `school2_authenticated:false`.
- `npm run production:safety`: PASS.
- `git diff --check` and `node --check al-siddique-backend/src/routes/noticesRoutes.js`: PASS.
- Read-only live SQL at October 17: `exam_results` 1801 rows, 213 numeric zero marks, 0 NULL marks; `notices` 0 rows.

## Release gates still CLOSED

These are synthetic source and mocked Express regression tests, not real teacher login or production policy verification. No teacher audience certification, independent authenticated School2 denial, production grant/RLS audit, offsite backup ownership restore, signed worker transport, actual teacher Diary Save→Reopen→Print, physical Urdu A4 witness, approved academic source or controlled rollback certificate. Last independently signed overall Core gate was 6/13 HOLD. **Do not deploy or merge into production based on this patch or a green CI alone.**

The dedicated Notice Audience CI workflow is updated to assert the protected administrative GET source while requiring `production_release_authorized:false` and `school2_authenticated:false`. A green source HOLD gate must never be interpreted as teacher audience functionality or authenticated release authorization.
