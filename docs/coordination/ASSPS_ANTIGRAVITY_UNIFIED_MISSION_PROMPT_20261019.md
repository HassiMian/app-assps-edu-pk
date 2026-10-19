# Antigravity / Desktop Operator — ASSPS Unified Mission Delegation
19 October 2026 PKT. This is an EXECUTION BRIEF, not an unconditional production deploy order.

You are an isolated subordinate to ASSPS SaaS Core Production Master. Owner authorizes autonomous QA and reviewed source implementation, but school data integrity, documented academic approval, cross-tenant confidentiality and rollbacks cannot be bypassed.

## Authoritative context
- GitHub repo: https://github.com/HassiMian/app-assps-edu-pk
- Coordination: https://github.com/HassiMian/app-assps-edu-pk/issues/4 and issues #1–3.
- Core integration ancestor 825f2a4f077a9b2e4ab62ee1e2db7144e7b157f2.
- Staged integrated Core/Timetable/RLS source: branch fix/core-unified-release-gates-20261019. Fetch and VERIFY remote head; do not assume a copied SHA is the newest.
- Handoff/governance: docs/coordination/SAAS_CORE_MASTER_HANDOFF.md and CHAT_CONSOLIDATION_AND_AGENT_GOVERNANCE_20261008.md on coord/assps-four-stream-consolidation-20261008.
- Paper Studio owns LessonPlanDocument, Diary and print; Academic Master approves content; Core owns backend/auth/tenants/RLS/deploy; Connect consumes scoped APIs. Respect dirty worktrees.

## Mission assignment
1. Inspect actual Windows/Antigravity workspace, authorized branches, local services and other active agents. No older-production overwrite.
2. Implement Principal-only timetable draft Save, Reopen, Print Chromium+Express tests: School2/Teacher denial, full 8 periods, six days, Friday bell times, Regular-vs-weekday duplicate isolation. Use only synthetic fixtures. Temporary Nginx P0 currently denies unsafe POST /api/timetable/save on all ingress; do NOT restore endpoint before replacement certification.
3. Test genuine login and mandatory first-password-change; verified teacher/class/subject binding; Paper Studio/Diary/Lesson Save, Reopen, Urdu Jameel Noori A4, revisions and concurrency.
4. Reconcile approved Oct16 PDF SHA256 9ac81002d2bc67cc748ece72b637c6cc081c8e1f23d1551d594031deea7e70c4 with six-day timetable (56 teaching slots/day) and current rows citing older Oct14 source. Twelve simultaneous staff pairs are Four/Five English P5 and Four/Five Nazra P8; confirm combined classroom authority rather than deleting rows.
5. On disposable PostgreSQL check restricted runtime role RLS, especially school_documents, school_document_events and school_document_revisions. Actual unscoped apex_app_runtime reads row counts 18/46/45 without tenant context. QA-only migration changes both tenant_fallback and app_runtime policies and prohibits live PG ports 5432/55432. Test complete doc/Notice workflows, RLS tenant denial and versioned rollback before any production proposal.
6. Test encrypted two-cluster offsite backup decrypt/restore at owner-authorized independent destination. Never upload unencrypted school records to arbitrary cloud. Never delete critical backups.
7. Reconcile frontend/backend live builds independently. Current active Nginx frontend HTML SHA256 8216276411fce912309767361e0f23e8a445106aa3b5eefe629c3ed0fceb2958; old release-meta is stale; live public branding 404. Preserve newer live artifacts.
8. Return a clean PR from isolated source, exact SHAs, tests and screenshots/PDF hashes, redacted logs, role/RLS/print and rollback evidence, and update Issue #4. Do not deploy across a failing release gate.

## Rules
Never modify other agents' dirty trees, official papers, historical migrations, databases or student records. No force push, credential export, weak RLS, fabricated academic signatures, blind teacher grants, or claims that mock tests mean live acceptance. Queue acknowledgment is not proof of actual Antigravity execution; as of last check Windows workstation is STANDBY.
