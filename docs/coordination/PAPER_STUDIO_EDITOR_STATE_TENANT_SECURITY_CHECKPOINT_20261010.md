# Paper Studio — Editor state / tenant secret safety continuation (10 October 2026)

This is an isolated source/test checkpoint on `test/paper-firstday-core-reconcile-20261010`, based on the prior Core Marks+Results integration rehearsal; it is not the latest SaaS Core release authority and MUST NOT be deployed directly. Source precedence is live frontend/backend metadata, followed by immutable Git, then test evidence; GitHub issue #4 governs cross-owner integration.

## New changes

- Updated 14 React source effect/initial-selection pathways (AI Generator type/marks defaults, Daily Diary fallback metadata, Paper AI jobs, Manual Paper dynamic title, Early Years class/template, Urdu-font diagnostic, Inspector draft sync, Canonical Editor working draft restore, StructuredTextInput value sync, Question Bank auto-category/subject, Paper Inline marks selection, Lesson Planning subjects). Synchronous cascading state effect callbacks now defer to cancellable microtasks; stale/unmounted selection updates cancel rather than mutating another active document. Preserve existing user input values and source drafts.
- Early Years / canonical browser fixture entry components now explicitly export the active React component to satisfy development component identity without changing initial rendering.
- Moved manual official-section event ID generation outside React render scope; preserved timestamp/random uniqueness of inserted teacher-created sections. Restored correct dependent Question Bank selectors and normalized subjects dependencies.
- Removed truly unreferenced Lesson Planning helper functions, Saved Paper card flags/import and Paper RichText unused leaf schema declaration without deleting canonical editor templates or official paper datasets.
- Preserved previous Gem-ini key deprecation guard: historical `geminiApiKey` is still explicitly **stripped** before tenant-scoped paper settings are hydrated (`delete` on a fresh shallow clone rather than unused destructuring). No key value read or logged; no change to active auth.
- Removed dead initialized defaults for subject/class derived paper header while preserving per-branch assignment; all class/subject/Urdu metadata remains governed by existing source contracts.

## Actual acceptance

- Full Paper-only lint on exact candidate: **290 files / 93 errors / 14 warnings** (`/tmp/assps-paper-final-audit-lint.json`, genuine ESLint exit1). Earlier verified Paper checkpoint: 126 errors / 16 warnings. Remaining includes unused legacy/future editor templates and potentially structural React refs/immutability, NOT waived, NOT green. Full unrelated SaaS tree still not certified.
- Vite optimized production frontend build **PASS** `/tmp/assps-paper-final-audit-build.log`.
- Six protected Results reference templates verified byte-stable **PASS** `/tmp/assps-paper-final-audit-templates.log`.
- Canonical saved draft / corrupted draft / structured editor real Chromium **20/20 PASS** `/tmp/assps-paper-final-audit-canonical.tap`; companion node draft, paper editor and Early Years regression **34/34 PASS** `/tmp/assps-paper-final-draft-regress.tap`.
- Urdu canonical Workspace and authentic iframe A4/A5 Chromium geometry **10/10 PASS** `/tmp/assps-paper-final-audit-print.tap`. Physical Urdu Nastaleeq multi-page PDF/DOCX and actual A5 printer feed NOT tested or claimed.
- Early Years + Lesson Planning browser **13/13 PASS** `/tmp/assps-paper-20261010-final-ey-lesson.tap`; latest Lesson + Daily Diary browser **2/2 PASS** `/tmp/assps-paper-postdeps-diary-lesson.tap`.
- First Term Marks Entry (original saved exam ID9, official subject fallback, class/section-scoped roster aliases, empty/zero/pending and denial of unsafe save) synthetic Chromium **PASS** `/tmp/assps-paper-final-owner-marks.log`. No live student rows or marks read or written.
- Git diff --check PASS before publication; exact remote SHA and worktree cleanliness must be confirmed following commit.

## Authority, blockers, next gates

- Paper candidate contains Paper+Marks+Results from a rehearsal predecessor `97d7815f`, but NEWER independently verified Core frontend live-source-descendant release RC is `release/core-marks-nine-results-livebase-20261010` at `2ec5ae597e9f50772cf443b0392b442b7fa037db`; backend companion `release/marks-firstterm-backend-livebase-20261010` `322c8262dbad947df8b54b0145d431b65983aad8`. Only SaaS Core owns reviewed promotion. Do not overwrite newer releases with this older-base branch; selectively forward-port tested Paper unique changes onto exact Core descendant.
- **P0** running production DB login still BYPASSRLS and lacks authoritative signed tenant runtime settings/functions according to Core issue #4 fail-closed live read-only checks. Disposable clone signed actor PASS does not waive this. Do not change real DB roles, flags or teachers' accounts from Paper source branch.
- Signed authenticated teacher Paper Save/Reopen/Print and Results+Paper clone HTTP scope fixtures, guaranteed tenant role negative/positive tests, real production rollout/rollback and real on-site print signoff still open. Separate Academic Master owns actual Grade IX/X question approval; no provisional bank content made selectable.
- Historical 43 papers are referenced for patterns, metadata, marks, tables, RTL and print fidelity; no paper data, templates or printer settings were destroyed.

**STATUS**: Editor fixes safely staged/tested; lint remains FAIL; Core release and live restricted role security not certified; DEPLOYMENT HOLD.
