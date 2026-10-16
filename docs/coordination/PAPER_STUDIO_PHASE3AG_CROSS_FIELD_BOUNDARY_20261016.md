# ASSPS Paper Studio Phase 3AG bounded serial and statement edit

16 October 2026. Isolated source-only change on protected Core/Paper source e64af939a2e10113dc217a21e76fc0988173d207. Full Core release authority unchanged. Tracking issue #3 (HassiMian/app-assps-edu-pk).

## Verified root cause and repair

Existing question-number and question-heading were separate native contentEditable roots; cross-field mouse selections terminated at the serial. Marks was a third field. Chromium fail-before experiment confirmed this. Introduced a common contentEditable container when editing, with the two individually named InlineEditable children inheriting editability. Kept independent data fields, marks, print renderer, section numbering, Urdu fonts and stored source.

The selection guard accepts only serial+heading from the SAME exact section and same composite parent, never marks, other question sections or the whole page. Bold/Italic/Underline style is applied to bounded per-field text runs. Atomic compound Undo/Redo restores both fields. Rich text for selected serial and instruction persists in separate headingSerial and headingInstruction fields through Done Editing and print iframe; formatting-only changes do NOT recalculate marks/heading. The persistence bug was caught and fixed via a fail-before real browser test, not inferred.

## Actually run

Real Chromium Urdu RTL cross-drag included serial 2: and heading glyphs; selected substring bold, Undo/Redo and print iframe identical, marks unmodified. Real English LTR Q2 fixture cross-drag included serial and Study, selected underlining ON/OFF, Italic ON/OFF, and Undo/Redo, print iframe identical, marks protected; explicitly invalid three-field range crossing marks rejected. Cross-field: 3/3 PASS, no skip.

Original V12 formatting regressions 8/8 PASS, original V13 Jameel font/RTL punctuation/pixel tests 5/5 PASS after change. Canonical Class 1 Islamiyat Paper Workspace route 1/1 PASS with fixture-only protected Question Bank mock. Vite build PASS. Added strict real-Chromium source runner and GitHub Actions workflow; remote CI green NOT claimed. Tests use only disposable mock server and dummy school session; no real school passwords, student records, DB writes, PM2 restarts or hardware print jobs.

## Still outstanding

Original Phase 3AG issue #3 remains OPEN until genuine independently authenticated teacher Save/Reopen acceptance, both direction drags, table/odd-item cases and reviewed postflight are evidenced. The isolated teacher Save/Reopen/Print suite was SKIPPED because disposable teacher backend/credentials were not provisioned; do not count it as pass. Never autoapprove Grade IX-X items. Carry forward already accepted owner physical prints. Core alone may promote current release after real signed 13/13 gate.

Separate older manual Weekly Assessment browser fixture is incompatible with the newer user-authored Question Menu flow. Its exploratory Chromium run FAILED and was not counted as a success. The fixture was restored untouched. Independently authenticated teacher Save/Reopen remains outstanding.
