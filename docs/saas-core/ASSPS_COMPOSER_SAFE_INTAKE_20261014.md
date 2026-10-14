# ASSPS SaaS Core — Composer-Safe Academic Intake, 14 October 2026

**Branch:** fix/core-academic-composer-safe-intake-20261014
**Base:** 2baa21433369a57b72ef12d6d618409ff181fb08 (isolated descendant of Core's protected Exam9 source).
**Ownership:** SaaS Core / tenant-secure backend preview. Paper Studio owns Lesson Planner UI and print. Grade IX–X and Connect are untouched.
**Deployment:** NOT DEPLOYED. **Production data:** READ ONLY. **Academic publication:** HOLD.

## Provenance and safety context

Miss Adiba is a composer/collector and WhatsApp forwarder, **not** automatically the subject teacher or author of each lesson. The original October 14 WhatsApp export (privately held, not in GitHub) was independently reconciled by SHA-256 with 35 substantial text submissions and one 18-week Class One image. This creates **59 review-only subject groups across 12 classes**, with one class-unspecified Islamiyat source unassigned. Class alias rules: Play=Starter/Playgroup; Mover=Nursery; Prep=Flyer; Pre-Nine **does not** imply Grade Nine.

Original source ZIP SHA256: 8fa4eeb53a06f3ffa5d421cb50c17871c2b9daba126d5993bfd2720647f38ded. Original text SHA256: 6966eb0e63e2f5695f2c004c3a2ca07d2bac2c4a101729c8ba8358ced89075c7. Image SHA256: 53c56ed4acf6eb6d1fe3882c4314ef3e8d5c5682a641f5d07938e6d8a2efd7f6.

No original WhatsApp message text, school-private staff login, student record, or attachment was committed to GitHub.

## Implemented in isolated code

- Added \`src/services/lessonComposerIntake.js\`: a **pure fail-closed preview validator**. Requires supplied school ID to match the authenticated request school; exact aliases/class and subject match; source line and SHA-256 evidence; original ZIP and TXT fingerprints; and unassigned evidence retention.
- Rejects mismatched school, duplicate IDs, invalid images or missing original SHA, absent text provenance, forged approvals, teacher IDs, section IDs, silently corrected dates, unsafe publish/send flags, and any direct legacy POST-ready state.
- Produces class-grouped candidate summaries with digest/review state, never copies verbatim source content into the API response. This is NOT academic approval.
- Added administrative \`POST /api/lesson-plans/planner/composer-review-preview\`. Routes behind the existing \`protect\` and lesson-role guard, then checks \`isSchoolDocumentManager\`. It performs zero SQL, does not call the legacy POST, and cannot trigger \`/:id/share\` student or parent notifications.
- Updated one outdated static test assertion for the existing third middleware in \`router.use(protect, canManageLessonPlans, actorGuard)\`. Original static failure reproduced on untouched baseline before adjusting it. No security middleware was removed.
- New \`lesson-composer-intake.test.js\` covers aliases, tenant mismatch, fake teacher assignment/signature, source corruption, image hash, duplicated submissions, SHA lineage and unassigned evidence.

## Proof and deliberate limitations

- VPS current production metadata checked read only: frontend \`24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92\`, backend \`16ab8f346ba27aa6b2e29a8f03c68db32a326cb9\`.
- Existing live \`apexos.public.lesson_plans\` has exactly three staged Miss Adiba agent drafts, all \`sent_to_portal=false\`, no changes to them in this mission. One record misclassified Class Seven Islamiyat as generic Primary Urdu.
- Local exact-original checks: 59 review candidates, 115 verbatim slice comparisons, eight class-one image candidate hash links, one unassigned source; all blocked from publication.
- New pure component + existing static suite + a mocked-actor isolated HTTP negative-path suite: **25/25 PASS**. Baseline static matcher was stale and was updated. This HTTP suite explicitly uses test actors, does NOT represent genuine JWT/production acceptance. It ran with DB_STARTUP_PROBE=false and an existing read-only dependency resolution path; no database connections or data changes. It denies anonymous/teacher preview requests, cross-school manifests, forged publication or teacher assignment, and guarantees the HTTP response never copies source verbatim content.
- **Still required:** multi-tenant signed runtime/authorized school roles under independent HTTP acceptance, school teacher/section and textbook assignment, ambiguous source dates and term correction by school evidence, Paper Studio grouped UI, database provenance/approval RLS schema (not yet applied), real Save/Reopen/Print and Urdu layout tests, signed principal sign-off, rollback proof, controlled deployment.
- Existing POST creates \`created_by=req.user.id\` and \`/:id/share\` sends students/parents notices. Do **not** insert 59 forwarded plans through that legacy route, do not grant Adiba fictitious assignments, and do not mark the 3 draft records approved.

## Integration contract for Paper Studio (owned by Paper Studio agent)

Input body: \`{reviewBatch: { schema:'assps.lesson_plan.review_import.v1', source_zip_sha256, source_txt_sha256, candidates:[...], unassigned_evidence:[...] }}\`.

Only an authorized school manager can preview. Output: \`{success:true, data:{classes:[{className,subjects:[...]}], candidateCount, ...}, publicationAllowed:false}\`. This **does not persist** review content, teacher ownership or approvals. Persistent versioned intake needs a separately reviewed RLS migration, proper source security/retention and audited actor identity before user saves. The full source manifest is held in the separately delivered private artifact package.

## Exact no-loss deployment policy

Never cherry-pick directly over another agent's dirty worktree. Core must reconcile this clean candidate against current canonical and live frontend/backend versions; run auth/tenant cross-school regression, protect Exam9 marks and finance/student records, verify backup and rollback, then consider controlled rollout. Until that point **source QA PASS; PRODUCTION CERTIFICATION HOLD**.



## Resumed mission checkpoint — 14 October 2026 (isolated source, no production deployment)

Original ZIP/TXT fingerprints matched independently against user-uploaded bytes. Private 59-candidate manifest transferred to root-only VPS evidence directory; no WhatsApp source text uploaded to GitHub. Original archive: one TXT and 26 attachments.

Trusted candidate hashes: src/services/data/adiba20261014TrustedHashes.json contains 59 SHA256 review candidate digests, original ZIP/TXT SHA and pinned manifest SHA b8ebd7de77753d5fba31ac35bb5594d138e063896d2f4fa77774dbab8abdfa3f. The verifier rejects tampered text, extra candidate IDs or forged ZIP hashes. These hashes prove alignment with the original source, NOT academic approval.

Backend review import is manager-only, gated by ACADEMIC_COMPOSER_REVIEW_IMPORT_ENABLED=true (default disabled), accepts <=12 candidates/atomic transaction, writes school-scoped private evidence with NULL author and actual teacher, unpublished, no parent/student notices. Full original source preserved; identical imports idempotent, conflicts fail closed. Management-only class list and original-source inspection routes remain protected.

Correction proposals: manager-only POST /planner/composer-review-correction/:id (gated by ACADEMIC_COMPOSER_REVIEW_CORRECTIONS_ENABLED=true, default disabled) requires authenticated actor ID, expected revision, document source ID and evidence. It appends hash-chained proposed correction events to the separate corrections JSON array without touching the immutable original source, academic teacher identity, section, term, published status or school marks. Such proposals are NOT approvals. Legacy create/update/delete/share operations block composer-source IDs and three existing incorrect drafts.

Independent read-only validator: node al-siddique-backend/ops/release/validate-composer-manifest.js /root/secure-archive/composer-review-20261014/manifest_private.json. Full 59/59 original manifest staged inside isolated port 55432 PostgreSQL transaction and rolled back; 0 teacher assignments, 0 publication and 0 notifications. Real PostgreSQL append-only correction rehearsal, source-preservation and rollback PASS. Candidate source/role/tenant/unit/static/mock HTTP/planner tests: 50/50 PASS. QA role is not real production signed RLS; mock HTTP does not establish genuine Principal acceptance.

Outstanding production release requirements: Paper Studio class-wise teacher-facing UI, authentic principal and actual subject teacher assignment, school review of date and textbook provenance ambiguities, genuine signed RLS cross-school HTTP, independent Save/Reopen/Edit/Print browser and Urdu checks, verified backup/rollback, integration on current deployment ancestry. Flags must remain OFF in production until gates pass. Production marks, results and existing three Adiba drafts were not changed in this mission.
