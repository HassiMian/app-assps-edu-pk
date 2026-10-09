# ASSPS Grade IX–X Academic Master — Chemistry X conceptual editorial packet (9 October 2026)

## Verified continuation

Resumed from issue #4 after exact clean Academic branch and GitHub origin `1bdf329b0a575bbba7e8839cbed0aa4423f661d7`, following the complete 2,581-candidate source-evidence reconciliation. Previous Physics IX conceptual review, Chemistry IX MCQ editorial, Biology IX Urdu translation and generic Question Bank review/authorization gates were **not** repeated. This batch is distinct: original authored **Grade X Chemistry**, 65 real existing question drafts.

## Evidence and academic scope

The actual `chemistry10Starter2026.json` has **65 existing provisional questions**: 26 MCQs, 26 short, 13 long over 13 chapter allocations. Its original source file SHA-256 `ef2917a8fc5ea030992d5f15df2493b7422954463ee4d54c25414fc81af706a1`; claimed original school research source record `pectaa-recovered-chemistry10-en-2026`, registry PDF SHA `64fcd73190ad12858ff756a2fcfde6cdf8f108cc0b318d55999554cf4f53aed6`. Matching source ID/hash means metadata identity, **NOT actual school-adopted edition, original physical book page, or verified board examination year**.

New `ops/qbank/audit-chemistry10-conceptual-review.cjs` explicitly lists **six original question IDs** needing subject-specialist conceptual precision review. Records contain original individual question and entire file SHA hashes, chapter/topic, risk classification, rationale and an independently testable faculty review checklist; **no original question text, entire answer key or textbook passage** is copied into this report.

1. `X-CHEM-C15-M02`: alleged textbook room-temperature molar gas volume must state source-adopted temperature/pressure conditions; the value alone is context-sensitive.
2. `X-CHEM-C18-M01`: describing salts simply as ionic compounds is overly broad and may include nonsalt ionic compounds; check board definition and distractor discrimination.
3. `X-CHEM-C21-M01`: organic chemistry carbon scope can wrongly imply all carbon oxides/carbonates count; specialist should confirm clear appropriate boundary.
4. `X-CHEM-C21-S01`: homologous-series model answer does not explicitly mention successive CH₂ increment; review textbook criteria and mark scheme.
5. `X-CHEM-C16-L01`: electrochemical electrode roles need distinguish oxidation-at-anode / reduction-at-cathode from different galvanic/electrolytic electrode sign conventions.
6. `X-CHEM-C23-S02`: ethanol oxidation products (aldehyde vs carboxylic acid) require condition-dependent intermediate/product distinction.

All are **research editorial proposals**, not claims that the original answers are proved wrong. A qualified independent Chemistry teacher must verify actual syllabus, scientific answer and marks for each before amendment. The 59 unflagged questions are **not** independently certified; absence of these six cautions is not human QA approval.

## New reproducible integrity guard

Before the source pin, 2 new tests failed: modifying either flagged or unflagged original answers while recomputing source bytes could silently preserve hand-authored editorial observations over altered content. Full source file SHA is now pinned to the unmodified authentic authored draft bytes, and parsed source object must agree with those bytes. Any input drift fails `CHEM10_STALE_OR_CHANGED_ORIGINAL` before proposal regeneration, requiring new independent editorial triage. No original authored data was edited. The new editorial packet also requires intact 65-question original scope and source ID/declared hash. Individual proposal hashes bind exact original candidate content.

Nine new synthetic/repo-backed tests cover file SHA pin, flagged and unflagged answer edits, typed/duplicate IDs, unsafe publication/import, claimed PDF provenance, distinct 65-question counts, no copying text and no false academic approval. **7/9 baseline PASS, 2 new source-staleness RED; 9/9 after fail-closed pin PASS**.

## Release and verification

This packet does not move any of the original **2,581** candidate questions to verified, independently reviewed, approved or published status. School adoption ledger and physical page ledger remain uncertified and empty. No school textual answer key, actual official paper, copyrighted book pages, connected frontend, Core authenticated backend, roles/RLS, migration, production seed or production deployment changed.

**Next genuine academic actions:** Qualified Grade X Chemistry reviewer confirms these six editorial concerns against ASSPS-adopted 2026–27 textbook/session and exam scheme; correct proposals are then independently reviewed on a new immutable revision. Meanwhile real school textbook adoption/printed page/exercise and bilingual verification remain required. SaaS Core alone owns deployment after release certification.

## Final actual tests and isolated-state certification (source unchanged)

- New independent Chemistry X actual question/answer SHA-bound editorial tests: original prepin baseline **7/9 PASS, 2 FAIL**, proving a modified original question/answer could silently inherit stale editorial observations; post-fix **9/9 PASS**, exit **0**, 0 fail/skip/cancel. Original source file SHA immutable pin and exact JSON-parse/raw-bytes consistency both required. `/tmp/assps-grade910-chem10-editorial-targeted-20261009.tap` and independent `.exit`.
- Full inherited Academic Grade IX/X focused source/provenance/reviewer/security/MCQ/Urdu/numerical regression on final source **178/178 PASS**, 0 fail/skip/cancel, process exit **0**, 40.91 seconds; `/tmp/assps-grade910-chem10-editorial-focused-20261009.tap` and `.exit`.
- Full original Grade IX/X staging question contract suite **510/510 PASS**, 0 fail/skip/cancel, process exit **0**, 50.91 seconds; `/tmp/assps-grade910-chem10-editorial-staging-20261009.tap` and `.exit`.
- JS syntax and staged Git whitespace checks passed. This verifies a **read-only specialist review preparation** on the 65 already-authored drafts; neither a live database review nor authentic school-approved textbook/page/academic signoff. The curated concerns remain **six provisional proposals; exactly zero human reviewers or approved revisions**.
