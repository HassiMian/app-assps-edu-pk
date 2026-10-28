# ASSPS — Marks ledger previous-value integrity, isolated source review
Date: 2026-10-28. Status: LOCAL REVIEW ONLY, NOT RELEASED.

## Proven baseline defect
With a real disposable PostgreSQL 16 Unix-socket-only cluster, a signed synthetic Principal actor inserted an audit revision claiming `old_marks=9` although the original exam result stored `marks_obtained=0`. The prior signed-actor HMAC guard accepted it. The transaction was rolled back; no production records were accessed or modified.

## Review-only remediation
The additive marks migration now installs a restricted SECURITY DEFINER BEFORE INSERT guard that locks the matching original exam_results row, validates original total_marks, and compares the supplied old_marks/old_grade with either the last append-only revision or the untouched original score/grade. It rejects stale, fabricated, or inconsistent previous-value chains. Existing signed-actor identity binding, same-school composite identity FKs, FORCE RLS, and immutable UPDATE/DELETE guards remain. No original exam result is updated.

## Limitations
This is an isolated SQL defense-in-depth correction. It does not authenticate a real Principal, approve any of the eleven historical cases, authorize live role provisioning, prove a School2 HTTP denial, establish a safe off-host restore, or sign a production cutover. New grade calculations and formal academic source approvals are separate review gates. Requires Core owner review and migration safety approval. Synthetic fixture role, HMAC secret and data are not real school identities.
