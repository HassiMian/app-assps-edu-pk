# ASSPS historical marks revision ledger — identity provenance hardening (review only)

This is source code for isolated review, **not** an approval of any real historical marks change, Principal identity, live authorization or signed production release.

Core ancestry: `93764c3d` unified Paper + Class Eight policy source review candidate. The existing additive migration `034_exam_marks_revision_history.js` is extended to enforce both (1) exact school, examination result, exam ID, student ID and subject identity, and (2) same-school audit actor references. An active Principal/Owner-only `BEFORE INSERT` trigger rejects teacher, inactive and demoted actors. No existing marks are updated; audit entries remain immutable. Fail-closed FKs prevent misleading audit rows.

**Caveat**: DB-level role eligibility alone does not prove authenticated human actor session or individual Principal ratification. Application service independently verifies actual active role and school, and a trusted session/user binding is still a separate release gate. Owner role requires its existing guarded schema migration. Neither a new Owner nor Principal has been provisioned. This patch cannot be promoted before code-owner review, independent backup, migration lock/rollback and real role/School2 acceptance.

Verification: `bash /root/workspace/assps-mission-continuity/observations/run_assps_unified_ledger_identity_source_20261028.sh` from a secure VPS; uses a disposable PG16 cluster with TCP disabled and 10 synthetic cases. Unit suite `node --test al-siddique-backend/src/tests/exam-marks-revision-migration.test.js al-siddique-backend/src/tests/exam-marks-principal-audited-revision.test.js ...` also covers no-mutation and fail-closed migration conditions.

**No production migration, marks adjustment, grant, account upgrade or historical ratification executed.**
