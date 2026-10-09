# Paper Studio Phase33 — returned Diary Save scope consistency

9 October 2026. Isolated Paper Studio owner development; production HOLD.

Base clean Paper Phase32 `d6fd8939fb42854c2f4dd7a9e1d1298cccd70e24`. API `POST/PUT /api/daily-diary` returns persisted row via `mapDiaryRow`, including class_level, diary_date and style_settings when supplied. Earlier client checked HTTP semantic success, strict positive numeric ID and PUT identity, but not persisted row's class/date/section. A mismatched persisted response could confirm the wrong selection and cache a record ID for another school-day. No observed live corruption is claimed.

One narrow frontend guard rejects conflicting returned class_level, diary_date or section when each field is provided, before saving ID to per-scope map or showing success. Date comparison accommodates backend ISO timestamp by comparing first ten characters. Response fields absent remain compatible with existing synthetic fixtures; substantive backend authenticity and tenant checks remain Core-owned.

Actual RED: new synthetic delayed HTTP200 `{success:true,data:{id:201,class_level:'7',diary_date:'2026-10-09',style_settings:{section:'Blue'}}}` after selected Class8/Blue/Oct9 then Oct10 on exact unpatched Phase32 source: browser expected scope-aware failure warning but timed out, test 0/1 PASS exit1, `/tmp/paper-p33-scope-red.log`. Exact patched source GREEN 1/1 PASS exit0, `/tmp/paper-p33-scope-green.log`. Four serial owner Diary browser tests 4/4 PASS exit0 `/tmp/paper-p33-regression.log`; new fixture ESLint PASS exit0 `/tmp/paper-p33-lint.log`; frontend build PASS exit0 3.15s `/tmp/paper-p33-build.log`.

Not run on Phase33: 43 protected First Term Chromium corpus and DOCX physical outputs. Phase32 43/43 + DOCX4/4 are historical evidence only. Real restricted-role PostgreSQL RLS, backend cross-tenant authorization, private HTTPS media, printer/A4/Nastaleeq, backup and SaaS Core release signoff are NOT certified. No DB, Nginx, production, protected original paper or Academic/Connect changes.
