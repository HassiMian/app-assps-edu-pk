# ASSPS Unified Mission — Notice Publication Placeholder Safety

Date 17 October 2026. One integrated SaaS Core, Paper, Results, School
Document Studio and Diary candidate, based directly on exact clean
integration/assps-core742-notice-diary-unified-20261017@c303edc05f7a90050838c8bf5ec358831b1b5c63.

The current Notice Studio offers 18 ready-to-edit presets containing 17
actual bracketed fields. Previously approved drafts could be published with
literal [date], [reason] or [venue] prompts left in the official text.
This additive source-only safeguard checks the same locked revision JSONB
content on *publication* and rejects incomplete official documents with
HTTP409 UNRESOLVED_NOTICE_TEMPLATE_FIELDS, transactional ROLLBACK and no
document revision or status mutation. Draft/edit/submit/approve are unchanged.

The 17 markers are pinned against actual UI presets in tests. The tests
exercise JSONB serialization, case normalization, benign Urdu and math
brackets, duplicate placeholders, malformed content fail-closed and an
actual mock route POST publish denial with no SQL UPDATE. Teacher and
anonymous publication attempts are denied. No real DB, secrets, migration
or print queue was accessed.

**NOT FOR PRODUCTION RELEASE.** The separate legacy /api/notices teacher GET
audience problem is still HOLD_NOTICE_READ_AUDIENCE. Genuine independent
SaaS Core release is only 6/13 signed and requires offsite owner/ACL
restore, worker/adapters/grants, authorized teacher and peer-School2
denial, official Urdu offering approval, real Save/Reopen/Print, Ricoh
Nastaleeq A4 visual witness, and signed rollback. Current genuine 38 saved
Urdu marks, 1,801 historical results/213 real zero marks, 43 official
papers and other owner worktrees were not changed.

The least-privilege workflow source unit tests pass only when incomplete
document publication is blocked and the unrelated notice-reader privacy
HOLD is still explicitly recognized. Hosted success is not release GO.
