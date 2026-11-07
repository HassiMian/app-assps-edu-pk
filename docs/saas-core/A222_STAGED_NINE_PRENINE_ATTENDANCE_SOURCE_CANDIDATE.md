# A222 — Staged Nine / Pre Nine Attendance source reconciliation

**Not compiled, not published, not Principal accepted, not a production release.**

This additive review patch is based on the updated main branch and the independently reviewed A222 audit gate. A direct A213 source cherry-pick was attempted and failed with five conflict blocks in two attendance components plus one deleted historical exam-browser test conflict. That attempted merge was reverted in its isolated worktree. This replacement patch **selectively** retains current component structure and visual controls while forward-porting the identity guards.

## Source changes

- Exact academic class identifiers in both AttendanceModule and MarkAttendance, with no implicit Pre Nine to Nine API alias or fallback of Nine sections to Pre Nine.
- New attendanceRosterGuard function copied from A213 candidate, allowing only students matching the exact class + section; cross-class marks are never promoted into the loaded attendance map.
- Asynchronous class list initialization, valid configured section checks, latest-request serial and selected-scope reference checks so stale responses cannot overwrite a changed class/date.
- Explicit saved scope matching before writing attendance. No default to "present" on unseen or unmarked students. The MarkAttendance UI now shows unmarked students as "unmarked", without generating an automatic present mark.
- Preserved existing dashboard, chart, color, date and save event components rather than wholesale replacing older UI modules.

## Tests

The staged source contract tests and the A213 roster guard unit tests are Node-only and do not require a full frontend build or production login. **They do not prove that the JSX modules compile in the exact latest production frontend bundle, that authenticated users can reach the UI or that server writes are tenant-isolated.**

Do not run an additional production-style frontend build at root free disk below 16 GiB. The required production workflow is:

1. Obtain Core authorization and independent offhost full database/role/password/ACL recovery.
2. Restore an adequate free disk reserve and verify rollback artifacts; build from the canonical main ancestry with all lesson planning, diary and paper/print contracts.
3. Run all browser, role, server scope and authorized attendance write/rollback tests. Confirm Nine Fatima (6 as of A222), Nine Usman (9), Pre Nine Blue (12) as distinct scopes.
4. Validate actual published boot/index/module import graph and all four entry branches; do not publish only a test harness.
5. Preserve First Term 1854-row historical digest and issue a Core-signed rollback-ready release certificate.

This worktree is a proposal for follow-on review. No tool in this patch performs a production deploy, database write, archive cleanup or financial action.

## Additional backend audit-attribution safety patch

The bulk attendance POST handler accepted a client-controlled marked_by field and preferred it over the authenticated request user's ID. This creates a potential audit-trail spoofing path even when tenant membership for students is separately checked.

The review-only A222 backend patch now ignores the client-controlled field for bulk saves and derives the marker exclusively from the authenticated middleware user. Missing or invalid user identity is rejected HTTP 403 after rolling back the transaction. Focused Node tests cover spoofed marker fields, invalid IDs, integer overflow and edge cases.

Existing DB integration tests use destructive fixtures and must NOT run against the live school database. Only SaaS Core may run integration tests against a separately restored isolated DB and verify legitimate staff writes plus cross-school/role negative cases. No production backend process was restarted or replaced.
