# ASSPS Paper G42 — Legacy Paper Vault Strict CAS

Date: 2026-10-07

The active Connect/SaaS paper clients no longer call `/api/paper/vault`. The legacy backend compatibility routes remain temporarily for historical tests and older clients, but mutations are now fail-closed:

- PATCH `/api/paper/vault/:id` requires `expectedRevision`; missing precondition returns 428.
- DELETE `/api/paper/vault/:id` requires `expectedRevision`; missing precondition returns 428.
- Stale PATCH/DELETE return 409 `REVISION_CONFLICT`.
- DELETE obtains a row lock and verifies revision before soft delete in one transaction.
- Portal Paper Studio routes are unchanged and remain the active authority.

Evidence: focused legacy vault CAS 11/11 PASS; strict revision 9/9 PASS; delivery manifest 8/8 PASS on disposable cloned DB/backend. The global 133-test harness currently contains unrelated auth-throttle/evidence-pin baseline failures and is not used to waive these focused gates.
