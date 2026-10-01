# ASSPS Emergency Editable Paper & Print Hotfix 3 — 01 October 2026

Branch based on live r3; frontend-only. Does NOT include staged Examination r5 changes, backend, DB mutation, paper source replacement or printer configuration changes.

## Diagnoses resolved
1. Recovery Class 8 Urdu paper is V13-shaped but has no canonical normalization-manifest entry; forcing `word_editor` falls to preview-only legacy. Route `recoverySourceManaged` papers to existing editable builder `build`, with edit mode and marks metadata opened by default. Other pristine V13 still canonical, Early Years retains own specialized editor.
2. Class Eight Urdu source header 75 versus nine section marks [5,5,5,5,10,10,10,10,10] = 70. The editor exposes Header Total plus all nine question marks independently, with no automatic redistribution. The print gate clears only after a user's actual marks correction. Original seed is untouched.
3. Flyer Urdu Q4 uses `UrduAlphabetWritingArea`, previously missing in Early Years renderer. It now renders through the existing Urdu handwriting response component (four lines), preserving source.
4. All nine Starter/Mover/Flyer early-year papers now have a tenant-scoped working overlay for optional editing of header total, class/subject/date/time, question label/instruction/marks, presentation type, and content structure; source V2 JSON stays immutable.
5. Selected presentation layouts are optional. Unsupported type never becomes a dead-end; a source-visible editable fallback is rendered.
6. Unresolved marks must not silently become official printed papers. Early Years allows explicitly confirmed `Print Draft with Warning` with visible printed Header/Question totals. Final print requires reconciliation.
7. Prior committed hotfixes preserved: seed-loader current-version idempotence and 180s print iframe lifetime for slow Urdu Chrome previews.

## Local gates
- 12/12 direct emergency/storage/print-lifetime tests passed.
- 3/3 targeted real Early Years browser interaction checks passed after preserving QA Panel compatibility text.
- 62/62 Early Years source-fidelity, Paper Editor and Workspace contract regressions passed.
- Flyer Urdu real browser acceptance PASS: Q4 renders, marks editor 50/60 -> 50/50, reload persists, source untouched, print handler invoked.
- Frontend Vite production build PASS.
- No production deploy claimed. Live r3 and backend unchanged until verified transfer, fresh frontend backup, release hash verification, staged swap, and print QA.

## Mandatory live checks before release declared complete
Class Eight Urdu -> Edit in Workspace -> adjust one actual mark OR Header Total -> Save -> Reload -> Print/PDF; Flyer Urdu Q4 no unsupported presentation; Flyer Urdu conflict editor/labelled draft; Starter Urdu conflict editor; ordinary Class Five V13 opens Canonical Editor; class Seven Urdu print parity; all nine Early Years papers render and print. Preserve source and existing saved working copies.
