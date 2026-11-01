# ASSPS Marks Handler: Production Reliability Guard

Live on the current VPS backend: 2026-11-01.
The production POST /api/exams/results handler:
- rejects absent/JSON-null request bodies as HTTP 400;
- caps one request at 5000 mark rows, preventing accidental resource exhaustion;
- no longer logs the signed-in staff ID and submitted mark count on every write;
- reports a controlled HTTP 503 when the database pool cannot connect.

Regression evidence: 7 additional focused tests PASS and 131 full combined
backend/security tests PASS. Live school result integrity digest was unchanged
before and after the deployment. No historical results or academic approvals
were modified.

CAUTION: The canonical GitHub backend route is 315 lines while the deployed
backend route is 752 lines. This folder deliberately stores an isolated
review-only exact live source snapshot; it must NOT be blindly dropped into
older canonical app infrastructure or merged into main without full integration
and authenticated Principal/Teacher acceptance.

The official academic release remains HOLD because Assessment 1-4 have no
approved subject offerings and Assessment 5 has not been officially created.
