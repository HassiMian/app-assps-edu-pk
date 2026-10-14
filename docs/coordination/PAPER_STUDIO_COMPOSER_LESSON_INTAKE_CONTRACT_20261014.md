# ASSPS Paper Studio / SaaS Core Lesson Intake Contract — 14 October 2026

This is a documentation-only multi-agent handoff. Paper Studio owns its teacher-facing Lesson Planner, editor, PDF/print and class-wise UI. SaaS Core owns school database, authentication, tenant RLS, secure API and deployment.

**Correct identity:** Miss Adiba is a WhatsApp composer/collector/forwarder, not automatically a subject teacher. Do not set teacher user 4191 for every forwarded subject.

**Source custody:** Original user-provided ZIP and private extracted content stay outside the public GitHub repository. Original export SHA-256 8fa4eeb53a06f3ffa5d421cb50c17871c2b9daba126d5993bfd2720647f38ded; 35 WhatsApp text submissions + one Class One 18-week image, consolidated into 59 subject review groups across 12 classes. One Islamiyat source with no class stays unassigned. The full private architecture package lives in this ChatGPT conversation, not GitHub.

**Aliases:** Play = Starter (Playgroup), Mover = Nursery, Prep = Flyer, and Pre-Nine is not Grade Nine.

## Principal-only class-wise review interface requirements

Select Class -> see all Subjects together -> select Subject -> open original submission + proposed correction + dates, pages, chapters, assessments, source citations and conflict register. Preserve English-A and English-B where different in the source, never merge them on name similarity. Support browser Save -> Reopen -> Edit -> full-class and individual-subject Print, including clean Urdu RTL and per-document font settings. Original WhatsApp source is immutable; corrected versions are revisioned separately. Do not assign Blue section or actual teacher without trusted school evidence.

Status progression: SOURCE_IMPORTED_PRIVATE -> SOURCE_CHECKED -> VERIFIED_TEACHER_ASSIGNMENT -> PRINCIPAL_APPROVAL -> PUBLISH_READY. Actual teacher approval and Principal adoption cannot be fabricated. All new imports remain private review-only.

## SaaS Core backend contract — source candidate only

Branch: fix/core-academic-composer-safe-intake-20261014 (see issue #4 for final SHA).
Manager-only POST /api/lesson-plans/planner/composer-review-preview: read-only, source-hashed, no source verbatim in response.
Manager-only POST /api/lesson-plans/planner/composer-review-import: default disabled by ACADEMIC_COMPOSER_REVIEW_IMPORT_ENABLED, maximum 12 candidates per request, requires ZIP/text SHA fingerprints, inserts unapproved records with NULL created_by and teacher, fail on conflicting revision/digest, idempotent on exact duplicates, no student/parent notifications.
Manager-only GET /api/lesson-plans/planner/composer-review-classes: list review groups class-wise.
Manager-only GET /api/lesson-plans/planner/composer-review-source/:id: school-private, no-store original evidence view.
Ordinary legacy CREATE, UPDATE, DELETE, SHARE routes must not circumvent reviewer locks on reserved composer IDs or existing wrong three agent drafts.

**Production status:** source QA is not deployment. Genuine signed tenant HTTP acceptance, verified actual teacher assignments, curriculum/adoption corrections, protected marks regression, browser print acceptance and rollback proof remain required for release. Paper Studio implementation must be isolated on its own latest appropriate source, with forward-port only after SaaS Core certification.



## Additional SaaS Core backend contract, source PIN and revisions
- Private original 14 Oct source is pinned with source ZIP/TXT and 59 per-candidate SHA256 hashes in src/services/data/adiba20261014TrustedHashes.json; original text is not committed to Git.
- POST /planner/composer-review-import manager-only, flag ACADEMIC_COMPOSER_REVIEW_IMPORT_ENABLED (default false), 12 candidate max, school-scoped atomic insert/duplicate check. No teacher actor claim, no parent/student notices.
- GET /planner/composer-review-classes manager-only for class/subject grouping. GET /planner/composer-review-source/:id manager-only for private, no-store original text, proposed correction history and source IDs.
- POST /planner/composer-review-correction/:id manager-only, flag ACADEMIC_COMPOSER_REVIEW_CORRECTIONS_ENABLED (default false), appends proposed evidence-based revision with actual server authenticated reviewer ID and integrity hash chain. A correction is never automatically approved/published; original source remains unchanged.
- Paper Studio should show ORIGINAL alongside a SEPARATE editable proposal and source line citations. No direct editing of payload.sourceSubmissions or forging approval. Render official Urdu font Jameel Noori only after independent browser/print acceptance.
- All source-data import and printing/publishing remain release HOLD until SaaS Core genuine production auth and signed RLS approval. See docs/saas-core/ASSPS_COMPOSER_SAFE_INTAKE_20261014.md for exact SHA/test evidence.
