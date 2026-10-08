# ASSPS Grade 9–10 — independent academic review release gate

This gate strengthens existing tenant-scoped Question Bank governance. Manual
PaperDocument authoring stays independent and the teacher-facing Paper Workspace
remains the canonical editor.

## Safety rules

1. Imported questions start unapproved. Grade 9–10 ready publication requires
   one immutable current revision, its SHA256, and an independently reviewed
   academic evidence mapping under the same school tenant.
2. Reviewers must be authenticated admin/principal users from that school,
   and different from both original author and latest revision author.
3. A separate authorized releaser must complete the reviewed-to-ready
   transaction; the reviewer cannot release their own review.
4. Reviewers must inspect the actual textbook page image, edition, curriculum,
   question answer/key, language and originality. The registry of 22 exact
   cached source SHA identities is NOT an academic approval list.
5. Original questions cannot fabricate question-level textbook page citations.
   Textbook-derived questions need a printed page and exercise reference.
6. A change in canonical revision number, hash, stem, choices, key, answer or
   marks invalidates the older review. The source legacy row is checked.
7. Publication uses the existing tenant-bound transaction to mark the exact
   linked record approved and store reviewer, approver, source and revision
   audit metadata. No production schema migration is required.
8. Pre-existing Grade 1–8 governance behavior is preserved.

## Authenticated endpoints

GET /api/question-bank/governance/:publicId/review-context:
current tenant-bound revision/hash and review context only, no approval.

POST /api/question-bank/governance/:publicId/academic-review:
requires expectedRevision, expectedContentHash and an academic evidence packet
matching schema assps-grade910-independent-review-v1. The reviewer identity is
taken from the authenticated session, never from request body.

PATCH /api/question-bank/governance/:publicId/status with status ready:
uses the existing lifecycle endpoint, now protected by independent academic
review, source identity, answer/option parity and CAS for Grade 9–10.

## Tests and deployment controls

Pure tests exercise source registry, school/class/chapter proof, missing
attestations, exact revision bindings and answer/option drift. An authenticated
HTTP integration test on disposable production-clone DB confirms no review,
self-review, invalid hashes and stale revisions all fail closed; only a
different author/reviewer/releaser sequence can publish an exact tenant-linked
question. This is technical evidence, not a claim that all provisional school
questions have been academically reviewed.

Do not deploy a stale branch. Rebase or cherry-pick to the latest verified
production descendant and require clean tests, guarded rollback snapshot,
alternate-port health, source+build integrity and postdeploy smoke.
