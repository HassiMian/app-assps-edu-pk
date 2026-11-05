A208 review-only academic catalog completeness and Marks Entry safety.
Live evidence: School1, 13 active class-sections, 329 students, 54 verified subject candidates, 7 covered and 6 missing cohorts with 220 students.
Stage gate: 409 ASSESSMENT_COHORT_COVERAGE_INCOMPLETE before SQL inserts; no production code deployed.
Frontend: read-only Principal catalog preview; authenticated GET only; fails closed without coverage fields.
Marks Entry: Assessments with no approved subject offerings cannot offer unrelated school subjects.
Tests: backend source 16/16; browser 2/2; marks selected regression 22/22; isolated frontend Vite build PASS.
Principal human approval, DB RLS ownership remediation, source provenance, off-host restore and disk headroom still BLOCKED.
Production decision: HOLD. No production writes or deployments.
