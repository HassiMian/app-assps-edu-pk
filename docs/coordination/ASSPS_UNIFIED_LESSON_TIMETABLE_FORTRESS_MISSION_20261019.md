# ASSPS unified Lesson Planning + Timetable + Production Fortress mission
19 October 2026 PKT. Mission status: RELEASE HOLD; this is a source/evidence checkpoint, not a production deployment certificate.

## Non-negotiable runtime truth
- Production: Hostinger srv1769723, app.assps.edu.pk and api.assps.edu.pk.
- Actual live login/health HTTP200; anonymous lesson HTTP401 correct; branding path HTTP404.
- Published frontend release-meta commit 24cbcae3 (October 8), backend release-meta 16ab8f34 (October 8); both metadata values are NOT certified as today's exact runnable artifact commits. Live branding and lesson route SHA256 differ from integrated source. Do not downgrade.
- Clean tracked Core integrated base is 825f2a4f077a9b2e4ab62ee1e2db7144e7b157f2 on integration/core-lesson-identity-delivery-20261019; existing dirty/untracked source owners and ARGUS artifacts must not be edited.
- Source tests: 106 earlier bounded isolated tests PASS in source checkpoint; independently fresh 51 backend + 14 Python teacher policy + 12 frontend session = 77 PASS in continuation.
- Live local critical backup Oct18 19:28 UTC, checksum 4/4; both PG clusters 5432 and 55432 accepting connections. This is NOT offsite transfer or independent restore proof.
- Live protected previous global counts: 322 students / 1854 exam records / 224 genuine zero marks; do not conflate School1-scoped counts with global counts. This mission performed no destructive SQL or student-data writes.

## New Core RLS evidence (new to this mission)
- signed-RLS strict catalog expected forced_total 82, observed 85; 77 original guard/allow pairs and 5+4 scoped policy families verified. The 3 newly forced tables beyond the previous reference are school_documents, school_document_events, school_document_revisions.
- These 3 have permissive PUBLIC tenant_fallback policies whose SQL can allow row access when app.rls_enabled is not true. The apex_app_runtime role has SELECT grants and is not superuser/BYPASSRLS. PostgreSQL read-only catalog evaluation flagged ALL THREE: UNSCOPED_APP_RUNTIME_FALLBACK. Do NOT describe mere FORCE RLS as full isolation proof.
- Standalone read-only catalog verifier audit_school_document_rls_readonly_20261019.py plus 6 synthetic policy tests PASS; live checker correctly exits 2 (HOLD).
- A disposable PG16 fictional two-school fixture reproduced a legacy unscoped read (2 records), then a proposed fail-closed fallback denied missing context (0) and scoped tenant101/tenant202 correctly (1 each); unknown tenant303 denied (0). The temporary database was destroyed. This is NOT proof that replacing all production policies will preserve legacy services.
- Required before real RLS change: map all document query callers, superadmin and unsigned roles; draft a versioned migration and rollback; retest principal/teacher/School2 as genuine actors and clone-based functional regressions; review runtime pool session role reset. Never relax verifier expected count simply to greenwash.

## Lesson and timetable delivery evidence
- Production lesson readiness checker HOLD: 19 active teachers, 17 permission accounts, 0 active teacher_class_assignments, 3 saved plans, 0 shared, 59 of 59 original academic source candidates blocked, 0 signed review/approval. No auto-publish or automatic grants.
- Day-wise timetable: 347 new rows plus 58 historic Regular rows; total 405. Six weekdays each contain 56 instructional allocations, historically reconciled against the 16-Oct official PDF's period times; source_sha256 of imported day-wise rows matches older 14-Oct source, NOT approved final 16-Oct PDF. Preserve all rows until provenance/actor is certified.
- Twelve simultaneous teacher-period overlap groups have been narrowed exactly to the two paired Four/Five classes daily: Period5 English and Period8 Nazra. Each pair uses the same teacher and subject. Prior combined-class school directions make an intentional pairing plausible, but room columns are blank; verify against the CURRENT signed school timetable/combined classroom authority before final identity entitlement. These are not automatic data errors or implicit permission approvals.
- 54 distinct teacher/class/section/subject assignment proposals, 12 linked teacher user/employee identities, are REVIEW ONLY until real verified assignment attestations and signed curriculum provenance.
- Candidate contains mandatory teacher first-password-change, school-code fail-closed auth, GET-only session refresh, durable non-duplicating Lesson saves, visible UI failures/retries, and principal-only read-only delivery readiness. No source tests prove current teachers can sign in.
- Branding GET /public-branding exists in isolated backend candidate but absent on live backend. Do not deploy a single backend file without full source ancestry, route compatibility, reload plan and rollback.

## The single controlled release programme (no uncontrolled workstream overwrite)
1. Record fresh, separate frontend and backend live artifacts and hashes, authorized repo ancestry, dirty worktrees, uptime, DB and signed roles; verify no newer production release or concurrent actor mutation.
2. Preserve and reconcile Paper Studio, Core, Academic and Connect owned work without editing another worktree; review upstream integration candidate; resolve branding, login, lesson UI and timetable source in one reproducible release candidate.
3. Independently validate timetable source provenance and teacher identity; use approved combined-class evidence to resolve Twelve overlap groups; generate a signed mapping for 54 candidate assignments. Treat approval as evidence, not an inference from a flag.
4. Grade IX-X academic owners approve any source text/content; Paper Studio approves canonical LessonPlanDocument, Early Years, Diary and Urdu print fidelity; NO publishing 59 blocked records or making up 18 Class One weeks.
5. Clone PG16 test normal/mandatory-password-change Principal + teacher + School2 denial, RLS runtime role without superuser/BYPASSRLS, doc fallback with context missing, genuine session refresh and create/reopen/print. Test Paper templates, current attendance, marks, zeros, fees, exams, diary and revisions.
6. Verify encrypted dual-cluster backup transferred to a separate owner-controlled host, SHA/GCM decrypt and restore both clusters there; record independent restore times and rollback.
7. Run frontend Vite build, backend syntax, safety policy, browser Save -> Reopen -> Preview/PDF, Urdu Jameel Noori RTL A4, then real (non-synthetic) authorized Principal/Teacher/School2 browser and physical printer acceptance.
8. ONLY IF ALL GATES PASS: create rollback package, record exact base/frontend/backend candidate SHAs, canary controlled promotion, health and scoped end-to-end production tests, rollback rehearsal and final Release Authority certificate. Otherwise HOLD. Do not restart PM2, touch policies, grant access, migrate, publish or deploy for green-looking tests.

## Antigravity / desktop operator instruction
When an actually reachable, authenticated Windows Antigravity session becomes available, load THIS exact mission document and GitHub Issue #4. Start with read-only source reconciliation and protected worktree inventory. Do not assume that this file means the desktop agent has already received work. Use an isolated clone/worktree only, preserve the Core branch and ARGUS data. Implement the unresolved UI/printer clone and tenant checks, attach command/test receipts and full SHA comparison to Issue #4. Return concrete proposed commits/PRs and independently verifiable artifacts to SaaS Core. Never use access to bypass human academic signing, genuine user acceptance, offsite custody or RLS protections, and do not independently deploy.
