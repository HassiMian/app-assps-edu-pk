# ASSPS ONE Unified G0-G12 Production Completion Mission
**21 October 2026 | Controlled source integration | New full release HOLD**

Mission: ASSPS-UNIFIED-ZERO-HUMAN-20261019, continuation not a new parallel product.
Owner: SaaS Core and Production Master; Academic Master owns revision approvals, Paper Studio owns canonical editor/print, APEX Connect owns role-based client. GitHub issue #4 is the single coordination record, linked to issues #1 (Grade IX-X), #2 (Paper authoring) and #3 (rich-style print).

## Immutable operating policy
Zero routine Principal, teacher or staff technical participation will be requested. Automated review cannot impersonate a teacher, qualify an independent faculty member, certify a school-adopted textbook, fake authenticated School2 sessions or physically print Ricoh sheets. Such evidence is a hard HOLD until authentic; do not ask the user to perform technical work. Never bypass system access controls. No uncontrolled SQL DML/DDL, resets, reseeding, changes to roles/RLS, student results/attendance/fees/diary records, official papers, deployed runtime, Nginx or PM2. Existing completed October 17 operational cutover remains available; it does not certify the newer unified candidate.

## Current verified production invariants
21-Oct read-only PostgreSQL: 1854 examination results total, 1853 School1 First Term Exam9, 224 genuine Exam9 numeric zeros, 0 NULL and 0 invalid marks. Prior attested 326 total students (322 School1), 54 authorized timetable-derived teacher assignment links, 405 School1 timetable rows and four immutable First Term guard triggers. Student zero MUST remain a genuine numeric zero, not blank; preserve all grade/results, photos, papers, fee, attendance and saved diary and lesson records.

Served frontend is /var/www/assps-resultcard-nazra-purged-20261019, HTML SHA256 3c74d3be652b41549ef2129eaacec4c341c05c2118597e308edffd17a33726a9; frontend/backend effective Git ancestry is UNATTESTED. Public login and API health 200, PM2 Core and Connect online. Last verified root-private backup assps-critical-20261021T013643Z had manifest checksum 4/4 and gzip integrity; on-host backups are NOT evidence of separately decrypted OFFHOST two-PostgreSQL-cluster restore. Live current frontend has 198 additional historic public files; backend inventory 522 byte-identical, 18 different and 171 live-only paths versus source; NEVER overwrite complete runtime trees. Grade IX-X 2411 live provisional / 1305 distinct revision blockers / zero approved or verified-selectable; never conflate with academic authorization. Lesson Planning has 54 official subject groups, 3 plans, only one exact metadata match, zero academically published.

## Unified dependency architecture: G0 through G12
These are gates within ONE mission, not independently deployed modules. Record each gate with source SHA, real receipt, negative cases, independent scope and status.

| Gate | Actions / dependencies | Must prove to PASS |
|---|---|---|
| G0 Source truth | Reconcile issues, HEADs, owner dirty worktrees, exact Nginx root, backend executable, Connect BUILD_ID | Clean isolated descendant, full artifact/source fingerprints; no stale merge |
| G1 Data protection | Verify both PG clusters, backup checksums, First Term, fees, immutable papers, 4 write guards, grants | Zero data loss, exact numeric zeros, independent offhost dual-PG decrypted restore and ownership/ACL |
| G2 Source/runtime provenance | Full frontend/backend mapping, old JS/media allowlist, effective runtime ancestry, release artifact manifests | Signed paired origin; all 198 extra assets reviewed, 171 live-only backend paths preserved |
| G3 Security | Real Principal/Teacher/School2 signed identities, HMAC actor, restrictive PG runtime grants and effective RLS | Deny unassigned class/subject, peer-school, old JWT, forged headers, nonmanager Notices |
| G4 SaaS operations | Students, admissions, teacher assignments, section timetable, no multi-room collision, fees, attendance | 54 scoped grants and consistent period slots; both bulk and single-GR attendance respect actual teacher class and section; no auto absent/fee replay |
| G5 Daily Diary and Lesson | Canonical daily/weekly/term lesson document, bilingual controllers, editable diary and print | Authenticated Save -> positive server ID/revision -> Reopen -> Edit -> Print with actual persisted school/section; 54 subject groups not falsely published |
| G6 Notices and WhatsApp | Recipient read/write restrictions, phone scope, signed webhook, legacy scanner/finance boundary | No untrusted financial scanner, no active message/phone logs, no duplicate ledger writes; real cross-tenant negative cases |
| G7 Academic + Paper Studio | Canonical Paper Workspace, original 43 protected papers and template hashes, MCQ/short/long/math/Urdu parity, approved-only snapshots | Qualified revision-specific Grade IX/X source/correctness and Urdu reviews, exact textbook/session evidence, original papers untouched |
| G8 Connect | Role-neutral /dashboard and history, Next source/build, signed SaaS API and authenticated mobiles | Actual user-role and peer-school acceptance, no wrong /admin redirect, protected APIs deny unauthenticated |
| G9 Regression | Hermetic source tests, negative controls, disposable DB/HTTP, browser Save/Reopen/Print, live read-only postflight | All real test groups passed, zero hidden skips; synthetic NOT equivalent to authenticated or physical evidence |
| G10 Stage + recovery | Immutable private artifact SHA chain, protected legacy assets, two-cluster restore, separate rollback paths | Offhost restore and staging acceptances independently witnessed; enough disk, front/back exact SHA |
| G11 Controlled cutover | Core only: prior fingerprint, two-DB snapshot, stage app, syntax gate, atomic Nginx/PM2 cutover and postflight | ALL G0-G10 pass before any production promotion; revert application bits on failure, never overwrite newly written DB school data |
| G12 Final certification | Verify actual served front/back/Connect and signed roles, results, fees, attendance, teacher/peer school, bilingual A4, backups | Final independently evidenced certificate or explicitly RELEASE_HOLD; original security 13/13 separate from old operational acceptance |

## Exactly 17 current mandatory release holds
Read-only source-owned readiness command ops/release/unified/assps_unified_readiness_readonly.py exits 2 RELEASE_HOLD with these 17 entries:
1. Legacy mounted WhatsApp scanner/financial coupling lacks quarantine.
2. Active WhatsApp phone/message-sensitive logging (11 detected live source risks).
3. Real production signed webhook provider phone scope missing.
4. Lesson curriculum coverage/publication unverified (54 groups, 3 plans, 0 published).
5. Backend whole-tree replacement would remove/overwrite live-only code.
6. Extra active frontend historic assets (198) are unclassified.
7. Current frontend release sidecar mismatches served index.
8. Signed paired deployed front/backend Git ancestry absent.
9. Genuine Principal, Teacher and School2 authenticated browser witnesses absent.
10. Live HMAC actor and effective restricted-role RLS evidence absent.
11. Reviewed authorized scoped timetable writer/migration not proven.
12. 59 independent academic source-approval groups not signed.
13. Offsite decrypted independent two-cluster PostgreSQL restore absent.
14. Witnessed physical Jameel Noori Nastaliq A4 candidate print absent.
15. Paper Studio and Result template independent owner acceptance absent.
16. Attendance, fees, notices and Connect combined live negative acceptance missing.
17. Public Git historical media/privacy review not cleared; no unsafe push.

## Unified execution dependency DAG and completion actions
First G0 -> G1 -> G2. Then authenticated G3 gates the operational modules G4-G8; their module owners can test in isolated, clean candidates in parallel without fragmenting release authority. G4-G8 -> G9 -> G10 -> G11 -> G12. Pass a module's source tests before a branch merge, then re-run all in the one correct clean descendant. Do not force-cherry-pick another agent's dirty branch. Source QA is genuine progress but never satisfies independently signed production witness requirements.

Currently reviewed single-GR scope fix commit 98070a4 forward-ported via git cherry-pick -x onto Core two-parent baseline 06be72b8 in an isolated worktree; Core retained confidential DB-error redaction. Added dedicated synthetic HTTP teacher assignment/cross-class denials into the G9 one-shot test registry with a regression ensuring that test cannot silently disappear. Isolated backend npm dependencies were installed only in the scratch worktree.

## Risk management / recovery protocols
- Marks, zero/NULL, attendance or fees drift: STOP and retain current live apps; preserve two-DB backups and newer school transactions. Never restore old DB over current school records.
- Real tenant breach, GR scan cross-class, Notice reader or WhatsApp log: fail-closed; no loosening teacher scopes, grant or RLS; no new promotion.
- Old JS/media lost or backend source mismatch: stop entire candidate; do not copy an entire checkout onto currently served artifacts. Require positive full asset diff and separate immutable front/backend roots.
- Diary Urdu/Math print changed: require actual Save/Reopen/Print, Nastaliq parity, browser and physical paper witness; do not present screenshot as printer certification.
- Power/disk/port contention: verify at least 12 GiB free before heavy builds, avoid simultaneous fixed-port browser tests; timeout = NOT VERIFIED, no fake PASS.
- Rollback: preverified current and previous frontend plus backend source/process; transactionally restore application pointers and check auth/health/marks, NOT rollback live school SQL history. Full live failover SLA remains unproved until witnessed.

## Final decision
The older Oct17 operational scope is accepted. The NEW unified G0-G12 release is source-only RELEASE_HOLD until all 17 genuine current prerequisites close. No user/staff routine technical actions are assigned; external qualified-review, signed actor and hardware attestations cannot be fabricated. GitHub issue #4 remains the sole development/coordinated release record.
