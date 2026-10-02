# ASSPS Paper Generator — Phase 3M: original native PDF full-page/A4 inventory

Date: 2026-10-02.
Exact clean pushed parent: Phase3L 10d695f3d57325ccf81252fc0dcf003d0cef042f.
Branch: feat/paper-independent-pdf-page-inventory-phase3m-20261002.
Scope: DORMANT opt-in, source-preserving, only explicitly selected original paper.
No production database, migrations, active renderer, current frontend or originals touched.

## Why: Phase3L still accepted manually claimed PDF page counts
A reviewer may accidentally enter 2 pages for a native 3-page PDF and miss
an entire original last page. Phase3D/3I check PNG shape and any plaintext
declared PDF MediaBox, not an independently verified EVERY-PAGE inventory.
Regexing /Count or guessing PDF objects is NOT a trustworthy full PDF parse,
especially for object streams, inherited page boxes and incremental revisions.
Phase3M therefore requires an externally independently approved, hash-PINNED
local PDF inspector. No tool is silently installed or downloaded.

## Actual PC capability inventory / readiness as observed in Phase3M
The remote Windows PC did not have accessible pdfinfo, pdftoppm, mutool, a
local pdfjs-dist/pdf-lib/pdf-parse dependency or Python fitz/pymupdf/pypdf/
PyPDF2/pdfplumber/pikepdf in the checked active Python interpreter.
Accordingly actual genuine principal PDF inspection remains BLOCKED.
No fake parser response may be called a completed human/native signoff.
The offline tests use transparently SYNTHETIC sample pdfinfo metadata strings.

## New dormant source files
al-siddique-backend/src/services/papers/paperPdfPageInventoryPhase3M.js:
- inspectOriginalNativePdf requires an explicitly selected absolute original
  native .pdf file and exact print SHA from successful Phase3K four-file intake;
  plus an operator-supplied absolute local pdfinfo.exe path and independently
  approved SHA-256 of THAT executable, not just a filename from PATH.
- Validates each file's realpath, symlink/hardlink state, size, exact SHA and
  mtime/identity both before and after inspection. Never reads generic
  user folders, original browser storage or any database.
- Invokes the binary by execFile with shell:false; fixed -box -f 1 -l 32
  arguments, bounded 15s and 256KB captured output; no programmatic package
  install, interpolated shell, PDF modifications, upload or logging raw title.
- parsePdfinfoA4PageInventory refuses absent/duplicated/inconsistent Pages
  metadata, page count outside 1..32, encrypted PDF/active JavaScript,
  missing or duplicate individually indexed per-page size/MediaBox/CropBox,
  nonportrait/non-A4 (approx 595.28x841.89pt), cropped sheets or omitted
  pages. All original pages must be individually accounted for. It binds
  report to exact input PDF SHA and pinned inspector executable SHA.
- Returns an inspection-only result; original signed-in browser provenance,
  content/print semantic parity, real reviewer signature, paper approval,
  production cutover and source mutation remain FALSE.

al-siddique-backend/src/services/papers/paperInventoriedReviewPhase3M.js:
- Binds the previous Phase3K exact four-file preflight SHA to a matching
  full PDF inventory; then automatically chooses the Phase3L review docket
  page count from the external inspector rather than reviewer estimation.
- Refuses mismatched source/native print SHA, missing/reordered pages, missing
  A4 full-sheet evidence or any attempted release-approval flag changes.
- Requires every counted original native PDF page in page-by-page human
  observation and preserves all original Phase3L visual checklist requirements.
- Envelope intentionally marks persistedInspectorInvocationCryptographicallyAttested
  FALSE; an unsigned JSON SHA only detects unintentional edits, it is NOT
  a signed attestation by a trusted reviewing authority. A saved workpack
  must be independently re-inspected at handoff; reviewer/source signoff is
  never automatically granted. Its observation SHA is recalculated after
  extending the original Phase3L payload, preserving internal consistency.

ops/paper-staging-review/phase3m-CREATE-INVENTORIED-review-workpack.cjs:
- Local one-shot 11-flag command for FOUR explicit same-original Phase3D files,
  original paper ID/scope/family, approved local pdfinfo.exe + its independent
  SHA, external source collector ref, distinct user-chosen PRIVATE output JSON.
- Runs Phase3K exact file verifier, then actual inspected native PDF, then
  Phase3M/3L page-count-bound workpack, then Phase3K original file SHA
  verification again before output.
- Refuses Git repository output, symlink/junction intermediate output folder,
  missing original files, missing/unpinned inspector and existing output file.
  Creates only a NEW exclusive private JSON (wx, mode 0600). Never edits or
  imports the originals. Console errors are redacted to avoid paper/teacher
  content, school scope, filenames and executable secrets.
- No Express route, public UI entry, app startup, DB pool, migrations or
  original renderer integration.

## Acceptance
- Phase3M parser synthetic tests: 7/7 PASS, including omitted final page,
  malformed, duplicated/missing size+MediaBox+CropBox, non-A4 and cropped
  pages, encrypted/JS PDFs, 33-page over-limit, wrong source or tool SHA and
  missing actual inspector.
- Phase3M review binding and explicit CLI tests: 7/7 PASS, including wrong
  PDF fingerprint, reordered/incomplete inventory, source release flag
  tamper, extra/missing per-page observations, complete SHA after extension,
  no-files/no-tool fails WITHOUT output and static no-network/shell guard.
- Full default-no-DB regression Phase3B–3M acceptance separately verified.
- NO actual principal-original PDF or installed inspector tested; never claim
  source-native real visual approval, trusted PDF metadata attestation, or
  actual encrypted persistent staging backup on the basis of fake fixtures.

## Mandatory release blockers remain
1. Principal selects actual current ORIGINAL signed-in source paper and
   provides Phase3D exact baseline DATA JSON + full native PNG + native A4
   Print/PDF + visual manifest from same exact source/revision.
2. Approved local PDF inspector available and SHA pinned, with actual native
   file inspected and human comparison of ALL original pages, font/RTL,
   marks/MCQ parentheses, assets, tables, clipping and native screen parity.
3. Genuine independent visual reviewer identity, live original provenance,
   signed attestation; no unsigned status or all-TRUE boxes grant approval.
4. Independently authorized persistent NONPRODUCTION staging DB inventory,
   real encrypted genuine staging backup and separately verified restore/
   global-role recovery, plus security-approved private production routing.
5. All existing approved original papers, original frontend, live print,
   school data, production DB and migrations remain immutable. No auto
   deployment or manual test SQL imported from synthetic-only phases.
Continue exact Phase3N from final pushed Phase3M HEAD; no restart of Phase3A–M.
