# Paper Studio MASTER — Real canonical Word/DOCX A4 Urdu/Jameel and marks acceptance

**Date:** 16 Oct 2026 ~20:20 Pakistan time. **Owner:** Paper Studio MASTER. **Release authority:** SaaS Core only. **Status:** reviewed isolated source fix, production HOLD. Original Core/Connect/Academic worktrees and school data preserved; do not deploy directly from this branch.

## Latest reviewed ancestry and source scope

Isolated Paper QA worktree based on the most recent clean reviewed Paper descendant available at start, `fix/paper-diary-revisit-isolated-auth-20261016@c864ac79091252019bdbdf5461a0a4460fd51c9c`, which descends from the canonical integrated rich-heading/Core candidate `2a3d5bac`. Actual Core simultaneously owns a newer *separate, not yet release-authorized* marks Save 401 hotfix: `hotfix/core-marks-save-401-rls-catalog-20261016@5b4bce2d48d18a886f3c272a0c33ac6cd1681ac0`. This Paper patch must not overwrite/rebase/reset the Core hotfix or its live production rollout. GitHub issue #4 remains coordination authority.

## Real fail-before product defects — not a CSS-only claim

The existing canonical Word exporter `al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/export/canonicalDocxExport.js` generated valid zipped Office Open XML but its Urdu RTL text runs defaulted to `Noto Nastaliq Urdu`. Canonical Paper Workspace and official Urdu/RTL printing requirements lock to **Jameel Noori Nastaleeq**. Existing 6/6 DOCX tests inspected structure/RTL but not the actual emitted Word `w:rFonts` family. Added a binary ZIP `word/document.xml` regression and executed it **fail-before**: 2 existing DOCX binary tests passed and the new Urdu font check failed explicitly (`Real Urdu DOCX is not specifying the canonical Nastaleeq font on text runs`).

A second genuine exporter defect was found in `marksSuffix`: it used `Number.isFinite(Number(value))` and therefore turned `null`, empty string, whitespace and boolean `false` into **fake printed `[0]` marks**. Executed a separate fail-before real binary DOCX fixture with a missing section total and missing short-question marks, which failed (`Missing marks were silently converted into printable zero marks`). Existing numeric zero marks must *remain* numeric zero rather than be silently treated as blank. This is about print-label correctness, **not** database exam result rows.

## Narrow scoped correction

- Word document runs now request the font family **`Jameel Noori Nastaleeq`** for RTL/Urdu; English continues Times New Roman; equations retain Cambria Math and vertical operations Courier New, independent of language. The `docx` library outputs the family explicitly in all OOXML font attributes (`w:ascii`, `w:cs`, `w:eastAsia`, `w:hAnsi`). Existing `<w:bidi/>` paragraph RTL and `<w:rtl/>` text RTL preserved. No font binaries are bundled, uploaded or distributed. Word/physical print will substitute if an authorized workstation lacks the registered family; on-device font installation/visual paper signoff are not certified by binary metadata.
- Marks suffix is now created **only from genuinely numeric or nonblank numeric-string values**; `null`, undefined, blank strings, whitespace and boolean false must not turn into `[0]`. Explicit valid numeric `0` still prints `[0]`. No question text, section hierarchy, paper metadata, source question bank, marks records or protected classroom data were changed.
- Full real zipped Office OOXML tests verify canonical **43/43** official First Term papers (17 Urdu, 26 English), including their actual page `<w:pgSz w:w="11906" w:h="16838" w:orient="portrait"/>` A4 definition, subject text, expected language run font and RTL tags; model still preserves 1,027 canonical nodes across 15 types and 315 tables (and arithmetic/model mathematical assets). New adversarial missing-versus-zero/false/whitespace test protects the marks contract.

## Fresh execution evidence and qualification

From this isolated source, actual `node --test` for binary DOCX, DOCX/math assets and full-corpus model: **9/9 PASS**, 0 fail/skip, including fresh 43/43 binary OOXML export. Root-private log `/root/paper_studio_private_qa_20261016/docx-jameel-full43-final.log`; exact commands:

```sh
cd al-siddique-frontend
node --test src/Modules/Paper-Generator/PaperEditor/tests/canonicalDocxBinary.test.js \
  src/Modules/Paper-Generator/PaperEditor/tests/canonicalDocxMathAssets.test.js \
  src/Modules/Paper-Generator/PaperEditor/tests/canonicalDocxModel.test.js
npm run build
```

Fresh isolated production Vite build exit0 (~8.97sec), HTML SHA256 `43c57b403c09c915cc660477c3c82c4c882b8c1df3a707f05372c65eeb23c7ac`, candidate five static feature checks **5/5 PASS** with `productionReleaseAuthorized:false`. The original `npm ci` invocation exceeded the terminal response timeout, but an independent log recorded completion of **315 exact dependencies** in 54sec and subsequent Node tests plus Vite build passed. No false assertion of an observed npm command exit code was made.

Added a scoped read-only GitHub Actions job for real DOCX binary/corpus, frontend build and five-feature static checks. Remote CI can only be called green after an observed official workflow result. Existing 43-paper Windows Chrome actual embedded-font PDF test is a separate earlier acceptance; this execution checks DOCX **font requests** not embedded Windows Jameel hardcopy or actual printed sheets.

## Mandatory release HOLD / preserve live school records

Newer SaaS Core production work must first reconcile the marks-save-401/RLS release hotfix against its own signed review. No Core branch overwrite, public cutover or Nginx reload is authorized here. Persistent reviewed live worker, independent off-host signed restore, real live teacher/School2 subject-access denial, official 13/13 Core gate, rollback acceptance and hardware Urdu Print remain separately required. Production marks, result zero-versus-blank, historic First Term papers, protected Diary controllers and all tenants remain untouched. Any merge should forward-port *only* the two scoped exporter/test code files and QA artifacts to latest verified Core descendant and re-execute the full release gate there.
