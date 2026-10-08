# ASSPS Paper Studio — Product Completion Matrix (2026-10-08)

## Canonical teacher product

The normal teacher-facing Paper Generator navigation is intentionally limited to six product surfaces:

1. **Paper Workspace** — create blank/manual papers and build from Question Bank.
2. **Saved Papers** — reopen and duplicate saved papers without overwriting originals.
3. **Question Bank** — governed question lifecycle with teacher scope and immutable revisions.
4. **Pre Classes Papers** — Starter/Mover/Flyer specialist Early Years authoring and nine locked references.
5. **Daily Diary** — tenant-scoped server persistence with local recovery and print output.
6. **Lesson Plans** — tenant-scoped durable plans, revision-bound updates/deletes and portal sharing.

Legacy `word_editor` and `board_pattern` routes remain compatibility-only. Old AI/manual/scan/notes dashboard surfaces are not part of normal teacher navigation and must not become release sources.

## Completion matrix

| Surface | Status | Release evidence |
| --- | --- | --- |
| Blank/manual paper creation | COMPLETE | Self-service unit 5/5; browser create/save/reopen/print PASS |
| Build from Question Bank | COMPLETE | Governance 9/9; legacy 8/8; import 9/9; teacher lifecycle 10/10; list hydration 3/3 |
| Quick Add question entry | COMPLETE | Browser duplicate protection/context/translations 1/1 PASS |
| Universal block authoring | COMPLETE | Block modes 4/4; semantic table UX 1/1 PASS |
| Saved/reopen/conflict recovery | COMPLETE | Offline queue + two-tab conflict 2/2; auth recovery 1/1; tenant quota recovery PASS |
| Official/First-Term Workspace | COMPLETE | Official Class 1 Islamiyat unified Workspace PASS; routing guards/canary PASS |
| Urdu/RTL editing + print | COMPLETE | Workspace Urdu browser 9/9 PASS; Jameel-first font registration preserved from live lineage |
| Early Years self-service | COMPLETE | Unit 7/7; browser 2/2; original nine references remain immutable/separate |
| Math/image Workspace capability | COMPLETE | Render/edit/reload/print PASS; immutable image SHA identity preserved |
| PDF/print fidelity | COMPLETE | Official corpus render/print parity 43/43 required release gate; personalized durable print PASS |
| DOCX export | COMPLETE | G20 model 43/43; browser English/Urdu; math/image OOXML media; G21/G23 revision/hash boundaries |
| Personalized printing privacy | COMPLETE | Student projection recursively strips answers/teacher-only material; answer key staff-only; hash/tenant bound |
| Daily Diary | COMPLETE | Server-backed tenant storage + local recovery; adversarial tenant isolation 8/8; schema-not-ready error path fixed |
| Lesson Plans | COMPLETE | Migration 022 + RLS; HTTP durability/revision/tenant/share 12/12; browser load/save/share 1/1 |
| Question Bank lifecycle metadata | COMPLETE | List and single item expose governance public ID, lifecycle and current revision consistently |
| Full DB migration chain | COMPLETE | Exact production clone migration PASS with Lesson Plans migration and RLS |

## Non-negotiable release boundaries

- Canonical `PaperDocument` remains the content authority for manual assessment persistence/release.
- Existing official/reference papers are preserved; no destructive source migration.
- Teacher-facing official papers open in Paper Workspace, never an old simple editor.
- Early Years and board-pattern specialist documents retain their explicit specialist routes.
- Question Bank Ready/Retired governance remains the source of truth; legacy approval is compatibility projection only.
- Student print projections must never contain answers, explanations, marking schemes or teacher notes.
- Backend deployment must preserve runtime-only WhatsApp/JARVIS/shared assets; broad `rsync --delete` is forbidden.
- PM2 backend must run with `PORT=5000`.
- Any synthetic security/HTTP data must use disposable clone/test databases, never production.

## Release line

Completion work was developed from production `91b60c32f79efb1cfb855a9446f5cdb2dd34f7d4`, then forward-reconciled onto live `10579bf9c28ca7e7a148dfec987179cca8026430` so concurrent Urdu font registration and subscription hardening are preserved. Final candidate branch: `release/paper-studio-product-final-20261008`.

## Closure definition

Paper Studio is product-complete when all matrix rows above are green, the 43-paper corpus remains render/print clean, frontend build and production-safety checks pass, backend clone migrations and release smoke pass, and the exact latest live lineage is preserved through the final pre-deploy guard.
