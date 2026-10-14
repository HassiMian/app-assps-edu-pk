# ASSPS Grade IX-X Academic Master — final-five qualified faculty routing fix

Date: 2026-10-10. Research-only, production HOLD.

## Verified checkpoint
- Recovered issue #4 through 216 comments; prior Academic comment 6091972609.
- Prior exact clean remote-matched Academic commit: 3b9bd5682c6b45d2971e2db3a63b9478a4c33663.
- New isolated branch: fix/grade910-final-five-review-routing-20261010, isolated worktree /root/workspace/assps-grade910-review-routing-20261010.
- No original questions, old rubrics, prior 161 immutable handoff, 156 prior answer revisions, Paper Studio or SaaS Core modules, production services or tenant database touched.

## Actual reproducible defect and new remediation
- Existing final-five reviewer handoff used q.grade, but original Grade IX/X Chemistry drafts encode their grade in q.curriculum.grade. Reproduced ALL FIVE original pending grade fields undefined in previous handoff JSON.
- New read-only attestor binds q.curriculum.grade to the original candidate ID and to the original PDF catalog grade, Chemistry subject, English medium, edition LABEL and PDF hash CLAIM, exact original question/answer SHA and unchanged draft review flags.
- New reviewer handoff routes exactly two original Grade IX Chemistry English IDs and three Grade X Chemistry English IDs. Not a teacher assignment or a fabricated human signoff.
- New manifest raw SHA256 4a93c0a1bebddd6e8285e6498b98680acb239a75b83aeb7672953c74c8eb340e pinned in code. Original historical review handoff untouched; existing cumulative 161-ID reconciler now depends on this exact new source-bound reviewer-routing manifest.
- Wrong Grade/subject/medium/edition/PDF claims, duplicate catalog identity, forged source catalog approval, changed raw source and tampered handoff fail closed.
- A source-catalog label or hash match does NOT certify which physical 2026-27 textbook ASSPS adopted or actual printed exercise page.

## Executed tests
- New targeted 15/15 PASS EXIT0: /tmp/assps-grade910-route-targeted-final-20261010.tap. Initial 14/15 was a test expectation of which fail-closed source control fired first; assertion corrected, safeguards unchanged.
- Full inherited Academic focused and new routing 267/267 PASS EXIT0: /tmp/assps-grade910-route-focused-final-20261010.tap.
- Complete original Grade IX-X staging 510/510 PASS EXIT0: /tmp/assps-grade910-route-staging-final-20261010.tap.
- Publisher approval-boundary, inherited sources and new router 163/163 PASS EXIT0: /tmp/assps-grade910-route-publisher-final-20261010.tap.

## Remaining genuine blockers
- Original 2,581 provisional questions unchanged; original 166 rubric-only long answers unchanged.
- 161 existing question IDs have independently authored but UNAPPROVED supplementary explanations, with 823 proposed grading criteria across 20 source cohorts; original IDs without additional explanatory answers remain five.
- Three possible semantic-overlap pairs awaiting qualified independent subject reviewer.
- Actual ASSPS 2026-27 textbook adoption, physical exercise page, teacher scientific/Urdu equivalence review, reviewer identity/signature and exact approved revisions UNVERIFIED.
- Academically approved ZERO; verified published ZERO; Paper Studio verified picker HOLD.
- No production deployment, DB schema/migration, paper import or official paper changes. SaaS Core exclusively certifies and deploys.
