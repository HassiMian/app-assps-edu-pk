# ASSPS Grade IX–X — Source-subject false-green closure

10 October 2026. Academic-only research integrity, production HOLD.

## Verified source baseline
- GitHub issue #4 latest Academic checkpoint before this work: 6093140175, branch feat/grade910-mcq-reversible-teacher-review-proposal-20261010, origin-matched commit 800c59ec5931c4b34985874d57f39d6276033c56.
- Prior worktree had two unstaged modifications to historical rubric-only research reports. These were left untouched; new isolated worktree is /root/workspace/assps-grade910-subject-provenance-20261010, branch fix/grade910-subject-provenance-false-green-20261010.

## Actual RED-to-GREEN finding
- Old standalone school-adoption evidence intake checked source PDF hash but did not compare candidate curriculum.subjectId with registered source textbook subject.
- A real Chemistry IX research question modified IN MEMORY to the contradictory subject physics still passed that old source/adoption checker. This is an evidence-intake false green, not an authenticated production approval bypass.
- New source-subject attestor rejects contradictory source subjects and requires exact SHA-pinned original question and registered-source bytes.
- From the 2,581 immutable authored research IDs: 2,537 question-level subjects agree with their mapped public catalog titles; exactly 44 Grade IX English competency candidates lack a question-level subject key.
- All 44 remain unapproved, individually source-locked qualified teacher review requests, rather than being silently rewritten or automatically certified.

## Implementation and immutable evidence
- New read-only academic script ops/qbank/attest-grade910-original-subject-provenance.cjs explicitly maps published textbook subject labels to internal subject keys, including the Urdu title alias. Missing subject identity is quarantined; a nonempty contradictory identity fails closed.
- Original 2,581-ID authoring manifest remains required. Original source catalog registry byte SHA256 is 9241b22e74a4910035de85cb7d5aba837a0995600beb73a8df2f8733ccdbb065.
- New source-bound 44-question reviewer JSON/Markdown identity dossier ASSPS_GRADE910_44_MISSING_SUBJECT_IDS_SOURCE_BOUND_FACULTY_QUEUE_20261010 is exactly SHA256 6062f396012644cd96d6c46292247593f55fb204882af5c551d1399b9a6f580c. No full copyrighted textbook question passages reproduced.
- Existing Grade IX/X 161-answer cumulative audit now REQUIRES this identity evidence, with independently academically approved 0 and verified published 0.
- No original candidate, option/key, source registry, historic paper, Paper Studio code, SaaS Core code, tenant DB or migration changed.

## Actual executed tests and process exit status
- New source/subject registry, missing identity, spoofed subject, forged approval and original revision tests: 15/15 PASS EXIT0 /tmp/assps-grade910-subject-provenance-targeted-first.tap.
- Full Academic-focused disjoint batches: 102/102 PASS EXIT0 /tmp/assps-grade910-subject-academic-a.tap; 67/67 PASS EXIT0 /tmp/assps-grade910-subject-academic-b.tap; 63/63 PASS EXIT0 /tmp/assps-grade910-subject-academic-c.tap; 71/71 PASS EXIT0 /tmp/assps-grade910-subject-academic-d.tap. Total 303/303.
- Entire original staging: 219/219 PASS EXIT0 /tmp/assps-grade910-subject-staging-a.tap and 291/291 PASS EXIT0 /tmp/assps-grade910-subject-staging-b.tap. Total 510/510.
- Original Paper Studio verified-selection boundary and source adoption test plus new source-subject check: 24/24 PASS EXIT0 /tmp/assps-grade910-subject-publisher.tap.
- JavaScript syntax, staged git whitespace and independent remote SHA to be verified at commit.

## Actual remaining external evidence
- ASSPS actual approved textbooks, subject/medium/edition and board examination cohort, printed exercise/page evidence and independently qualified subject/Urdu teacher signatures are still absent.
- The other 2,581 original candidate research IDs remain unapproved. The 44 missing subject IDs require new source-revision-bound faculty review before eventual publication.
- Original 53 MCQ source key-pattern concerns, five Chemistry long-answer faculty decisions, three semantic-overlap pairs, four unapproved Biology IX Urdu drafts and 161 unapproved long-answer proposals remain academic review requests.
- Approved 0; verified published 0; teacher verified picker EMPTY/HOLD. Prior 43 finished historical papers are not active content blockers, but canonical Paper Workspace hierarchy, marks/scoring, RTL/Jameel Noori and PDF/Word/print parity remain protected functional contracts. SaaS Core exclusively controls production.
