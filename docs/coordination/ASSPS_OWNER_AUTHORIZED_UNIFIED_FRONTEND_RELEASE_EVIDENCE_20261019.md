# ASSPS Owner-Authorized SaaS Core Unified Release Evidence
19 October 2026 PKT. Actual frontend production cutover and exact 54 authorized teacher assignments verified. Full multi-module certification remains HOLD.

## Source and frontend
- Approved source integration/assps-unified-live-reconcile-20261019 at 8d2d231578fc2f391f2b76f87b6e763ef6b45c51, descendant of frontend/Core reconciliation 1753ad1d.
- Vite production build PASS, 2581 transformed modules, 96 shipped static files; compiled frontend index SHA256 279e5406c3c1d9fbe65f0f9572e0778ba35b2fdeb4d7d6a946642dc45fb140f7.
- Atomic Nginx app-root cutover to /var/www/assps-unified-lesson-timetable-8d2d2315-20261019; previous root /var/www/assps-timetable-notices-unified-20261019 preserved, previous index SHA256 8216276411fce912309767361e0f23e8a445106aa3b5eefe629c3ed0fceb2958.
- Live served index SHA exact match to candidate. HTTPS public app root and login HTTP200, backend API health HTTP200, branding HTTP200; deployed Chromium login HTTP200, two visible input fields and zero JS/asset errors.
- Actual public API /api/ is NOT HTTP200 (redirect or 404 depending host). Backend full source NOT replaced/restarted by frontend cutover. Running backend exact commit ancestry not independently certified.
- P0 protective Timetable Save POST ingress HTTP403 preserved intentionally until independently tested secured backend write promotion.

## Exact teacher authorization
- School owner formally authorized 54 teacher/class/section/subject mappings, 12 genuine linked active teachers, School1 only, is_active true, source timetable_verified_20261019.
- Live rows had already been inserted at 2026-10-19 03:10:49 UTC, so none were inserted a second time.
- Private approved manifest SHA256 4674491f0fe40eabd3cde26bdfff7b83198cd51e9f8b5ac349325a8bd502a4ee. Read-only row-by-row equality over six identity/class fields: 54 matched, 0 extra, 0 missing, 0 duplicate, 0 cross-school/employee-link errors.
- Postcutover school record counts: students322, exam_results1854, genuine numeric zero marks224, diaries39, active teacher assignments54.

## Backup, rollback, offsite
- Guarded Nginx prechange configuration snapshot stored /root/secure-archive/assps-authorized-unified-frontend-cutover-20261019T0323Z.
- Corrected /root/instant_rollback_to_20261016.sh --check PASS, and newly created /root/instant_rollback_to_previous_20261019.sh --check PASS. Neither rollback was executed.
- Post-assignment 19-Oct 03:13Z systemd local dual-cluster backup 4/4 SHA256 checksums PASS, completed 03:14Z. This precedes frontend cutover; the protected Nginx configuration and staged release directory archive covers frontend changes.
- CMS AES256GCM with pinned laptop recovery public certificate encrypted latest main/signed PostgreSQL and app-config backup archives. Private VPS encrypted manifest 3/3 checksum PASS. Never transferred unencrypted records.
- Main PostgreSQL and signed PostgreSQL ciphertext copied via restricted temporary HTTPS to authorized Windows Documents/ASSPS_Encrypted_Offsite_20261019; independent Windows SHA256 byte-for-byte verification PASS for both (32021490 and 29566953 bytes).
- Encrypted app/config backup remains on VPS; its offsite transfer was not verified. Independent offhost decryption and restore were not certified.
- Temporary private HTTPS backup route was removed; Windows verified old authorized route HTTP404; Nginx tests and API health PASS. Temporary encrypted static files were moved into restricted archive rather than deleted.

## Explicit remaining HOLD gates
- Lesson publication: three saved teacher-authored plans, zero shared; 59 original academic source groups pending signed Academic/Paper Studio review; no automatic content approval.
- Approved 54 teacher assignments are real but real authenticated Principal/Teacher/School2 production Save to Reopen to Print not certified.
- Twelve Four+Five combined-class timetable clashes and six Nine/Fatima display-label variants, plus older Oct14 timetable provenance hash versus locked Oct16 PDF, remain documented.
- Force RLS for document tables has proven missing-context role denial, but signed-RLS complete actor/HMAC integration and latest renamed policy catalog attestation not certified.
- Physical Urdu Jameel Noori A4 laser printer owner acceptance pending.
- Backend current source full ancestry and protected-module live regression cannot be certified from frontend deployment alone.

VERDICT: TEACHER_54_EXACT_PASS; UNIFIED_FRONTEND_LIVE_PASS; BOTH_ENCRYPTED_DB_OFFHOST_SHA_PASS; FULL_PLATFORM_CERTIFICATION_HOLD.
