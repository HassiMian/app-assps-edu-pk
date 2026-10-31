# ASSPS — One Unified Largest Mission, 31 October 2026

Scope: Assessment and Marks Entry; Saved Papers and Paper Studio; Lesson
Planning Certification; Final Production Audit. November vouchers are
explicitly outside this mission and must not be regenerated or changed.
The 40-minute interval is the user-requested engineering work envelope,
not proof of time elapsed or a background task.

## Assessment and Marks Entry
- Four saved Assessment exams (1–4), IDs 14–17, session 2026–2027,
  All Classes, total 20 and pass 8. Existing 1,854 marks records remain
  unchanged. No test marks or exams are saved to the live database.
- Add Exam has the school-session hydration fix, authenticated creator,
  duplicate 409 handling, and serializable, school-scoped save logic.
- Class Six / Assessment 2 / English false red warning is corrected:
  actual Academic Setup subject resolution, not empty per-exam mappings.
  Original First Term official subject gates remain protected.
- Synthetic interactive Add Exam, Marks Sheet, Marks Register, and
  fail-closed tests PASS. Real Principal/Teacher authenticated production
  Save-Reopen-Edit-Print acceptance remains NOT VERIFIED.

## Saved Papers and Paper Studio
- School has four assessment metadata rows: two genuine editable
  revisions, and two historical Print HTTP Test fixtures whose revisions
  are missing. Both genuine revision content hashes independently PASS.
- The API list now reports current_revision_available from real
  school-scoped database joins. The Saved Papers screen distinguishes
  editable from historical-only, disables editing where the actual
  revision is absent, and preserves the old metadata without inventing
  paper content.
- All server paper reopen operations now bypass generic browser GET
  cache. Every editable revision GET verifies stored document existence
  and SHA-256 before entering the editor; absent/corrupt versions return
  a safe 409 instead of a fake successful read.
- Pure, browser, syntax and build tests PASS. Paper Generator's new
  route-specific frontend was deployed without replacing the stable
  Exam, Fee and other app shells. Five Chrome route smoke checks PASS.
  Unauthenticated assessment API access is blocked with HTTP 401.
- An authorized Principal's complete Save-Reopen-Edit-Print transaction
  is not represented by these mocked browser tests.

## Lesson Planning Technical Acceptance and Academic Gate
- Original source review archive: 59 original candidates and revised
  school 1 source scope across Starter–Seven (10 classes, 57 subject
  groupings). Class One has 18 image-review weeks.
- The authoritative private source manifest explicitly says original
  source academic approval is FALSE. Do not convert this into a fake
  academic-certified release or invent page numbers.
- Class Eight has NO Second Term; Pre Nine planning held pending its
  separate original syllabus. Starter–Seven remain the current scope.
- Term and weekly planner source-model tests: 65 PASS. Separate
  browser acceptance passed term Save-Reopen-Edit-A4 PDF, weekly
  Save-Reopen and single/three-up print overflow checks.
- Four saved lesson plan drafts exist, NONE published to the portal.
  The school-wide academic certification remains HOLD because authentic
  source approval is missing; printing layout acceptance is separate.

## Production Security and Continuity
- Readiness/health HTTP 200. Nginx configuration valid. TLS certificate
  expires 14 December 2026; automatic Certbot renewal timer is enabled.
- 100 public DB tables: 90 with RLS enabled, 86 FORCE RLS. Core school
  student, exam, marks, attendance, lesson and paper data are forced.
  Ten global / support tables lack school-specific RLS; four special
  school-scoped tables have RLS without FORCE. No unsafe blanket policy
  changes were made.
- Approx 13 GB disk free on 96 GB VPS (87% used): capacity WATCH.
- A new full production PostgreSQL backup and actual isolated restore
  comparison is required for the final refreshed safety receipt.
  Independent external/offsite restore is not claimed.
- Keep exactly one GitHub review branch and consolidated report; no
  duplicate scheduled automation and no voucher changes.

## Final status rule
Component regression PASS != authenticated Principal acceptance !=
institutionally approved source-textbook page ranges. The first is
measurable and delivered; the latter two stay HOLD pending authentic
evidence. Do not claim full production certification merely because
automated tests pass.
