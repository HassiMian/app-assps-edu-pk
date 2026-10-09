# ASSPS SaaS Core Phase 17 — Matching Columns RTL/Bilingual A4 containment

**2026-10-09 UTC. ISOLATED DEVELOPMENT ONLY. PRODUCTION RELEASE HOLD.**

## Immutable ancestry and Master boundaries

- Parent Core Phase16 `974c36af3b56a642d57c40117b39caa676d3174f` (pushed, GitHub verified, clean). Branch `feat/saas-core-phase17-matching-rtl-20261009`, isolated worktree `/root/workspace/assps-core-phase17-matching-rtl-20261009`.
- Paper Studio owner Phase15 `3713e023fefba80b73d844648e69eea7928cf172`, clean owner branch `feat/paper-studio-phase15-matching-rtl-print-20261009`, verified at review. Owner fixed a distinct Matching Columns table print overflow not handled by previously integrated Phase11–14 printing fixes.
- Selectively integrated **only two owner-matching `MatchingColumnsTable` style edits** on latest signed Core descendant: heading `<th>` and answer `<td>` get `overflowWrap:'anywhere',wordBreak:'break-word'`. Only the synthetic stress fixture and standalone actual Chromium A4 print test imported, changing test port to isolated `5492` and importing `node:buffer` explicitly for lint portability.
- No full older owner branch copied. No backend routes, Core signed HMAC/non-BYPASS separate Paper logins, other app modules, database policies, migrations, student records, official First Term paper originals, fee/attendance, ARCHV1 dirty worktree, Connect/Academic sources or production artifacts changed.

## New RED → GREEN on Core's genuine descendant

- Copied owner synthetic five-pair bilingual RTL Matching Columns fixture **without renderer patch** into Core Phase16 descendant. Actual Playwright/Chromium negative control **0/1 FAIL, exit 1**: Source matching table `scrollWidth=10341` but `clientWidth=731`, with four individually overflowing heading/value cells. No real school text or private records accessed.
- Applied minimal two-cell word-wrapping styles. **Same actual Chromium test 1/1 PASS, exit 0**; preview scroll/client `731/731`, cloned print iframe `731/732`, zero overflowing headers/values, original five fixture tokens present and actual print frame rendered to a **2-page A4 PDF**. Test-only import of Buffer explicit; new test-file ESLint **PASS exit 0**.
- No hiding/truncation or changing question contents, serial labels, editable fields, marks, Urdu RTL, font rules or A4 paper geometry.

## Executed regression/build and release distinctions

- **Phase17 full isolated Vite build PASS**, `✓ built in 3.06s` and `/tmp/assps_p17_fullbuild.exit=0` recorded by long-running controlled runner; source changed only the two MatchingColumns styles, test fixture and synthetic browser test.
- **43/43 PASS** Phase17 exact-source protected official First Term render/print text parity, controlled real Chromium `node --test` on private local `ASSPS_CANONICAL_CORPUS_PORT=5493`, **process exit 0**, 43 separate PASS markers, TAP one overarching PASS, 0 fail/skipped/cancelled; full duration `129837.21 ms`. Raw evidence `/tmp/assps_p17_corpus43.log` and `/tmp/assps_p17_corpus43.exit`. This is not a copy of Phase16 or Studio owner's results.
- **4/4 PASS** previous print-layout real Chromium regressions rerun on Phase17, distinct tested layouts: long RTL 13+12 split, bilingual short two-column, long bilingual MCQ matrix, multilingual Markdown SourceTable. Controlled runner **exit 0**, TAP no fail/skip/cancel; `/tmp/assps_p17_crosslayouts.log`. With new MatchingColumns test 1/1, **5 distinct actual Chromium print/PDF geometry tests PASS** on this Phase17 source.
- Backend `node --check` **259/259 PASS**, untouched Core security; protected template SHA verifier **6/6 unchanged PASS**; staged whitespace validation PASS.
- Phase16 ancestor's fresh standalone `npm ci` 315 packages and `npm ls --depth=0` each passed under exactly same lock SHA; no separate Phase17 fresh `npm ci` run or unrelated dependency update claimed.
- Exact lock SHA256 `4d9385d6d72de6827d33f2e45eefda7424629e1d85bd3c5ea883965876fed7f4`; Phase17 isolated build reuses prior Phase16 `node_modules` symlink, no new production dependency update.
- Full frontend lint at Phase16 **FAIL** exit 1 (**753 total: 707 errors / 46 warnings**). Phase17 targeted renderer/harness ESLint rerun reports the same **6 existing errors** (5 unused renderer symbols + test-harness Fast Refresh violation; fixture insert moves the line number), new MatchingColumns test-file ESLint **0 errors / exit 0**. Whole-repo lint release gate **NOT CLEARED**; no blanket `--fix` or unrelated source rewrite.

## Remaining release certification gates

1. Integrated Phase17 automated build, 43 protected papers and five distinct browser print layouts are green, but **physical connected printer**, Urdu Jameel Noori glyph-by-glyph visual/manual review and full end-to-end authenticated teacher Save→GET→reopen→PDF/DOCX on restricted Paper role remain pending.
2. Production-safe 77 FORCE-RLS Core+Paper migrations and separate non-BYPASS runtime LOGINs, fee/attendance/student/parent/guardian/superadmin/service actor cross-tenant writes, recovery backups/restore/rollback and secret vault/rotation needed.
3. Connect recovered source publishing permissions and signed session/private upload acceptance unresolved. Grade IX–X human reviewer, printed textbook source/page/edition approvals remain zero; do not seed unapproved drafts.
4. Entire frontend lint 707 errors / 46 warnings, Hostinger ingress/cloud firewall, SSH rescue, exact production artifact lineage, Release Candidate smoke, and human UAT still HOLD. Previous comprehensive historical chats and original Phase3AE ZIP/PG18 review unavailable, not assumed verified.

**Latest checked production (before release):** frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`; backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`. Production is older than this isolated feature candidate.

**Decision: TESTED source-only isolated engineering; no production deployment or database/services/restart/SSH/firewall changes.**
