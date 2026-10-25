# ASSPS Lesson Planning — provenance replay continuation

**2026-10-25.** Source-only continuation after clean checkpoint
`ad0de945da6edf408e68f3118e890c3c31f781ec` on
`fix/assps-lesson-original-assessment-lock-20261025`.
No live release, database mutation, authenticated user action, external cache purge,
academic publication, or physical printer claim.

## Failing-before reproduction
Calling `termAssessmentRows` with an original **PROPOSED** source event
and a replayed `src:` override yielded `origin: ORIGINAL_SOURCE`,
a forged `sourceId`, and `academicApproval: true`. This allowed a
historical browser/server draft to masquerade as source authority in the
planner projection, even while whole-document publication remained blocked.
Reproduced against the parent checkout before patching.

## Fail-closed corrections
1. Only the current source's non-original event ID may receive a date/name
   proposal edit; the sourceId, originalDate, subject identity and
   academicApproval status cannot be elevated via old draft overrides.
2. Unknown source aliases and out-of-scope subject overrides are ignored in
   the view, without silently deleting historical stored drafts; they no
   longer reserve invisible assessment dates.
3. Manually added and auto-proposed overrides never acquire original academic
   provenance; `academicApproval` is always false for manual changes.
4. `buildTermServerPayload` independently rejects direct-save attempts to
   forge `ORIGINAL_SOURCE` or `academicApproval: true`, and enforces equality
   of original ID, subject, date, name and source identifiers against current
   verified source events. Genuine originals remain unchanged.

## Fresh isolated acceptance
- 83/83 targeted Node regression cases PASS (model, source calendar,
  teaching copy, release fixture, scoped login and teacher delivery).
- 14/14 Lesson Planner Python source/build contract tests PASS.
- Scoped ESLint PASS; isolated Vite production build PASS.
- Chromium, synthetic localhost mock: six subjects, POST/PUT revision 1 to 2,
  Save/Reopen/Edit and Term A4 PDF PASS.
- Chromium, five fictional students: 2/3/4 cards per A4 PASS; no real PII.
- `git diff --check` PASS. There was an initial contract-test failure only
  because this new isolated worktree had no build output; after building it,
  the same 14 Python tests all passed.

## Release decision remains HOLD
Verified 25-Oct parent checkpoint observed 3 school lesson drafts,
0 shared/published, 54 active class assignments and 59/59 academic
source candidates awaiting independent QA, plus three locked duplicate
Class Five original assessment dates. Those counts are historical parent
checkpoint evidence, not a new production query.

Remaining hard gates: authenticated real Principal/Teacher/other-school
denial, verified lesson Save/Reopen/Publish, academic source approvals,
actual Urdu/A4 print and Diary parity, off-host independent dual-DB restore,
correct served artifact/source attestation and rollback, signed marks
release dependency, and provider-authenticated private-media CDN purge.
Synthetic browser QA cannot substitute for these. Production release
authority remains with SaaS Core; do not deploy a partial branch.
