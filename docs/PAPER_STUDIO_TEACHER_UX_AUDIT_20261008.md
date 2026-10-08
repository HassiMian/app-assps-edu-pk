# Paper Studio — Teacher Route / UX Audit (8 Oct 2026)

## Confirmed production source
- Live `/var/www/apex-os/release-meta.json` at audit: `e5189103e644b248c4b4f53c404a91ec03a295da`.
- Dashboard/sidebar `/paper-generator` -> `App.jsx` -> `PaperGenerator.jsx`.
- Main `build` surface still mounts `PTSPaperGenerator.jsx`, whose source explicitly describes a PTS dark SaaS clone. This is the user-observed old-looking shell; green engine tests did not certify teacher-facing visual completion.
- Legacy `word_editor` and `board_pattern` remain compatibility routes, not regular tabs.

## Teacher workflow mapping
| Teacher action | Route / editor component | Authority and output |
| --- | --- | --- |
| Create blank / manual | `?tab=build` -> `PaperCreationWelcome` -> `BlankPaperSetup` -> `PTSPaperGenerator` | Structured PaperDocument / `usePaperStore`; server assessment persistence when applicable; Workspace print |
| Build from Question Bank | `?tab=build` -> syllabus/class/subject/chapter wizard -> Workspace | Question Bank selection -> Workspace rules, scoring and print |
| Saved / reopen / duplicate | `?tab=saved` -> `SavedPapersTab` -> `handleLoadPaper` -> `resolvePaperRoute` | Saved store + server revision overlay through `loadAssessmentPaper`; same Workspace |
| Official / First-Term | Saved paper -> `resolvePaperRoute` -> `build` | Protected V12/V13 source preserved; teacher-facing Workspace editor and print |
| Pre Classes | `?tab=early_years` -> `EarlyYearsStudio` | Specialist nine reference papers and independent Early Years authoring |
| Question Bank | `?tab=bank` -> `QuestionBank` | Governed tenant/role-scoped question lifecycle |
| Daily Diary | `?tab=diary` -> `DailyDiaryFeature` | Tenant server API `/api/daily-diary`, print |
| Lesson Plans | `?tab=lesson` -> `LessonPlanModule` | `lessonPlanClient` tenant persistence / sharing |

## Isolated UX change
Branch `feat/paper-studio-teacher-ux-20261008` based on exact live commit. A Paper Studio header, theme-aware navigation, four explicit creation paths including Early Years, responsive creation cards and print-hidden chrome were added without editing backend, official paper data or document rendering engines. Existing school/portal theme preference is respected.

## Acceptance and release hold
- Frontend Vite build: PASS.
- Manual blank Urdu create/save/reopen/print browser: PASS.
- Canonical route canary: 8/8 PASS.
- Early Years browser: first eight PASS; last four independently rerun 4/4 PASS after browser resource exhaustion.
- Teacher-facing non-authenticated harness navigation to Early Years: PASS.
- Production release BLOCKED: VPS disk reached 99% and there has not been an authenticated post-deploy teacher UI acceptance. Do not claim product completion or deploy until disk headroom and current-live forward-lineage verification are satisfied.
