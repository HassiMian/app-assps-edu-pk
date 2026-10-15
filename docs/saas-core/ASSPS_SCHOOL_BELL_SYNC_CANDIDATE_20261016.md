# ASSPS School Bell Timetable — Isolated Candidate (16 Oct 2026)

Status: CANDIDATE ONLY; NOT DEPLOYED. School ID 1 only. Effective 2026-10-16.
Source: Principal's corrected weekday + Friday timings, as confirmed in conversation.
This is a school-wide bell schedule and does not redefine class/teacher allocations.

Regular Mon-Thu/Sat: Assembly 08:30-08:45; P1 08:45-09:25; P2 09:25-09:55;
P3 09:55-10:25; P4 10:25-10:55; P5 10:55-11:25; P6 11:25-11:55;
Break 11:55-12:20; P7 12:20-12:50; P8 12:50-13:30.

Friday: Assembly 08:30-08:45; P1 08:45-09:20; P2 09:20-09:50;
P3 09:50-10:15; P4 10:15-10:40; P5 10:40-11:05;
P6 11:05-11:30; P7 11:30-12:00; P8 12:00-12:30; NO BREAK.

Code: immutable tenant-scoped schoolBellSchedule source; new authenticated
GET /api/timetable/bell-schedule; new Student Portal "Timetable" tab and
Timetable Manager shared-times panel. Historical timetable rows are untouched.
Timetable Manager's existing subject/teacher assignments remain local UI state;
they are not yet certified as persisted production academic assignments.

Existing live DB preflight: school1 has 58 Regular 2026-27 historical rows:
seven class/section rosters x 8 periods plus school-wide assembly/break;
there is no saved Friday roster, and no reliable subject allocations for
all school classes. The historical signed reference endpoint filters previous
source hashes and must not silently be rewritten to claim the new schedule
was on the historical 14 Oct photograph.

APEX Connect / Super App currently calls GET /api/portal/timetable; that API
reads teacher-specific timetable rows and separate online lessons. It does not
yet consume the new bell schedule. Exact CASC named pipeline was not found in
this repository; no CASC synchronization has been certified.

Pre-publish gates:
1. Verify today's canonical Core+Connect source heads and actual runtime artifacts.
2. Read-only inventory, signed backup and restore exercise, and unchanged results,
   marks, Diary controllers, existing papers, student data and RLS invariants.
3. Authenticate independent principal/teacher/student actors; verify school1
   permitted reading, peer-school denial, and service scope fail-closed.
4. Wire APEX Connect's existing /api/portal/timetable response and consuming
   teacher and other Super App views to the new versioned bell schedule.
5. Ensure historical roster remains read-only while official per-class subject
   scheduling is reviewed. No guessing Friday subjects or missing class rosters.
6. Verify save/reopen/print, both days, timezone and 8 periods on actual browser.
7. Execute Core certified CI/CD/CASC release only after its real identity,
   restricted worker, audit, rollback and security gates pass.
8. Confirm live student IDs + Super App + manager all report identical version.
Rollback must revert only this candidate; no DB student, marks, result, paper,
or Diary mutation is authorized by these changes.
