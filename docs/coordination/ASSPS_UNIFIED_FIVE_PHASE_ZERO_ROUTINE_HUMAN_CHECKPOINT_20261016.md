# ASSPS SaaS Core five-phase zero-routine-human production mission — 16 October 2026

**Safety invariant:** Never promote a static/browser green candidate over currently accepted live frontend without authentic Core release security, least-privilege signed worker, independent School2 denial, verifiable rollback, and tenant-specific postflight. This report records **executed** technical work, not a 13/13 certification.

## Phase 1 — current live read-only reconciliation: COMPLETED
- Current Nginx frontend root: `/var/www/assps-resultcards-owner-accepted-20261016`, index SHA256 `760b232b493c300fe78908704aef4989c24c25028faac1821dd41f6480210f3c`.
- App HTTPS200, public API health200, direct backend origin health200.
- Backend component metadata `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`; metadata is not running-code attestation.
- Root storage approximately 96GB total, 15GB available at this checkpoint; active hourly self-verification and existing one-shot worker unit.

## Phase 2 — canonical source reconciliation and checks: TECHNICALLY COMPLETED
- Started from clean/pushed SaaS Core `integration/core-autonomous-readiness-20261016@72b5e0fad9f772053d4f89a1c10d921193adde06`.
- Core independent signed-RLS audit new three-file delta came through `integration/core-signed-audit-readiness-20261016@8ee747d25df287e8a7ebf9f814da47a54dc56346`; isolated cherry-picks include reviewed Paper Studio Diary browser fixture/runner `integration/core-paper-diary-browser-guard-20261016@e1264a181e2854d771c0b1c6602370ba43f18148`. Other owner worktrees never reset.
- Unified candidate source initial SHA `71cc86ec66e1df91a027bc8a6ea9f717c45da001` on `integration/core-unified-p5-20261016`.
- Actual 37 Python Core tests PASS (5 signed RLS, 9 current fresh-backup contract, 23 technical monitor).
- Actual 4/4 isolated real Chromium Diary tests PASS: A4 dynamic controllers, Save -> Reopen/PUT and duplicate/foreign-school negative, late save-status race. Does not prove live authorized teacher session.
- Actual Vite build PASS 5.29 s; candidate index HTML SHA256 `68ad0a2359d84d627ab8055ab28166baa4a43058d38c5fef052ed7f7073c0b89`.
- Static product feature guard **candidate 5/5 PASS**, **live 3/5**: public Lesson Planner V5 and Early Years companion remain unpromoted.
- Independent APEX Connect reviewed source `qa/connect-private-http-role-routing-20261016@0b97a0370633a6ccfba0f8c154622a110a263fa1` kept Connect-owned, not improperly merged into Vite+Express. Private optimized Next build ID `SAsg3cC_el5cq2_nN2a46`; actual pinned proof read-only verifier PASS, 15/15 adversarial tests PASS, build log and exit-code SHA match. Private browser evidence is synthetic, not official tenant signoff.

## Phase 3 — backend/database/worker security: TECHNICAL SUBCHECKS PASS; OFFICIAL HOLD
- Read-only current PostgreSQL signed catalog audit: `CATALOG_PASS_NOT_RELEASE`. Existing signed 77 restrictive + permissive pairs, 77 green-runtime role guards, five newer FORCE-RLS academic/evidence policies, four explicitly scoped non-FORCE audit/planner tables, no direct `apexos_user` ACL exposure on those four, three inspected roles nonsuperuser/non-BYPASS. Twelve invariant checks, 5/5 adversarial tests PASS.
- Actual prior same-VPS fresh private backup PostgreSQL restore successfully reproduced **1763** saved scores, **213** true numeric zeros, 379 policies, 83 FORCE-RLS tables; complete result-row content hash parity. Offhost signed disaster recovery is NOT proved by this.
- 8/8 real Core backend stage and worker-probe source tests PASS. Reviewed worker adapter SHA256 `97090fee75c77283375141e21d572d52a1a9fe58952ff16a4584ca9f308592cc` exists in current Core *source* but is **absent from running backend**. Previously successful hardened one-shot restricted worker probe is NOT continuously deployed signed transport.
- Fresh re-run of service by remote command was denied by execution safety guard; no success claimed and no alternative permission bypass attempted.
- Official release remains HOLD (most recent independently recorded Core Connect verdict: **6/13**). Missing evidence includes a fresh officially pinned full-ACL backup acceptance, independent signed offhost restore, reviewed live adapter, signed restricted transport, separately authenticated worker and inherited permissions, genuinely independent School2/unassigned subject denial. Preserve existing recognized school/teacher acceptance without asking owner to redo it.

## Phase 4 — controlled release candidate, no apply: TECHNICAL PREFLIGHT COMPLETE
- Actual `guarded-lesson-planner-rollout.py` called **without --apply** against exact live index SHA and verified unified Vite dist, response `READY_FOR_CORE_GATE`, `production_changed:false`, planned `/var/www/assps-lesson-planner-71cc86ec66e1`.
- Full public feature activation 5/5 cannot be claimed until Core security and controlled release genuinely pass.
- Full authenticated principal/teacher/School2 acceptance and physical printing are not forged or repeated; prior accepted physical proof is preserved.

## Phase 5 — protected promotion and live postflight: HOLD, NOT EXECUTED
- **No Nginx reload, PM2 restart, backend adapter deployment, live SQL writes/migrations, forced Git update, removal of historic backups, signoff impersonation or production frontend replacement.**
- Exactly required next automatic technical work: Core review of latest authentic source and real worker transport, independent authenticated/role-scoped denial with genuine credentials/receipts, officially reviewed backup freshness + independently certified off-host restore, 13/13 fail-closed trusted release gate, approved reproducible candidate deployment, postflight/rollback checks; abort and revert candidate when any gate fails.
- All Grade IX–X research remains provisional without independently verified academic revision approval. School owner will self-upload any genuine external signatures; never auto-sign or publish provisional academic questions.

## Same-mission update: 16 October, additional nonrelease phase-3 validation

New clean descendant `audit/core-unsigned-rls-matrix-20261016@a73e72f190f9be2f2120841eafb1c01120819d80` adds a read-only unsigned-context role-denial matrix and hermetic unit tests/CI. Previous 37 Core tests and Paper Studio work remain included by ancestry.

1. **Phase 1 baseline:** read-only public frontend/API HTTP 200; exact live root and accepted V3 remain unchanged; saved marks 1,763 and genuine zeros 213.
2. **Phase 2 source:** same protected Vite/Express + Paper browser code from `b53bf123`; no academic or Connect feature takeover.
3. **Phase 3 security negative tests newly executed:** 172/172 actual no-ticket role queries denied (159 RLS zero rows, 13 SQLSTATE 42501), zero unexpected visibility across 77 signed + nine additional tables; live public 5/5 protected HTTP endpoints anonymous 401. This **does not** prove independent peer-school authenticated denial. Full same-host restore proven earlier; signed offhost restore and authenticated production transport still not certified.
4. **Phase 4 exact descendant candidate:** new `npm run build` EXIT 0 (9.81 s), HTML SHA256 `68ad0a2359d84d627ab8055ab28166baa4a43058d38c5fef052ed7f7073c0b89` identical to prior source; 5/5 static feature contracts PASS. Fresh module suites total **53/53 PASS** (8 new RLS logic, 5 older catalog, 9 backup readiness, 23 monitor, 8 worker/stage). Prior real browser 4/4 remains valid for same production source browser code. One combined fresh protected rollout invocation was blocked by execution-safety interface, **not** marked as executed PASS. Prior `b53bf123` guarded rollout read-only preflight remains separately recorded.
5. **Phase 5 release:** NOT EXECUTED; Core official latest independently recorded 6/13 HOLD (not re-certified on this exact turn); accepted live V3 retained. Production signed worker adapter, independent signed offhost recovery, genuine tenant 2/unassigned subject checks, and full 13/13 remain mandatory. Do not invent independent signed receipts or trigger SQL/Nginx mutations.

New audit evidence `docs/coordination/ASSPS_UNSIGNED_CONTEXT_172_RLS_NEGATIVE_MATRIX_20261016.md`.
