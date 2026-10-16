# ASSPS — unified Core / Paper Studio / Connect phase-wise source integration, 16 Oct 2026

**SaaS Core release owner.** This is an actually executed isolated engineering checkpoint, not a full public SaaS deployment. Do not interpret successful synthetic/isolated tests as authentic independent live School2 security approval or physical printer job.

## Phase 1 — Current live baseline: PASS
- Active Nginx root remains `/var/www/assps-resultcards-owner-accepted-20261016`, live index SHA256 `760b232b493c300fe78908704aef4989c24c25028faac1821dd41f6480210f3c`.
- At task start on 16 October, app and API health returned HTTP 200; production PostgreSQL still held 1,763 saved examination results and 213 genuine numeric zeros. About 15GiB free. Do not change zero-vs-blank semantics.
- Backend release metadata reports SHA `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`; metadata is **not** proof of executing source commit. Currently deployed Connect Next BUILD_ID `ONDwxEIZlx5onDIKY7wYf`; staged optimized Next is different.

## Phase 2 — Up-to-date safe source reconciliation: PASS
- Started from clean SaaS Core `audit/core-stage-rollback-integrity-20261016@cacd16adde8010ec616c1c38cf50250e05d67f60`, descendant of the original verified `017d5106` signed RLS/unsigned-context branch. Kept existing actual worker peer/rollback audits.
- Latest published and reviewed Paper Core branch was `integration/core-paper-phase3ag-20261016@4d5fafb0a604a56170b47c3cca135f310eefa1df`, ALSO descendant of `017d5106`. Cherry-picked only these **four exact published** Paper commits with source-provenance `-x`: `6eaa8a26`, `20894aab`, `e8fce2d6`, `4d5fafb0`.
- Paper-owned local worktree contained a newer UNPUSHED `3f0b76f8` addition at time of inspection. **Did not cherry-pick or touch** this unpublished/possibly in-progress work; no force-push or reset of other agents' worktrees.
- The scoped product fix permits same-question serial+heading native selection with range-limited B/I/U/undo/redo while preserving marks, RTL/LTR and print parity. This is Paper-owned implementation, only Core release integration.
- Created brand-new clean `integration/core-unified-paper-rls-worker-20261016` worktree; Vite/Express remain separate from Connect-owned isolated Next.js source, no accidental cross-owner takeover.

## Phase 3 — Security and protected backend stage: TECHNICAL PASS; OFFICIAL HOLD
- Existing real Postgres worker peer scope proof under OS actor `assps_ai_worker_login`, signed-RLS catalog audit, 172 denied unsigned-context probes, and rollback stage verifier retained and rerun.
- **Core Python suites 82/82 PASS**, including protected 5/5 staged worker/lesson overlays and 3/3 original current live source rollback archive parity. Real private Node adapter one-shot previously PASS with 5 sensitive ACL refusals and 2 SQLSTATE42501 denials.
- **This mission's fresh genuine official signed release gate:** exact public middleware SHA `a43d860d070ea875e3f84e96cd51ca98ac7411f33c5147c23de077d7e28e2ca8` / current public Connect BUILD_ID `ONDwxEIZlx5onDIKY7wYf`; process **exit2, HOLD 6/13**. Remaining seven authentic conditions: pinned official full-ACL backup freshness, independent signed current offhost recovery, live restricted signed production transport, exact reviewed adapter installed in active backend, separated genuine worker authenticated/connected, production effective inherited grants accepted, independently authenticated and signed School2/unassigned subject refusal.
- Newer Connect hardened release decision/security unit tests **24/24 PASS** and exact private optimized Next build provenance `OPTIMIZED_NEXT_BUILD_PROVENANCE_PASS`. This does **not** prove actual public deployment or independent signatures.

## Phase 4 — Actual new product/browser build and regression: PASS for isolated candidate
- Actual fresh Playwright Chromium browser suite on integrated Core source:
  - `run_serial_statement_crossfield_20261016.cjs` **3/3 PASS** (2 cross-field Urdu/English editing plus 1 canonical route browser acceptance).
  - `run_existing_selection_v12_20261016.cjs` **13/13 PASS** (8 workspace-selection baseline; 5 real Urdu visual/RTL).
  - `run_diary_release_browser_20261016.cjs` **4/4 PASS** (screen/print subject-size controls; Save/Reopen/foreign tenant negative; late-save race).
  - **Total 20/20 genuine isolated Chromium acceptance PASS** (0 skipped, 0 failed).
- Full integrated `npm run build` EXIT 0 (12.61 s), new HTML SHA256 `07f14dad2bd55e0e3104681174925ac5425c6371c179a294ae319ada8672a01e`, exact candidate source at stage before evidence commit `ca8f9aac79c7207c3daff57c4d499e78f7f74570`.
- Candidate full five-feature static guard **5/5 PASS** (Daily Diary, Early Years print, Lesson V5, Results V3, Saved Marks). **Actual public is still 3/5**, with Lesson V5 and Early Years companion not cut over.
- Exact SHA-pinned controlled Core rollout called in **dry-run/no --apply** mode: `READY_FOR_CORE_GATE`, planned root `/var/www/assps-lesson-planner-ca8f9aac79c7`, `production_changed=false`. This is NOT signed production authorization.

## Phase 5 — Protected controlled full cutover: HOLD / NOT EXECUTED
- Security gate 6/13, NOT 13/13. No independently authenticated genuine peer-school denial, signed off-host recovery, current accepted PINNED backup, or verified live worker/transport.
- No Nginx reload, PM2 restart, public Next/Vite replacement, live PostgreSQL DDL/DML, published marks edits, student leaks, paper/diary deletions, academic approvals, physical printer jobs, archived backup deletion or fake signatures.
- A final actual postflight of public HTTP 200, unchanged Nginx root+index SHA and 1,763/213 school marks is mandatory if/when real signed 13/13 gate passes, plus actual authorized tenant/browser login and rollback recovery.
- The user will independently self-upload school-owned signatures/certificates. Do not request duplicate routine approvals or invent these independent verifications.

**Release authority:** `NO_GO_INDEPENDENT_SECURITY_EVIDENCE_MISSING`. Git history/provenance protects all completed Paper, Connect, Grade IX/X and SaaS Core work; do not deploy a stale or isolated master branch as a full production release.
