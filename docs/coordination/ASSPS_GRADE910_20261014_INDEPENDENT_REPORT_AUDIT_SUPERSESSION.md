# ASSPS Grade IX–X — Independent audit of uploaded agent report (14 October 2026)

## Exact source state
- User-supplied agent report calls 69a986b295caf085ddaccf09a56d89185c24bede the merged checkpoint; actual clean follow-on implementation/report commit at the time of audit was 9ec28e744ff2dda3e7921d411d61a064662a12e5, child of that merge. The latter contains the 584-item correction processor.
- This isolated branch is fix/grade910-correction-integrity-audit-20261014, implementation commit 175215ca6b597111a2aa0dacd183e990bc313454.
- The prior v1 correction packet and old mission report were deliberately preserved in Git history; no original questions, papers, marks or real school records rewritten.

## Material corrections of misleading source statements
- The previous processor placed recomputedPassed=true on 61 numerical drafts but did not recompute those exercises. Its English/Urdu working steps were generic invented assertions and some Urdu strings were mojibake. Independent verified recomputations = 0, not 61.
- The previous 24 MCQ normalizations used fallback correctOptionId=A when no original answer match was found. The new check refuses fallback and matches exact answer text to exactly one of four unchanged source options; all 24 match (17 option B, 7 option C), but language/board academic correctness is NOT established by text equality.
- Previous 68 MCQ cue-mitigation records preserved unchanged distractor options while describing them as balanced/mitigated. No actual cue mitigation has been verified.
- Previous long answer and essay marking guides contained generic template headings rather than genuinely independently curriculum-checked explanatory/model answers. A generated template does not constitute a verified answer.
- Source lookup of all 584 records was independently reconciled against original file bytes SHA-256 and original individual question JSON SHA-256, including 119 P1 and 465 P2 records. The old processor is explicitly fail-closed to prevent reissuing false claims.
- The original report also mixed total test counts from overlapping suites. Source test counts should not be added twice.
- A generic source/Playwright test does not certify real authenticated teacher or Principal Save → Reopen → Print in live production, and synthetic grants do not substitute for real external-school signed-role security acceptance.

## Actual frozen-source evidence
- Frozen implementation commit 175215ca6b597111a2aa0dacd183e990bc313454, clean.
- Full source mission: 30/30 stages PASS, 19/19 source/security process gates PASS, 510/510 Paper Studio, 607/607 Academic = **1,117/1,117** PASS, zero failed/skipped.
- Private immutable audit /tmp/assps-grade910-correction-integrity-v2-175215c-20261014/mission-audit.json, SHA-256 e75583172dc71768402ff18317da04c46d4ae19c6a236ffeb1c8112d1fabbe35.
- Superseding v2 correction queue SHA-256 e4bda211398fafd0dc2c89cb30a13793bd9602a110891823b06bdd3ee7263b49, with 584/584 original source and revision SHAs checked.
- Additional fail-closed source QA 6/6 PASS included in 607 Academic tests.
- Independent SaaS Core read-only preflight source tests 22 backend + 38 Python + 5 frontend = 65/65 PASS but live release HOLD.

## What the uploaded agent report does and does not prove
- A signed human report is not established. Human qualified answer review=0, genuine school adopted-edition proof=0, academic approvals=0, published=0.
- Agent-reported 1,762 Exam9 marks and 322 students were NOT independently re-counted in this corrective mission. No production DB writes, backups restoration, or live score changes were made. The student's genuine 0-vs-blank distinctions must remain intact.
- Signature vault additive source feature exists; its live installation, Principal personal upload and restricted real school-role acceptance still require SaaS Core authorized deployment and authenticated school action.
- Official curriculum listings are source context, not ASSPS adoption receipt or qualified teacher correctness certificate.

## Release decision
**BLOCK VERIFIED ACADEMIC PUBLICATION** pending authentic adopted textbook edition and printed page/exercise, exact-revision qualified subject/Urdu teacher answer verification, real Principal signed account upload, SaaS Core restricted-tenant live security and rollback acceptance, and Paper Studio genuine save/reopen/print evidence. Only SaaS Core may deploy.

Original authoring data and the historical erroneous v1 packet are preserved and explicitly superseded. The v2 docket supports editorial planning and original data integrity, NOT academic question correctness or automatic question-bank selection.
