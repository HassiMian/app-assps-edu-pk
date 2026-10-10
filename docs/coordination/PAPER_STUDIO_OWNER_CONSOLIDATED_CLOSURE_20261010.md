# Paper Studio Owner consolidated code-quality / functional acceptance — 10 October 2026

**Authority and origin**: GitHub issue #4 checked through 244 comments at initial audit. Canonical coordination handoff `docs/coordination/PAPER_STUDIO_MASTER_HANDOFF.md` independently read from preserved coordinator worktree. Current separately certified-for-test but **NOT deployed** Core RC `release/core-consolidated-rc-20261010`, exact verified HEAD `bef5aedf57738bd3a3062d1653cdd92819103483` (independently checked remote). Isolated Paper-owned worktree `/root/workspace/assps-paper-owner-final-20261010`, branch `fix/paper-owner-consolidated-quality-20261010`; no changes in SaaS Core's owner worktree, database, protected records or production.

## User-locked scope

The former 43 First Term papers are finished/historical reference documents; do not require their content as a future release-content gate. **Do not delete or overwrite them.** Preserve the current canonical Paper Workspace UI, section hierarchy, question patterns, MCQ/short/long and bilingual/Urdu formatting, marks/choice math, Early Years layout, and editable preview/print/export behavior. Never revert to the old/simple editor. Grade IX–X academic approval remains Academic Master responsibility.

## Actual narrow application/test fixes

1. `LessonPlanningWorkspace.jsx`: eliminated 4 inherited ESLint errors and 4 warnings; removed unused helpers; preserved browser-storage fallback with explicit documented catch; replaced render-effect-time `setDocument` subject selection synchronization with a single teacher-action update of selected subjects and structured document. Removed unstable joined-array dependency and used actual `selectedSubjects` dependency for context fetch. Original Save/list/revision protections inherited from Phase36–41 and already selectively integrated by Core remain unchanged.
2. NEW `lessonPlanningSubjectToggleBrowser.test.js`: real Vite/Chromium selecting English/Science, deselecting Science without losing English, reselecting, generating, saving and portal bridge.
3. `earlyYearsRenderPrintGeometryAcceptance.test.js`: genuine failing real route fixture assumed a unique `header.no-print`, but the canonical Studio shell AND Early Years editor each have a legitimate header. Test now checks **every** non-printing header is hidden by print CSS rather than picking the first or disabling the assertion. Prepatch product-route fixture RED; corrected `EY-RENDER-08` focused Chromium PASS and final 39/39 print/export browser suite PASS.
4. `teacherRealAuthIsolatedBrowserAcceptance.test.js` and `teacherSaveReopenPrintIsolatedBrowserAcceptance.test.js`: explicitly gate credentialed real PostgreSQL tests before importing optional backend `pg`/`bcryptjs` modules. Missing named test database => TAP SKIP, never fake PASS or write school records. A nonmatching `DB_NAME=production` causes expected FAIL before DB module import or connection. Real login cannot be certified without the deliberately named disposable test database, credentials and SaaS Core security authority.

## Fresh test matrix — same isolated source

- Lesson Planning *final* 8 serial real browser cases: **8/8 PASS numeric success**, `/tmp/paper-owner-lesson-browser-final.log`. Broader Diary / Early Years / Lesson combined browser exploratory run **35/36 PASS**, one Vite/route initialization timeout; affected exact test passed separately `/tmp/paper-owner-late-refresh-retry.log` EXIT0. No false claim of 36/36 from the failed exploratory run.
- DOCX binary/model/math, Paper Workspace contracts, scoring and Early Years unit cases **45/45 PASS EXIT0**, `/tmp/paper-owner-core-unit-docx.log`.
- Canonical Paper print/export *final* synthetic real Chromium suite: **39/39 PASS numeric EXIT0**, `/tmp/paper-owner-print-export-final.log`; covers English/Urdu RTL OOXML DOCX download, Early Years A4, maths long tokens, vertical arithmetic, bilingual MCQ/tables, selection/B-I-U, Urdu style and cloned print parity. Exploratory first run had old Early Years locator RED plus transient toolbar timeout; corrected selector and isolated Urdu italic retry green; only final same-source suite 39/39 counted.
- Modern blank paper / question block / marks / Quick Bank / self-service creation browser suite **20/20 PASS EXIT0**, `/tmp/paper-owner-paper-creation-browser.log`.
- Tenant storage recovery, seed idempotence and deferred print iframe **9/9 PASS EXIT0** `/tmp/paper-owner-tenant-seed.log`.
- Backend *pure* Lesson Planning engine and multi-subject parser **3/3 PASS EXIT0** `/tmp/paper-owner-lesson-engine.log`.
- New subject toggle targeted browser **1/1 PASS EXIT0** `/tmp/paper-owner-subject-toggle-final.log` and combined 8-case suite PASS.
- Optional genuine authenticated teacher E2E tests **0 PASS, 2 deliberately SKIPPED** without clone DB credentials, `/tmp/paper-owner-auth-test-guard.log`; deliberately invalid DB name **2 expected safety REJECTIONS, process exit1**, `/tmp/paper-owner-auth-unsafe-denied.log`. These are NOT authorization success evidence.
- Optimized frontend build **PASS EXIT0** `/tmp/paper-owner-build-20261010.log`; all changed JS/JSX fixture files **ESLint EXIT0** `/tmp/paper-owner-final-focused-eslint.log`, Lesson Planning standalone lint EXIT0 `/tmp/paper-owner-lint-after.log`.

## Distinct remaining authority / evidence gates — DO NOT certify release

- Module-wide *inherited* lint sweep of 283 files surfaced **491 errors + 15 warnings across 142 files** at pre-fix broader snapshot `/tmp/paper-owner-full-lint.json`; this is not a green full-project lint gate. Our modified production component and changed fixtures lint clean. Broad cleanup must be owner-reviewed and never mass-auto-fixed at risk of breaking working editors.
- Live password-authenticated teacher/guardian/student cross-tenant signed non-BYPASS PostgreSQL RLS/GRANT and backend saved-paper/lesson revision + permissions, Core authorization; no real school database touched. Existing Core RC reports signed clone subgates but a consolidated release NO-GO.
- Live private media Nginx ingress remains Core production-controlled (Core RC notes five unsafe aliases on live configs while staged candidate passed). Never alter live Nginx without Core gates.
- Real on-site physical A4 printing with configured Jameel Noori Nastaleeq font, Word/PDF output on connected printers and operator visual signoff is *not* proven by simulated Chromium PDF/OOXML tests or this VPS, where `fc-match 'Jameel Noori Nastaleeq'` resolves to a fallback font. No printer setup, restart or production assets modified.
- Core RC `bef5aedf...` itself is NOT production certified/deployed. SaaS Core must selectively accept this Paper-only patch, independently test latest descendant, backup/rollback and sign release. Until then **PRODUCTION HOLD**. This branch is a reviewed feeder, not release authority.

## Rollback and preservation

One isolated additive owner commit may be reverted on a fresh descendant by a scoped `git revert <OWNER_COMMIT>`; never reset/rebase authoritative Core or overwrite production. Zero official paper/document content changes, school rows, student data, SQL, server/env secrets, DNS, Nginx or PM2 changes. Only the previous coordination snippets and handoff, not every historical chat's complete raw text, were directly accessible in this execution.
