# ASSPS notices legacy reader privacy containment — source-only candidate (17 October 2026)

Base integrated source: c303edc05f7a90050838c8bf5ec358831b1b5c63.
Branch: fix/core-notices-read-failclosed-20261017.
Production: NO DEPLOY, no DB SQL / notice changes, no role grant or migration.

Root cause: legacy GET /api/notices selects every notice for the authenticated school. Authentication + school_id SQL is insufficient for the intended recipient_type/teacher_ids audience contract; JWT users.id is not independently bound to legacy teacher_ids. A teacher's valid login would return other recipients' same-school notices if they existed.

Fail-closed source containment: deny teachers AND services legacy list reads for now; school managers (super_admin, admin, school_admin, principal) retain school-scoped list access. No compatibility promise is made for staff notice delivery. Existing mocked test expecting broad teacher list read was replaced with negative role/no-query tests and principal scoped positive tests. Dedicated source checker must report SOURCE_GUARD_PRESENT_NOT_LIVE_CERTIFIED, with production_release_authorized=false and school2_authenticated=false. A successful CI means containment only, not RLS or peer-school proof.

This is deliberately an availability restriction until independently established teacher user-id/employee-id mapping and exact recipient-type rules support school-targeted teacher delivery. DO NOT merge or deploy if the product owner requires staff notices to work without first implementing and authenticating the audience mapping. Before deployment, secure independent School2 same-school peer-teacher tests, verify historical notices behavior, plus remaining Core 13/13 signed security, backup/restore, print and rollback acceptance.

No original student marks (1,801 exam_results, 213 numeric zeros), Class One Urdu 38/38, official papers, teachers, notice rows or compiled runtime were changed by this patch.
