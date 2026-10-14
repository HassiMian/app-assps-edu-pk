# ASSPS Live Exam9 Marks — High-Sensitivity Read-Only Audit (14 October 2026)

Scope: school 1, exam ID 9 (NOT Grade Nine). SaaS Core owns official marks, RLS, production approvals and release; APEX Connect owns authorized teacher-facing presentation. This audit does not modify any existing mark, user or teacher assignment.

## Actual PostgreSQL read-only results

Under REPEATABLE READ / READ ONLY transactions on production apexos port5432:
- 1,762 saved real score rows; 213 genuine numeric-zero entries.
- 0 invalid numeric bounds; 0 duplicate student-subject score rows.
- Original 301 saved results including 36 genuine zero scores remain exactly hash-intact, original digest bcdc098a3e6cabb6f4c31736b14e39b9.
- 318 currently active school1 pupils.
- No Class Nine First Term under this exam ID.

## Coverage by current active roster versus active exam offerings

Reproducible script: ops/release/exam9-status-20261013/verify_exam9_active_roster_coverage_20261014.py.
It emits aggregate class/section/subject counts, no individual pupil IDs/names and never issues writes. The integrated Core release preflight now consumes it and refuses full release readiness while there are unreviewed gaps, unmatched saved marks, score-bound anomalies, or original baseline checksum drift.

Eleven currently active offerings have no saved results:
- Eight Blue: Science 0/11; Quran/Nazra 0/11.
- Five Blue: Quran/Nazra 0/23.
- Four Blue: Quran/Nazra 0/17.
- Mover Purple: General Knowledge Oral 0/42.
- One Yellow: Urdu 0/38; Quran/Nazra 0/38.
- Seven Blue: Quran/Nazra 0/22.
- Six Blue: Quran/Nazra 0/20.
- Three Red: Quran/Nazra 0/29.
- Two Orange: Quran/Nazra 0/31.

Two partial offerings: Six Blue English 19/20; Six Blue Mathematics 19/20.

One score unlinked to current active exam offering: Mover Purple Computer 1. DO NOT delete or change that real existing score automatically.

Total unrecorded slots relative to current enrollment: 284. Many Quran/Nazra offerings could be intentionally excluded or pending; review against actual school academic requirements. A BLANK score is NOT zero. This audit uses current active enrollment, not signed exam-day enrollment, and therefore is a school-review worklist, not an official absent/fail determination. Historical One Blue section has zero current active enrolment; Grade Nine has no First Term exam. Neither should be fabricated into a missing/failing student list.

## Private point-in-time backup and actual isolated restore acceptance

Private root-only file (never distribute):
/root/assps-release-backups/connect-protect-live-20261014T1545Z/apexos_consistent_20261014.dump

Permissions: 0600 root:root, NOT encrypted. Size: 2,615,266 bytes.
SHA256: 927fe23dbe27b3e4d10c774895e08d4caba19c7126ad36023e6417bf0c57d276.
Archive manifest: 1,713 lines verified. PostgreSQL16 isolated QA Unix socket port55439 restored full archive with no ownership or grants; exit 0. Independent QA read-back: Exam9 count1762, zeros213, original score digest bcdc098a3e6cabb6f4c31736b14e39b9, school1 pupil records318. Hash recheck PASS. QA cluster stopped, private data directory removed. No live database restore or writes. Do not restore this historic snapshot over later ongoing genuine marks without approved Core delta-recovery protocol.

## Protected release controls

School First Term paper maxima: 0/81 approved, active official teacher classroom grants0, school actor approval events0. Five supposedly approved vault records are Monthly/Chapter assessments, not First Term. Core signed RLS green/Marks shadow guards do not certify active full production traffic. Real teacher login, in-school authorization and peer-school HTTP denial, browser OS Print Window and signed rollback remain unverified. Pinned owner release-evidence public key absent.

A school-issued, authenticated review can resolve exam offering status without falsifying old student scores. Never assign a numerical zero to an unentered score, fabricate approval/reviewer JWT, bulk update maxima from historical denominators, promote Class Eight to Pre-Nine, or claim a full school release certificate until all genuine gates pass.
