# ASSPS Unified Timetable + Lesson + Confidential Notice Core Recovery
Checkpoint: 2026-10-19 01:20 UTC. Status: SOURCE PASS / LIVE RELEASE HOLD.

## Isolation
- Base commit: 825f2a4f077a9b2e4ab62ee1e2db7144e7b157f2 (integrated Core Lesson identity/login/delivery)
- Dedicated isolated worktree: /root/workspace/assps-core-timetable-secure-20261019
- Branch: fix/core-timetable-write-failclosed-20261019
- Other dirty Paper Studio, Core and academic worktrees not changed.
- No production SQL writes, live route copy, PM2/Nginx restart, migration or deployment.

## Exact production observations
- Hostinger srv1769723: frontend Nginx root /var/www/assps-timetable-notices-unified-20261019, public HTML SHA256 8216276411fce912309767361e0f23e8a445106aa3b5eefe629c3ed0fceb2958.
- Release metadata for frontend/backend remains older and cannot serve as exact running artifact source attestation.
- Live timetableRoutes.js SHA256 4142fc54c39eec39e5fea470d452d6efdf54c862d14b4d2292d18bb7538457ce. Saved root-only copy in /root/secure-archive/assps-unified-20261019/live-source-evidence.
- Live Notice Studio route SHA256 c3b9b6953e463c9814bc2bd8d8ebdb6da68533412e72c7d208a5cf269e112073, contract SHA256 9d3a40aae6a955eaf792f12cd18b2d800f2e12904178a153c3501b3ac33c5ca6. Saved independently in same root-only archive.
- Protected database baselines at previous read-only checkpoint: students 322, exam_results 1854, genuine numeric zero marks 224, attendance 13770, fee challans 901, diaries 39, timetable 405 (58 historical Regular plus 347 day-specific). Current values need fresh check before promotion.
- Last verified local dual-cluster backup: /var/backups/assps-critical-20261018T192818Z; checksum verification 4/4 OK. Offsite restored replica and RPO/RTO NOT certified.
- Signed RLS recent catalog check: 85 forced tables vs expected 82; identify 3 additional tables and verify effective privilege matrices before enabling strict gate.

## 16-Oct official PDF — independent evidence
- Uploaded official user-approved file ASSPS_Timetable_Print_Locked_2026-27.pdf SHA256 **9ac81002d2bc67cc748ece72b637c6cc081c8e1f23d1551d594031deea7e70c4** independently verified byte-for-byte in user Library.
- Read-only verifier ops/release/timetable/verify_official_pdf_against_live_readonly.py compares all 7 class+section cohorts * 8 periods * 6 weekdays.
- Actual count 336/336 complete; no missing/unexpected slots or period timing mismatches. Six teacher DISPLAY differences: Class Nine Fatima P7, PDF "Sir Fida-ul-Rehman", stored "Qari Fida-ul-Rehman". The PDF has no verified primary user ID or signed actor mapping to resolve the title alias, so DO NOT auto-change live labels.
- 12 simultaneous overlap groups = Class Four+Five shared English P5 and Nazra P8 across six weekdays. This matches reported combined classroom arrangements, but independent role/period acceptance still required before assignment grants.
- All 336 weekday teaching rows still refer to old source SHA 263941c69d..., not the independently verified final PDF SHA. The script always reports HOLD until this provenance gap is resolved; it never rewrites data.

## Source changes in THIS branch only
1. Forward-ported actual currently live timetable GET/bells/workload/save route onto integrated Core Lesson base (preserved exact live source snapshot). Hardened POST /api/timetable/save:
   - Signed/current school identity and manager roles; teacher and peer-school denial; no School1 default.
   - Verify original official PDF SHA through SERVER configuration; \`ASSPS_TIMETABLE_SOURCE_INDEPENDENTLY_ATTESTED\` defaults false and MUST NOT be set without documented signoff.
   - Strict eight periods with correct day-specific bell boundaries; no empty, stale source or 'Regular' write; no forged or missing teacher identity.
   - Server-issued optimistic snapshot SHA, SERIALIZABLE transaction, advisory lock, row re-read and post-auth teacher/employee identity verification, rollback on conflicts. Preserve historical rows and prevent silent lost updates.
   - Explicit /snapshot read for verified managers. Active GET omits historical Regular rows by default for School1, but explicit historical access still possible.
2. Forward-ported current live Notice Studio seven confidential HR categories with additive contract and school-scoped employee roster onto Core integration. Restored read-only official Bell Schedule and General Date Sheet source routes from protected integration source. Restored schema readiness/tenant context; HR creation restricted to school leadership; recipient employee validated as active and same-school, canonical employee name server-generated; staff private published-only visibility for recipient; receipt published-only, intended-recipient-only, once-only and no spoofed employee signature. Existing leader-only approve/publish and unresolved-placeholder checks preserved.
3. Pure unit/static and isolated mocked Express regression suites; no genuine school passwords/students used.

## Test evidence
- 2026-10-19 unified selected backend tests: **76/76 PASS**, including 12 timetable guard regression cases, 10 HR confidentiality tests, real mocked Express School Document privacy, school-scoped login and teacher delivery, official bell schedule and branding source.
- \`node ops/production-safety-check.js\` PASS, Node syntax PASS, \`git diff --check\` PASS after trailing whitespace cleanup.
- These are source/mocked tests, not live authenticated Principal/Teacher/School2 acceptance.

## Non-negotiable release HOLD
- No full audited committed frontend counterpart for currently served timetable and Notice Studio GUI has been integrated onto verified latest descendant; DO NOT overwrite latest live frontend with stale branch.
- School1 teacher_class_assignments 0 active and academic original 59/59 sources held with 0 approval signatures. No blanket teacher grants, fabricated academic approval or automatic lessons sharing.
- Actual current frontend/backend production commits must be independently attested from runtime artifacts and ancestry.
- Repeat isolated disposable Postgres dual-school write/denial/rollback acceptance using this source; latest tests above are not proof of live RLS.
- Correct signed RLS 82-versus-85 catalog drift via independent catalog/migration analysis and restricted-login denial tests, not by falsifying expected number.
- Independent encrypted offsite transfer and BOTH databases' decrypted restoration with documented RPO/RTO + rollback.
- Real Principal/Teacher/School2 Save->Reopen->Print and Urdu A4 hardware acceptance.
- Only final SaaS Core release owner can promote the coherent latest descendant with verified data baseline, backups, rollback and Paper Studio/Academic signoffs.

No claim of deployed completion is authorized by this checkpoint.
