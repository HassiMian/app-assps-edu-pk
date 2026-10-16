# ASSPS Notice Studio / Period Timings — Candidate Release Hold
Date: 16 Oct 2026. Not live. No data migrations have been executed.
Source branch: feat/school-document-studio-architecture-20261016

## Completed in isolated code
- Confirmed academic timetable allocations ≠ school-wide bell timings.
- Added separate Period Timings navigation, studio and student-facing timings tab.
- Notice Studio with 10 document kinds, 18 purpose presets, 4 premium styles,
  school-specific official logo from existing TenantBrandingContext, edit/preview,
  imported bell, academic class roster and general class date sheet (no student PII),
  A4 browser print and draft watermark.
- New document API design backed by ADDITIVE school_documents, document events
  and append-only revisions with signed Core school RLS (migration staged, not run).
- Draft version conflict/approval transitions, separation-of-duties and
  school context gates; source-controlled school1 bell data.
- Date sheet and academic roster publication are deliberately held until server
  independently reattests their imported source, even if staff approve.
- Historical 58 timetable rows and existing notice records untouched.
- Existing /api/notices legacy API remains separately accessible in source.
  Must reconcile teacher write privileges and publish status before shipping.

## Known cross-app branding discrepancy
Read-only SQL established schools.logo_url == settings.school_logo for school1.
APEX Connect tenant_branding.logo_url is nonblank but not equal and is relative
while Core school's logo URL is absolute. Separate isolated Connect worktree
feat/connect-canonical-school-logo-20261016 at commit d78659b uses school-bound
s.logo_url before tb.logo_url; TypeScript check passed. NO LIVE CONNECT CHANGE.

## Must pass before the next release is described as production-ready
1. Confirm canonical latest Core and Connect commits and reproducible artifact provenance.
2. Restore rehearsal and signed backup receipts for Core and Connect; validate
   exam marks/results including 0-vs-blank, saved papers, Diary controllers and branding.
3. Run additive SQL migration on disposable QA database with signed RLS; exercise
   anonymous, teacher, principal, peer-school and service-token denial cases.
4. Test Notice Studio document save/reopen/edit/version conflict, submit, different
   approver, approved status, publish, immutable signed print and events.
5. Close legacy /api/notices bypass or route legacy rows through approved
   migration. Preserve any existing legacy notice records.
6. For class-general date sheets and timetable source links, re-query source at
   publication with tenant/class/section/session/term restrictions, snapshot a
   source digest, and deny mismatches. Print no personal student identifiers.
7. Check actual Playwright A4 preview/print/PDF for no clipping and correct
   English/Urdu fonts, signature blank, logo loaded, all document variants.
8. Establish canonical SaaS school-logo version/API for Connect, secure cache
   invalidation, actual signed login and peer-school tenant rejection.
9. Map and verify CASC/CI/CD provenance (no exact CASC pipeline found in source),
   execute only verified blue-green rollout and rollback.
10. Confirm live Period Timings, Notice Studio, Connect teacher/student,
    date-sheet general print and both academic subject timetable views
    show correct school-bound data. No incorrect cross-school branding.
