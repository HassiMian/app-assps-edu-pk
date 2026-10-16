# Paper Studio Chromium selection V12 regression recovery, 16 October 2026

Scope: isolated QA fix, not functional resolution of historical GitHub issue #3.

Actual fail-before: the unchanged V12-01 Chromium test timed out at /login, because the synthetic fixture did not mock a new protected Question Bank bootstrap request. This is a broken browser fixture, not real teacher authorization evidence. Added a synthetic test-only school session and explicitly mocked the Question Bank API. Real app login, session guards, student data, marks, paper content, fonts and print styling unchanged.

Actual after-fix: all eight existing V12 Chromium regressions PASS (0 skipped). Checks exercise question-heading formatting, marks isolation, Urdu display, B/I/U toggle, Undo/Redo, mouse selection inside one heading and print clone parity. New strict source runner and CI workflow included. Local VPS run verified; remote GitHub Actions green NOT claimed.

Issue #3 remains OPEN: real native selection across two separate contentEditable roots is unsupported. Isolated browser experiment confirmed cross-field mouse selection is possible with one common contentEditable parent and children inheriting editability, but this is only architectural evidence, not an approved, persisted, undoable implementation. No product code was changed to avoid regressions.

Production remains owner-accepted V3 and full Core signed release HOLD. Zero DB writes, hardware printer operations, Nginx reload or teacher login.
