# ASSPS Institutional Printer & Academic Acceptance Registry — 15 October 2026

**Purpose:** Prevent agents and future deployment reports from repeatedly treating already acknowledged school-owner checkpoints as unaccepted. This is a record of a real user statement and existing system evidence, **not** a manufactured signature, printer receipt, or academic review event. Applies across SaaS Core, Paper Studio, Result Cards, Grade IX–X Academic Master and APEX Connect.

## Printer acceptance — carried-forward baseline

- **Primary school printer:** `RICOH MP C307` (Windows `USB001`, `PCL6 V4 Driver for Universal Print`).
- **Occasional alternate:** `Samsung M2070 Series` (Windows `USB002`, Samsung M2070 Series Class Driver).
- **School operator's direct acceptance:** On 10 October 2026, the operator confirmed an actual physical A4 page from the Ricoh; reiterated on 15 October that physical printing has already been performed repeatedly and **explicitly accepts the Ricoh as the school's established primary physical printer**. Accept this existing hardware baseline without further repetitive signoffs.
- **Fresh Windows read-only checks:** 15 October 2026 both installed and `PrinterStatus=Normal`, `WorkOffline=False`, Spooler Running/Automatic, queue count 0/0. Operational PrintService log is **disabled**; inability to retrieve event 307 is **not** evidence a prior physical job was never completed.
- **Software output compatibility:** Result Cards V3 separate synthetic Chrome 302-result-card PDF stress test produced exactly 302 A4 pages; nine older plus the Scholars Archive tenth premium design passed eight-subject, layout and A4 no-overflow tests. This is not a printer paper-exit confirmation for every new document revision.
- **Release reporting:** Hardware printer setup/basic physical A4 baseline = **ACCEPTED, REUSABLE**. Printer must not be kept on all day for agent acceptance. Send a new physical check only if specific hardware malfunction/driver change/new print layout defect is observed, not every web release.
- Neither an invented current print job nor a false real-school result-card ink/color/Urdu print test is claimed. Actual job-specific print output remains separately observable when users print naturally.

## School-owner academic acceptance vs revision-specific publication

- **School owner / Principal expressly states** (15 Oct 2026): institutional academic publication approval was already granted before this turn and does not need to be requested again as a generic release check. Treat this as the **owner's statement/authorization acknowledged**, without recurring approval requests.
- **Existing school database truth must not be rewritten:** At read-only inspection on 15 Oct, First Term school=1 exam=9 has 81 `exam_subjects` rows with `approval_status=pending`; `approved_by_user_id` and `approved_at` are absent; 0 `school_academic_approval_events` for that exam. This means the *specific revision-level protected academic approval workflow* has not been recorded in that database, **not** that the owner has failed to approve overall school use. Do not infer a signed teacher, a signed approval revision, or a correct page source from a chat-level statement.
- The Grade IX–X Question Bank's independent qualified subject/content review is another domain and must not be auto-marked approved: earlier candidate batches were intentionally unapproved and require their own real revision-evidenced faculty decisions. Do not conflate them with the owner's school publication acceptance or Result Card V3 engineering acceptance.
- **Release reporting:** Institutional owner acceptance = **ACKNOWLEDGED, DO NOT RE-REQUEST**. Question-specific independent signed status and protected subject configuration status are separate database records, not blanket release blockers for already deployed static frontend Result Cards. Where school wishes formal recorded approvals, use existing authenticated `POST /api/.../exam-subjects/:id/approve` principal-authorized route with exact revision and matching subject maxima; do not directly UPDATE status or impersonate an account.
- Result Cards V3 keeps its truthful `DRAFT` / `AWAITING ACADEMIC APPROVAL` labeling for individual incomplete or unsigned records until actual matching revision evidence exists. Institutional owner acceptance alone does not authorize removing those warnings or inventing marks.
- **Original data unchanged:** 1,763 saved marks across 2 school tenants, including 213 genuine numerical zeros, no new printer dispatch, no DB mutation or signoff creation.

## Future operator expectation

User should not be asked to keep either printer physically on for ongoing sign-off. Subsequent release checklists should carry forward printer hardware acceptance and owner-level institutional academic acknowledgment. Verify only *new* defects or security and correctness gates requiring separate evidence, and state exact scope without re-opening previously accepted milestones.
