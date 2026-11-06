# A221 — Published Attendance Identity, Source Graph and Cutover Gate

**Source review only; Production HOLD. Zero live file edits, database writes, migrations, service reloads, source deletion or deployment.**

## Verified production defect

A221 captures the active Nginx document root, HTML import map, bootstrap graph and all four reachable page boot branches. Every branch contains an AttendanceModule direct-import chunk with a Nine-to-Pre Nine fallback. These unsafe attendance chunks are not covered by the safe MarkAttendance import-map overlays:

- Four active boot entries exist.
- Four MarkAttendance import-map replacements preserve Pre Nine identity in static bundle text.
- Four AttendanceModule direct assets still have unsafe Nine/Pre Nine fallbacks.
- No effective replacement AttendanceModule has been independently certified in the browser.
- No live signed Principal/teacher acceptance and no proven rollback.

Passing the isolated A213 candidate browser tests is not proof the active published source graph is safe.

## Release authority contract

The new A221 review source at ops/release/a221_attendance_publication_authority.py consumes independently measured actual published graph evidence. It refuses to equate safe MarkAttendance overlays with safe AttendanceModule imports. It blocks for any unsafe fallback, missing effective replacement module, invalid asset hashes, duplicate or absent branch, insufficient storage, missing off-host full DR, Principal and teacher acceptance, missing tenant tests, Lesson Planner build parity, rollback or SaaS Core review.

Synthetic fully-true fixtures may return **ELIGIBLE_FOR_SEPARATE_SAAS_CORE_REVIEW_ONLY**, never production deploy approval. This script is neither a deployer nor a Principal-signoff tool.

## Required SaaS Core cutover sequence

1. Secure at least 16 GiB actual free root storage and a separately tested full-data off-host PostgreSQL restore including globals, role authentication, owners, grants/ACL, RLS and rollback.
2. Reconcile current actual frontend release ancestry and other agents. Preserve protected Diary and Lesson Planner features.
3. Remove unsafe Nine-to-Pre Nine fallback in all four attendance page shells and enforce correct class, section, roster and saved-mark scope. Never use Nine records as a fallback for absent Pre Nine scope.
4. Build a reviewed production candidate and inspect actual index.html-reachable entry modules, not merely presence of stale chunks in assets.
5. Run actual authenticated Principal and teacher acceptance for Nine and Pre Nine, distinct sections, empty rosters, tenant mismatch negative probes, saved marks and reload/readback.
6. Prove exact-build Lesson Planner and Daily Diary preservation before frontend publication.
7. Publish only through SaaS Core under GitHub coordination issue #4, with source/index hashes, signed release approval and verified rollback.
8. Independently verify the **new live published graph**, not just source candidates, and archive human-approved acceptance evidence.

## Verification

    python3 -m unittest discover -s ops/release/tests -p test_a221_attendance_publication_authority.py -q

The private A221 40-minute monitor repeatedly checks the real published graph, a 36-test A221 source baseline, inherited 102 A220 source safety tests, and prior A220 certification. The committed review tests further challenge release policy and source inputs. These are not live deployment approvals.

## Other unresolved release blockers

School1 has 329 active students; 220 lack signed teacher-subject scope across Starter Blue 56, Mover Purple 42, Flyer Pink 26, One Yellow 37, Two Orange 31 and Three Red 28. Assessment 1–4 offerings/results and Assessment 5 source remain unresolved. Preserve 1,854 First Term historical results.

Original browser paper source has 58 distinct IDs (9 beyond the older 49) with seven same-ID conflicting versions. Four local DPAPI encrypted copies are not independent portable recovery or Principal-authorized editable Paper Studio import. Independent full-data off-host disaster recovery remains uncertified.

No passing unit suite can substitute for a reviewed exact-build publication, authenticated tenant acceptance and operational owner approval.
