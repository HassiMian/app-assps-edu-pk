# ASSPS Unified SaaS Core — Lesson / Timetable / Notice reconciliation
19 October 2026 PKT. SOURCE QA ONLY, production release remains HOLD.

## Ancestry / workstream protection
- Base exactly 377fbf4beca55ba0368d5c2749920933e61b6917, descendant of protected Lesson integration 825f2a4f077a9b2e4ab62ee1e2db7144e7b157f2.
- Reconciled newer Core timetable-write protected branch 0c9b7063811571ec4224951a1fd09247930159f8 onto NEW isolated worktree integration/core-lesson-timetable-guards-20261019 without modifying the original other agent's clean worktree or any Paper Studio/Academic/Connect worktree.
- Transferred 9 reviewed files by byte-for-byte comparison: guarded Timetable GET/POST, write-guard engine/test, staff-private Notice route/contract/test, PDF source verifier and two handoffs. Existing isolated Core Timetable/Notice draft/academic/RLS/lesson modules preserved.
- Corrected default School1 exclusion of legacy Regular records in Timetable GET to use trusted currentSchoolId(req), not only Number(req.school_id), preventing historical weekday misinterpretation if teacher's signed claim supplies the school id.

## Security functionality
- Protected timetable POST requires real manager school/actor, eight correct day slots, secure tenant override denial, server-held independently approved source SHA, mapped staff identity, matching current snapshot and serializable transaction rollback. Server source attestation flags are OFF by default. Current public Nginx /api/timetable/save remains safely blocked HTTP403 on api/app/www/apex domains.
- New Notice source has confidential HR recipient/private visibility and acknowledgment enforcement, plus existing school templates. Actual production documents not modified.
- Peer official PDF checker: live 336 of 336 teaching slots exist, 0 missing; 336 still contain older Oct14 hash, six display title discrepancies and twelve Four+Five combined classroom overlaps; strict read-only verdict HOLD, no DB source rewriting.
- School1 0 real teacher-class assignments, 59 academic source groups BLOCKED with zero signatures; no auto-publication or synthetic assignment grants.

## Tests / evidence
- Selected integrated backend Node security tests 136/136 PASS. Separate timetable write/reference after trusted context adjustment 18/18 PASS. Python Lesson readiness 23/23 PASS; ingress protection 3/3 PASS.
- Current source frontend Vite production build 2580 modules transformed PASS. Isolated dist-reconciled-core-20261019 index SHA256 228415e01b06808cd7accb2c8485436afcb5a635c27115fcefbafff88041036b, NOT live served root.
- Node syntax checks, production-safety-check, git diff whitespace all PASS. Mocks and isolated builds are NOT live Principal/Teacher/School2 authentication evidence.
- Live document-RLS restricted role missing context sees record-count 18/46/45. Six-policy QA-only hardening exercised in disposable PostgreSQL; no live migration or signed runtime acceptance proof.
- Backups 4/4 local SHA PASS, no independently verified off-host two-cluster restore; full local restore trial timed out and temporary QA clone was stopped/cleaned.
- Live frontend index SHA256 8216276411fce912309767361e0f23e8a445106aa3b5eefe629c3ed0fceb2958, live current backend timetable route SHA256 4142fc54c39eec39e5fea470d452d6efdf54c862d14b4d2292d18bb7538457ce. Oct8 release-meta SHAs are stale; no full running component ancestry certification.
- Current observed global school data 322 students, 1854 results, 405 timetable rows, 39 diaries, 3 lesson plans, 0 teacher-class assignment rows. No data writes, PM2 restarts, release artifact replacement or academic grant by this reconciler.
- Windows/Antigravity standby. Prompt and Windows queue existence are not actual agent execution acknowledgment.

## Final gates before any full release
1. Reconcile latest live component binaries/ancestry and no agent conflicts; guarded frontend/backend release candidate and protected template tests.
2. Correct signed-RLS catalog/roles and prove live-representative two-school document, Notice, Principal/Teacher SQL/HTTP access through disposable clones. Backup full protected DB and restore both PG clusters to independent approved offhost custody.
3. Verify school-specific 54 assignment proposals, Four/Five classroom overlap proof, teacher employee links, official Oct16 PDF provenance/actor authorization before any teacher access grant.
4. Paper Studio/Grade IX-X academic signoffs for 59 blocked lesson source records. Genuine live Principal/Teacher/School2 Login -> Save -> Reopen -> PDF/Urdu A4 Ricoh certification.
5. Prepare independent frontend/backend rollback proof, then release; current Nginx timetable write 403 cannot be removed until replacement endpoint is actually safe and live.

Verdict SOURCE_CANDIDATE_QA_PASS / PRODUCTION_RELEASE_HOLD.
