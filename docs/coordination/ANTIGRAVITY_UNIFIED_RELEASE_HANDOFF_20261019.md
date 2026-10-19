# ANTIGRAVITY / CORE RELEASE AGENT — ASSPS UNIFIED MISSION HANDOFF
Date: 2026-10-19. Owner requests zero routine involvement and one controlled final release. This is a HANDOFF, not proof that Antigravity has read or executed it.

## Read first
- GitHub Issue #4, especially latest Core SHA note #6257639424 and read-only timetable audit.
- SaaS Core governance / SAAS_CORE_MASTER_HANDOFF.md.
- Current safe source branch: \`fix/core-timetable-write-failclosed-20261019\` at \`a52ee445bce116f1e7bbccd74c2ec8cd8df2c3b6\`.
- Existing candidate integration \`integration/core-lesson-identity-delivery-20261019@825f2a4f\`.
- The official locked 2026-27 timetable PDF SHA256 9ac81002d2bc67cc748ece72b637c6cc081c8e1f23d1551d594031deea7e70c4.
- Preserve all other agents' dirty worktrees; they were not merged into this candidate.

## Mandatory single-programme execution
1. Current live verification: Hostinger VPS (not AWS), live Nginx root, runtime backend route hashes, frontend/backend independent build attribution, PM2, PostgreSQL main:5432 + signed:55432, RLS roles/catalog, migrations, offsite destination, trusted rollback.
2. Reconcile source: do not overwrite newer live deployed Timetable/Notice UI with this candidate's older frontend. Diff and forward-port only verified missing Paper-owned frontend lessons, official Timetable UI and Notice Studio changes; preserve protected Paper Workspace, Daily Diary, school records, Arabic/Urdu typography and results.
3. Secure timetable: existing route \`POST /api/timetable/save\` must deny unauthorised teacher, School2, malformed or empty replacements; strict eight-period and Friday bell validation; atomic optimistic lock. Review \`timetableWriteGuard.js\`; do NOT set \`ASSPS_TIMETABLE_SOURCE_INDEPENDENTLY_ATTESTED=true\` until independent approved official PDF source/staff identity/signature is actually verified. Fix six 'Sir'/'Qari' title aliases only after matching one verified employee; do not overwrite historical 58 Regular rows.
4. Complete teacher assignments only from verified same-school auth/employee/class/section/subject actors. Current 54 proposals / 12 shared Class4+5 overlap slots and 0 active assignments require signed per-actor review. Never fabricate or globally grant paper_generator.
5. Complete academic Lesson source review: 59 original candidates/18 Class One weeks held, zero signed approvals. Grade/Academic and Paper Studio independently sign source statements before publication. Teacher-authored drafts remain private and saved; no invented chapter/page content.
6. Ensure login first-password-change, expired JWT safe GET-only recovery, list/context error banners and Save->Reopen->Print. Confirm genuine Principal, two authorized Teachers, and independent peer School2 denial through actual browser, not mocks.
7. Notice Studio seven private HR kinds: manager-only creation, active employee in same school, private no-store reader, published-recipient-only once-only receipt. Re-run real HTTP and database RLS tests on disposable peer-school fixtures, including forbidden create/ack/read.
8. Signed RLS: observed 85 forced tables vs expected 82. Identify 3 new tables, inspect permissive fallback policy for school_documents, school_document_events and revisions; test least-privilege restricted login + signed actor/tenant; do not change expected count merely to pass.
9. Dual PostgreSQL clusters: verify locally checksum 4/4 PASS, off-host encrypted copy to an independently authorized storage destination, restore and decrypt BOTH clusters on separate disposable host, RPO/RTO and rollback. Preserve historical backups and worktree vault; never blanket-clean 89%-utilized disk.
10. Generate build/CI/browser/A4 Urdu visual acceptance and protected module regressions. Check data invariants students 322, exams 1854, true zeros 224, attendance 13770, fee 901, diaries >=39; distinguish global vs School1.
11. After all gates PASS and independent approvals, prepare one release candidate with precise frontend/backend commit SHAs, tested rollback, controlled deployment, public and authenticated live smoke (Principal/Teacher/School2), hardware Urdu Ricoh A4 and publish GitHub Issue #4 final certificate.
12. If any gate cannot be independently proven, leave RELEASE HOLD and state exact remaining evidence. Never pretend a queued command or offline Antigravity is a running desktop session.

## Available evidence
- Core repo branch \`fix/core-timetable-write-failclosed-20261019\`, 76/76 isolated tests PASS, no live DB writes.
- Root-only on-VPS code artifact comparisons and latest backup manifest under /root/secure-archive/assps-unified-20261019/.
- Read-only comparator \`ops/release/timetable/verify_official_pdf_against_live_readonly.py\`.
- Current live Nginx index SHA 8216276411fce912309767361e0f23e8a445106aa3b5eefe629c3ed0fceb2958.
- Public /login 200, API /health 200, public-branding 404; teacher_class_assignments 0, shared lesson plans 0. These facts require fresh rechecks before cutover.
