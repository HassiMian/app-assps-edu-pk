# ASSPS — 1 November 2026 signed staging / ingress review

Release posture: HOLD for full academic certification.

## Operational changes
- app.assps.edu.pk now exposes eleven narrowly whitelisted academic GET paths through the authenticated Core backend. The existing signed POST prefix remains routed to the separate Green service on 5094.
- Signed service registers POST /api/academic-approvals/assessment-catalog/:examId/stage requiring genuine active Principal/Admin Bearer authentication, source SHA-256, reference and explicit verification declaration.
- Stage creates PENDING subject offerings with per-offering audit; it does not authorize marks entry or approve a subject.
- Manage Exams UI v8 presents explicit source reference, SHA-256 and human confirmation. No official textbook source data was invented.

## Verification
- Public anonymous academic GETs: HTTP 401. Unlisted academic GET: HTTP 403.
- Public signed POST staging without authentication: HTTP 401; no data mutation.
- Stage mock tests: 6/6; read-only source comparison: 54 reviewed candidates for each Assessment 1–4.
- Frontend source validation: 5/5.
- Production npm audit --omit=dev: zero findings.
- First Term: 1,854 marks records, 213 true zeros, 0 NULL; ordered digest e1f389a2863752c838a51ddb3a9c4549.

## Certification remains HOLD
- 220 active students have no reviewed teacher coverage.
- 97 historical grade labels require official authorized reconciliation.
- Original Lesson Planning pages/academic approval are absent.
- Full live Principal/Teacher acceptance and exact Times New Roman PDF embedding are not signed off.
- No real Principal session or synthetic production approvals were created; November vouchers untouched.

## Release discipline
Review signed RLS and evidence scope in isolated restore; then source review, explicit authorized acceptance, and only then certified cutover. This is a source handoff, not production certification. The frontend JS is a generated asset: port to canonical JSX before normal build.
