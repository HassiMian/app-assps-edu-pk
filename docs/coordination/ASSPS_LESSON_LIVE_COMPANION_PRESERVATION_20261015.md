# ASSPS Frontend: current live Diary / Early Years divergence before Lesson Planner restoration

Date: 15 October 2026. This is an owner-coordination, read-only/isolated
source audit, NOT a production deployment or a live approval.

## Findings

Current Nginx root remains
`/var/www/assps-grade910-draft-save-print-b18a8aae`. Its current public
HTML SHA256 is
`0af53ae824340f2ddc0b91e848163f8bddad4263d1bb7a7cf92a2bcda923325a`.
The actual reachable LessonPlanModule is the old `D149cpax` build, so
Term Planner / Weekly Notebook are absent in the public interface.

The latest owner-pushed recovery branch at audit start was
`integration/paper-term-grade910-current-live-20261015`
`1d9291b3c6d55d008f225a1fc6593c97bc1117e3`. Its recovered Lesson
Planner UI build passes the *Lesson* source and artifact checks.

**New critical preservation risk:** the independent live-build source
forensics identified an older Result Cards worktree
`/root/workspace/assps-resultcards-core-review-20261012`
HEAD `66162f08a00c076627ae3ed0755857a213bdf91a` with eight dirty
tracked source modifications and one untracked `printEarlyYearsPaper.js`.
That source's compiled build matches the public HTML and important bundled
assets, but its dirty modifications are NOT clean authoritative Git commits
and ownership/approval is not established. Do not overwrite it.

The currently live-derived Diary component contains 1,732 lines and its
CSS ~1,703 lines; the recovered 1d9291b Diary component has 261 lines and
CSS only 2 lines. These are architecturally different versions. The live
version visibly includes global subject font size, global Diary font,
bold subject headings, footer typography and logo width controls. Early
Years has a separate `printEarlyYearsPaper` workflow. Directly promoting
the existing recovered Term Planner bundle could silently replace these
companion behaviors, even if the Grade/result source ancestry is intact.

The isolated trial source worktree is
`/root/workspace/assps-lesson-live-drift-reconcile-20261015`, based on the
latest reviewed Lesson Planner integration 1d9291b. Attempting the eight
original tracked dirty patches without touching the owner tree yielded
**six independently clean-applying files** and **two conflicting Diary
files (six JSX and one CSS merge conflicts)**. The actual owner source file
has not been transplanted and no conflicting merge markers were committed.
Do not interpret clean applicability of six patches as security, visual or
print certification.

## Implemented cross-owner regression protection

`ops/release/check-preserved-companion-features.py` evaluates a reviewed
versioned contract `ops/release/preserved-companions-v1.json`, requiring
live-observed Diary typography controls and the Early Years isolated print
module to survive on the proposed source. The guarded frontend rollout now
checks both the complete Lesson Planner UI and live companion preservation,
**before** any Core production approval or filesystem writes.

At present:
- Recovered Lesson Planner reachable-asset UI contract: PASS.
- Live Diary/Early Years companion preservation contract: HOLD (missing
  specific controls and dedicated print module).
- Dedicated negative tests: 12/12 PASS across full Lesson/companion guards.
- A synthetic future reviewed replacement *can* satisfy the markers without
  any fixed Git commit SHA. Genuine redesigns can update this reviewed
  versioned contract and tests; deployment is not permanently disabled.

## Required completion sequence (one controlled SaaS Core release)

Paper Studio owner must reconcile only genuinely missing features onto the
latest clean integrated source, including the two Diary conflicts and Early
Years printing, without overwriting dirty concurrent work. Run dedicated
Diary/print/UI browser and physical Urdu print acceptance, plus all original
Lesson Planner/Grade regression tests. Independently verify current public
bundle provenance and ensure no live school records/papers/results are
modified. SaaS Core must then complete actual authenticated teacher/Principal
and peer-school subject-denial acceptance, worker signed transport, backup,
offsite recovery receipts, controlled Next/Nginx cutover and postflight/real
traffic rollback. A synthetic session cannot satisfy an actor signature.

**Production release: HOLD**, including attempts to install a frontend
unaware of these currently live companion features. Do not disable the
new gate, invent school signatures, or assert deployed changes prematurely.
