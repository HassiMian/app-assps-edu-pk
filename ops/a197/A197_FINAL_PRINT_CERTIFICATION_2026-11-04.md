# ASSPS A197 — Final Daily Diary PDF and Release Continuity

Date: 2026-11-04
Production: https://app.assps.edu.pk/paper-generator
Live root: /var/www/assps-releases/diary-a195-controller-cert-20261104

## Automated browser Print-to-PDF

Actual Daily Diary print iframe HTML rendered to A4 PDF with synthetic students and Urdu/English tasks.

- Six-up, personalized five cards: one PDF page, no layout clipping.
- Eight-up, personalized five cards: one PDF page, no layout clipping.
- Six-up full generic sheet: six cards, one A4 PDF page, zero clipping.
- Eight-up full generic sheet: eight cards, one A4 PDF page, zero clipping.

Full-sheet PDF proofs are included in ops/a197/evidence/.

Independent PyMuPDF checks:
- One A4 page per full-sheet PDF: 594.96 x 841.92 pt.
- Six-up: 60,646 bytes, SHA256 begins 9e90f9408c1958d8eb.
- Eight-up: 62,869 bytes, SHA256 begins c719b23fdafb1eec3b.
- Jameel Noori Nastaleeq font embedded and Urdu visually rendered.
- School name and English content extracted, zero text rectangles outside page.
- Urdu Unicode text extraction did not reliably recover original Urdu. Searchability/accessibility is not certified.

Earlier A196 gates: five browser suites PASS, 448 combinations zero warnings, 20/20 production HTTPS 200, 213 CSS rules and zero browser errors.

## Future deployment safety

The live A195 feature history is about 857 commits ahead of old origin/main, which lacks the DailyDiaryWorkspace component. Blind whole-branch merging is unsafe.

A targeted guard from origin/main was created and pushed:
- Branch: safety/a197-diary-release-continuity
- Commit: 08f998c4
- Frontend source feature preflight and reachable production JS/CSS graph gate.
- Backend-only deploys unaffected.
- A195 source/build gate PASS.
- Old main and orphaned chunk deliberately BLOCKED.
- Adversarial Node tests 1/1 PASS.

Creating the PR via connected GitHub API failed with 422 "must be a collaborator". The branch is pushed, but the PR is not open and main not merged. To open for review:
https://github.com/HassiMian/app-assps-edu-pk/compare/main...safety/a197-diary-release-continuity?expand=1

## Honest remaining limitations

No live academic database writes occurred. Real principal-authenticated diary save/reopen, physical Ricoh/HP printing, and GitHub mainline reconciliation remain unverified. Owner-account/device access and SaaS Core review are required. Current A195 live application remains unchanged.

Conclusion: automated browser Print-to-PDF acceptance and non-destructive QA are complete. Manual owner/device and canonical integration are still outstanding.
