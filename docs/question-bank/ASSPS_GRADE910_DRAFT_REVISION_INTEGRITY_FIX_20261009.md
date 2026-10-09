# ASSPS Grade IX-X: Research answer draft revision integrity fix

Date: 2026-10-09. Academic Master owner. Production HOLD.

## Recovered source
- Issue #4 at 199 comments before work. Last Academic commit: f07a30aed29b4010d9ed09adc588beac122b6797, original worktree clean and GitHub origin identical.
- Isolated worktree /root/workspace/assps-grade910-156-revision-gate-20261009, branch fix/grade910-156-proposal-revision-hash-gate-20261009 based on exact commit.
- All other Master worktrees, original questions, original answer rubrics, prior research packets and official papers untouched.

## Reproduced defect and exact closure
- Real RED before fix: in-memory change to proposedEnglishModelAnswer of first Biology IX question was accepted by previous 19-cohort research gate. Existing admission decision still correctly denied verified publication, but supplementary draft answer revisions were not pinned.
- Added content-addressed 156-answer proposal revision manifest across 19 original source cohorts and 798 proposed grading points. Each answer revision SHA256 binds original question ID, source packet, English text, ordered criteria and marks. Full canonical research packet SHA256 is pinned per cohort. Saved manifest SHA256 is hard-locked in code: 27a71ee1c79d2373b2e7c5322c831e7db2f3664a9e262b31e61e2ccd3c945784.
- Two-line integration into previous ops/qbank/attest-grade910-156-cohort-review-freeze.cjs now requires exact saved answer-revision matches. Mutated answer strings, reordered/edited criteria, added metadata and changed manifest bytes fail closed; no approval status or school source claims promoted.
- Manifest and Markdown reviewer register are Academic research-only. These content hashes are not cryptographic teacher signatures or official school adoption evidence.

## Executed tests, exact result and process exits
- Pre-fix reproduction: old gate returned PASS for mutated explanatory answer. Fixed gate now rejects with PROPOSAL_REVISION_ANSWER_TEXT_MARKING_REVISION_OR_PACKET_TAMPERED.
- First new tests: 14/15 pass, exit 1: malformed manifest was rejected by JSON parse before expected byte fingerprint rejection. Changed code to validate pinned byte SHA before parsing. No review or source verification relaxed.
- New proposed-revision adversarial tests: 15/15 PASS exit 0, /tmp/assps-grade910-proposal-revision-final-20261009.tap.
- Focused full inherited Grade IX-X + new tests: 223/223 PASS exit 0, /tmp/assps-grade910-revision-focused-20261009.tap.
- Original Grade IX-X staging suite: 510/510 PASS exit 0, /tmp/assps-grade910-revision-staging-20261009.tap.
- Paper Studio publisher boundary plus Chemistry and new revision tests: 119/119 PASS exit 0, /tmp/assps-grade910-revision-publisher-20261009.tap.
- Actual source/unit tests, NOT live tenant DB/RLS, official printed textbook, qualified reviewer, Urdu equivalence or physical print proof.

## Research status / remaining owners
- Global original research candidates unchanged: 2,581. Original rubric-only long fields unchanged: 166. Separate unapproved explanatory research answer proposals: 156 original IDs, 798 criteria; source groups: 19. Research backlog: 10 original long IDs, and 3 potential semantic-overlap pairs awaiting independent faculty assessment.
- No actual ASSPS-adopted 2026-27 textbook physical page, appropriate board-year, qualified revision-bound faculty or Urdu-equivalence review certified. Human academic approved 0; verified published 0.
- Further edits to any candidate draft must carry a distinct revision digest and fresh qualified review. Protected Paper Studio Grade IX-X verified bank EMPTY/HOLD. Only SaaS Core may certify production. NO deployment, migration, seeding, school data or protected paper edits.
