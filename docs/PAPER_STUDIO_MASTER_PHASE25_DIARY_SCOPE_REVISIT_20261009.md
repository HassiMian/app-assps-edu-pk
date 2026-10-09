# ASSPS Paper Studio Phase 25 — Diary revisit saved-record identity

Isolated owner development, 9 October 2026. No deployment.

## Source and ownership
Clean verified Paper Studio Phase24 parent f72ca05fa13a8d3efd6c795370d05eb7fda3657c, independent worktree `/root/workspace/assps-paper-studio-master-phase25-20261009`, branch `feat/paper-studio-phase25-diary-scope-revisit-20261009`. GitHub issue #4 coordination read. SaaS Core Phase28 8fe6324f55d6789946e4c196ba0dc6c6c25845a5 verified, Phase29 worktree active separately and untouched. Live frontend 24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92, backend 16ab8f346ba27aa6b2e29a8f03c68db32a326cb9 at start. Full historical chat archives not directly accessible.

## NEW browser-reproduced defect
Phase24 prevented PUT to a different Diary date/class/section, but retained only the last record ID. When a teacher revisited an older saved class/section/date in the same open editor, the known record was forgotten and a duplicate POST was sent. New real Vite+Chromium mocked HTTP acceptance proved RED: after POST Eight/Blue/Oct9 ID201, PUT /201, POST Eight/Blue/Oct10 ID202, POST Eight/Green/Oct10 ID203, POST Seven/Blue/Oct10 ID204, PUT /204, returning to Eight/Blue/Oct9 incorrectly issued POST rather than PUT /201. Actual RED exit1, `/tmp/paper-p25-revisit-red.log`. This is synthetic browser behavior, not a claim about production rows.

## Isolated source change and GREEN
Canonical DailyDiaryWorkspace.jsx now holds successful server-returned IDs in component-lifetime `useRef(new Map())`, keyed by exact `[classLevel,section,date]` tuple from Phase24. The map is in memory only, with no persistent identity cache or server changes. A previous saved tuple updates its exact ID, a new tuple creates a new record. The same new browser now passes: returning to Eight/Blue/Oct9 issues PUT /201; returning Eight/Green/Oct10 issues PUT /203. Captured sequence POST,PUT,POST,POST,POST,PUT,PUT,PUT. The prior Phase24 wrong-target safety test also passes: combined **2/2 PASS exit0** `/tmp/paper-p25-revisit-green.log`. New test ESLint PASS `/tmp/paper-p25-new-eslint.log`.

## Evidence and pending gates
- Original canonical DOCX/math source model **4/4 PASS exit0**, 43 original papers, 1027 nodes, 315 tables, 612 RTL structures. `/tmp/paper-p25-docx-model.log`.
- Protected original 43-paper render and printed text parity: `/tmp/paper-p25-all43.log/.rc`, **43/43 PASS, process exit0**, original protected First Term browser render and print text parity; 305.08s test /308.69s TAP; 0 failures/skips.
- Previous eight independent Diary A4, Lesson Planning and school-date/schedule acceptance files: `/tmp/paper-p25-inherited.log/.rc`, **20/20 PASS, process exit0, 46.88s TAP**, deliberately run AFTER original corpus to avoid earlier shared CPU pagination timing failure.
- Six protected templates hash validation: `/tmp/paper-p25-templates.log/.rc`, **PASS (6 original files unchanged), exit0**.
- Full optimized frontend build: `/tmp/paper-p25-build.log/.rc`, **PASS (6 original files unchanged), exit0**.
- GitHub push, local/remote SHA check and issue #4 readback to follow all-green gates. All four controlled primary rc markers were 0.

## Explicit boundaries
This fixes duplicate POST when revisiting a saved scope in the same editor session only. After page reload or in another device, previously saved record discovery and conflict/version handling are still needed. It does not prove tenant authorization, server uniqueness or database safety. No existing papers, student records, marks, Urdu font, print styles, backend database, Core or Connect modules were edited. Signed teacher save/reopen tests, isolation tests, protected uploads, backup/rollback and attached A4 printer/Urdu Nastaleeq review remain Core release blockers. Selectively forward-port only onto the latest verified Core descendant. Production release is HOLD until SaaS Core certification.
