# ASSPS Regular Timetable Live Upload Receipt — 2026-10-14

SCOPED LIVE VIEWER DEPLOYED: https://app.assps.edu.pk/timetable/regular

Uploaded school1 reference timetable from user photograph SHA256 263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589.
Photo footer reads 2024–2025; latest user requested apply as 2026–27 Regular day. This is not a fully specified weekday/Friday schedule.
Recovered Aug23 2026 regular bells: Assembly08:00–08:15; Periods1–6 08:15–11:50; BREAK11:50–12:15 (25m); Period7 12:15–12:50; Period8 12:50–13:30.

EXACT LIVE DATA: timetable had 0 global rows, now school1 42: Four/Five/Six/Seven/Pre-Nine ×8 =40, School-wide Assembly+Break=2. All teacher_id NULL, staff_identity_reviewed false, active teacher grants0. Existing 1588 Exam9 student results/203 true zeros, fees/attendance and 77 signed FORCE-RLS tables protected. 40% grade policy untouched.

Teacher conflict detected: source photo puts Miss Isma at Period3 in Four and Six simultaneously. Class Four/Five share Miss Sumaira Period5 and Qari Imran Period8, previously described as combined class. Older ASSPS_Complete_Timetables_2026_27.docx SHA e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724 conflicts. No staff permissions issued from displayed names.

Source branch feat/core-regular-timetable-20261014, backend live isolated immutable 4496abfe3f912f3b4aa808ca14ad996223969557, port5095 PM2 assps-timetable-green-5095. Nginx routes only exact GET /api/timetable/reference to signed app and exact static /timetable/regular; other SaaS app, Paper Studio, Connect and Marks services untouched. Nginx final sha 06b5823b8fdf92ce50631e892b4a21a358036cf2c95b079e4d923c32cdd23b78. Viewer sha 222af7383aafc41e043ee92da0fa75ccfc6cf3295faee8f88f00f320d0fcd5cc.

LIVE HTTPS: viewer200; anonymous signed timetable API401; SaaS app200; Nginx syntax PASS. Initial file-permission403 automatically reverted; directory permissions safely corrected, deployed successfully. Actual scoped live rollback old API404 then re-promoted signed API401, app200 both stages; original Nginx preserved in /root/assps-release-backups/timetable-upload-20261014T0930Z.
Restored QA Pg55432 apply migration+42 rows PASS, QA-only delete42/drop added5 columns PASS; all student results preserved.
Backend HTTP focused 28/28 PASS. Chromium synthetic browser using real 42-row timetable data PASSED: 5 classes, break after P6, client print popup invocation once, no-token displays sign-in requirement. Genuine staff JWT positive retrieval remains unverified (no impersonation).
Original frontend SHA 24cbcae3 and backend SHA16ab8f34 not replaced.

FULL SCHOOL RESULTS PUBLICATION, SIGNED PRINCIPAL/TEACHER MARKS ACCEPTANCE, AND OFFICIAL TEACHER PERMISSIONS REMAIN INDEPENDENT HOLD. This is verified timetable-reference upload, not grant or academic signoff.
