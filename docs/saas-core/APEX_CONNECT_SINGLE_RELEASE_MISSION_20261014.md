# APEX Connect / ASSPS SaaS Core — Single Release Mission, Real Evidence Contract

Coordinator: HassiMian/app-assps-edu-pk GitHub issue #4.
Owner boundary: SaaS Core owns the canonical DB, school approval/permissions, active signed RLS and final release; Connect owns Connect-specific user interface and role-aware API integration. This executable does not deploy or issue marks/policy/role writes.

## One-command production-safe audit

python3 ops/release/exam9-status-20261013/run_integrated_release_mission_20261014.py

Returns JSON and exit 2 if any actual production release evidence is missing. It runs all existing signed-approval tests, teacher scope/marks backend tests and class-header passing UI tests. Database access is read-only to current school1 exam ID 9 on apexos:5432.

With actual owner-issued receipts signed by the pinned independent key, the existing acceptance verifier can be invoked using:
python3 ops/release/exam9-status-20261013/run_integrated_release_mission_20261014.py --receipts /secure/path/to/genuine-owner-issued-bundle.json

The tool never issues signoff, creates signing keys, collects teacher passwords, resets permissions, grants tenant access, or replaces real student results. Any future READY_FOR_CORE_FINAL_RELEASE means readiness, not proof that a production cutover occurred.

## Hard gates

1. Preserve the original 301 Exam9 score rows and 36 numeric zero results exactly (original score fingerprint bcdc098a3e6cabb6f4c31736b14e39b9); preserve all later genuine uploads dynamically.
2. The exact principal/admin actor-bound signed academic approval is needed for each approved school subject maximum: current 81 school exam9 offerings are separate from historical paper marks denominators (25/50/60/75/100). Never automatically approve historic denominator evidence.
3. Actual verified school/teacher/class/section/subject access is mandatory. 43 matching timetable account reference IDs are not official reviewed permissions. Seven unresolved source names plus six provisional Nazra matches and blank Pre-Nine section are HOLD, not guessed.
4. PASS floor 40 percent, six school grade bands D40–59/F0–39. Correct fractional grade calculations from an isolated candidate without mass updating past grades or official grade policy.
5. Actual active signed production non-BYPASSRLS, authenticated in-scope positive AND peer-school HTTP denial must be observed. Green/Marks shadow guards 77+77 do not certify live active traffic.
6. Real signed teacher Login -> existing authorized marks View -> save only if legitimate -> Reload -> class Result Cards -> actual browser print dialog, with no fake marks and no hidden credentials.
7. Core-controlled current backup/recovery/rollback and reviewed scoped canary source/traffic cutover, with authenticated student/teacher/admin acceptance and tenant tests.
8. Preserve Class Eight Blue original eleven-student roster, 55 historic exam scores, protected promotion hold; there was NO Grade Nine exam9 First Term. Never promote class Eight prematurely or invent missing Science/Quran scores.

## Baseline from current independent live audit; reassess every run

Production school Exam9: 1,762 real scores, 213 genuine scored zeros. School official teacher assignment grants 0; approved exact paper maxima 0 of 81; institutional signed school approval event count 0. Timetable 58, 43 reference IDs, 32 correct Blue section records, 0 staff_identity_reviewed. Green restricted and Marks signed policy shadow verified, but active full-app traffic verifier says PASS_RESTRICTED_SHADOW_NOT_TRAFFIC. Browser teacher report URL anonymous HTTP302 to login, Principal approval endpoint denies anonymous. No genuine signed staff print receipt. Source tests at final run include 22 Node backend, 24 Python signed receipt/source scope, and five passing-control frontend tests; source-build PASS does not equal production release.

Result if missing identity/approval evidence: HOLD. No full academic publication based on simulated users or technical source build.

## Critical release-key finding from actual live VPS audit

At independent preflight on 14 Oct 2026, the expected pinned trusted release attestation public key at /etc/assps/release-evidence-ed25519.pub was **absent**. This is a real blocker before any genuine Ed25519 signed browser/cross-school/rollback receipt can be accepted. The public key must be provisioned from a verified, independently owned SaaS Core attestor trust anchor, with recorded source fingerprint and secure rotation/recovery procedure. Do not mint a new private key merely to pass this gate, treat ephemeral test keys as institutional production keys, or sign staff approval on behalf of real users.

The standalone shadow-only verifier deliberately reports false for active full-traffic deployment and signed-staff verification even after the production guard migrates, so the unified gate never treats that static shadow status as future live traffic authority. Real active application RLS signed-policy proof and independent owner-signed traffic/peer HTTP/real browser receipts are required by the underlying canonical release verifier. No receipts means HOLD even if synthetic fixture unit tests return success.
