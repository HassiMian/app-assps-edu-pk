# Paper Studio Master: full canonical corpus + actual Windows Urdu PDF font proof

**Date:** 2026-10-16. **Base:** `integration/core-paper-marks-safe-20261016@05a59127e43cdcd2ee3a6b26694b8d798efef4d3` (clean, GitHub origin equal at preflight). Scope is **test tooling and evidence only**, not production deployment, school records or protected paper modification.

## Fresh independent execution

1. Real Chromium canonical corpus: `cd al-siddique-frontend && node --test src/Modules/Paper-Generator/PaperEditor/tests/canonicalAll43RenderPrintAcceptance.test.js` — **43 of 43 source reference papers PASS** within one Node test, `pass 1`, `fail 0`, `skipped 0`, total about 174 s. Validates all rendered structures, 242 sections, screen/print text parity, Urdu/RTL CSS stack, browser errors and overflow. Private execution log: `/root/paper_studio_private_qa_20261016/full43-20261016.log` (outside Git). No physical printer job.
2. **Same latest source**, not older a2ff-only candidate: isolated QA worktree at `05a59127` with existing optimized dist SHA256 `1097d23897e1bc507a111c4c202aba47a54960e27cf62f34234f95e32e0c26e3`, separate root-private production **schema-only** PG16 export, `pg_virtualenv` temporary clone, synthetic authorized teacher real Express/HTTP/Chromium test **1/1 PASS**: teacher login, Paper Studio, server revision Save, Reopen, Chromium PDF print, denied no-permission actor. Temporary DB cluster destroyed. No production rows, credentials, paper data or permissions changed. QA runtime created two unrelated untracked Argus JSON records in isolated worktree; preserved without cleanup or commit.
3. Urgent gap: VPS Chromium's CSS `font-family: 'Jameel ...'` did **not** establish that Jameel existed on the Linux QA host (`fc-match` fallback Noto Sans; no local Jameel files). Tested Windows workstation where privately installed `Jameel Noori Nastaleeq Kasheeda.ttf` is present. New self-contained PowerShell verifier makes a disposable **non-school-content** local Chrome headless Urdu PDF, asserts `%PDF-`, sufficient bytes, `/BaseFont` Jameel subset and embedded `/FontFile2` or `/FontFile3`, and deletes all temporary generated PDF/profile data. No font asset is distributed or committed.
4. Windows real execution: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ops/paper-studio/verify_windows_jameel_pdf_embedding_20261016.ps1` — `WINDOWS_LOCAL_JAMEEL_EMBEDDED_PASS_NOT_RELEASE`, **exit 0**, embedded-subset true, font-file true, 87,807-byte synthetic PDF, SHA256 `8bf38341629e0b6dc74e6574bf2548776a1af96c71cac8145a7958150dcc7eef`. Negative no-user-font-path test — `HOLD`, `JAMEEL_LOCAL_FONT_NOT_FOUND`, **exit 2**. The script uses UTF-8 BOM for Windows PowerShell 5 Urdu text compatibility.

## Release limitations

This proves installed Windows print engine can embed Jameel for a *synthetic* Urdu probe, **not** actual production paper's on-paper fidelity, actual owner physical hardcopy, independent signed offhost restore, production signed backend adapter, genuine School2/subject-denial signoffs, or official Core 13/13 approval. The accepted live static root remains distinct from the newer 5/5 candidate; do not deploy from this audit branch. Core alone owns official release. No Grade IX–X provisional bank approvals are inferred.

## Non-destructive repeatability

- Repeat 43-corpus Chromium source suite on candidate/isolated runner with adequate timeout (>=240s). Original 180s wrapper finished at ~174s.
- Run Windows PowerShell script on actual intended print workstation. It prints **only JSON verdict and hash**, never exports font files or hidden personal data; no printer queue touched. A different workstation must be independently checked.
- Require real authenticated printer and role acceptance plus signed security/rollback evidence before any production promotion.
