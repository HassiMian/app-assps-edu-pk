# A222 mandatory production source reconciliation — current candidate NOT MERGE READY

**Deployment: PROHIBITED until SaaS Core completes source forward-port and signs acceptance.**

The canonical GitHub main backend route currently differs from the actual running backend at /var/www/apex-backend/src/routes/attendanceRoutes.js. A222 review candidate was based on canonical main for code inspection and deliberately was NOT merged/deployed.

The current live backend has additional safeguards that are not present in the main-based candidate:
- teacherStudentScopeClause for teacher student authorization,
- skippedInactiveIds allowing only authorized inactive school members to be skipped, rather than indiscriminate cross-tenant merges,
- persistableRecords limiting the write loop to authorized resolved students,
- actorRole-specific marker attribution.

The review candidate solves one issue in the older canonical main code by deriving marker attribution from authenticated identity only, but merging the candidate route wholesale would DROP existing live safeguards. Thus candidate's 62 Node static/guard tests cannot be taken as a production-safe complete implementation.

**Required SaaS Core action:** identify the exact provenance of the current live backend; reconcile with canonical main, then forward-port an owner-approved marker-attribution policy and the exact class/section protections onto a verified descendant that retains all live tenant, teacher and inactive-student rules. Compile and run real isolated database integration plus negative role/tenant tests; obtain authenticated Principal/teacher acceptance, independent off-host full restore, 16GiB free-space reserve and rollback. Only then use a signed Core production deployment.

Direct live operation also currently grants database/public-schema CREATE to apexos_user, contrary to a previous A220 read-only snapshot. The actor/authorization of this change is not proved. Do not treat FORCE RLS on 73 app-owned protected tables as closing the DDL-ownership risk. No runtime database grants were modified by A222.

The staged candidate branch is review-only. Never cherry-pick attendanceRoutes.js wholesale into the deployed backend.
