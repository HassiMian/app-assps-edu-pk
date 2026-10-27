# ASSPS Term Lesson Planning V3 - corrected teacher statements and A4 print (27 October 2026)

## Previously identified defects and REVIEW-ONLY fixes
1. Term default text compressed original multiple teacher statements into a generic one-line instruction. Now it preserves ALL distinct original-language teacher notes in their source order with newlines. Academic source IDs, units, original page ranges, teacher edits and review state remain protected; no invented source facts.
2. Term print CSS silently forced school heading, subject and body text sizes to smaller values than Principal selected. The new CSS honors configured body, header, subject, subject weight and line-height variables without hidden reductions.
3. Previously extra-long real statements could neither fit nor print because the fixed A4 sheet clipped content and the print function refused overflow. Now printer-only reflow permits multiple A4 pages for oversize content; normal shorter sheets retain selected students-per-page.
4. Chrome popup load listener was registered after document.close and might miss the load event, leaving blank print window. Listener now installs before document write, ignores initial blank tab load, and prints once after fonts and images are ready.
5. Actual original Second Term facts remain source-bound; First and Third Term are visibly UNSOURCED teacher proposals. Print never publishes academic records, and logo/assessment hard gates are preserved.

## Verified isolated QA
- 28/28 term model, provenance, source text and print regression tests PASS.
- 8/8 existing lesson plan recovery/client tests PASS.
- 79/79 Python release unit tests PASS.
- Isolated real Chromium printed synthetic long teacher statements across 12 A4 pages, preserving body 16px, school title 22px, subject title 15px, and overflow visible. This is SYNTHETIC QA, not a user-specific approved academic plan.
- Frontend production Vite build PASS.
- NOT deployed to production. Signed Core owner-approved release, true School1/School2 authentication, live Principal Save/Reopen/Print, physical new printer witness, approved pilot content and full rollback still outstanding. Never replace protected live results/marks or force bypass.
