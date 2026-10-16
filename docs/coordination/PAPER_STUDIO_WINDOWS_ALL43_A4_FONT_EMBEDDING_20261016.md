# ASSPS Paper Studio — Windows A4 PDF parity across all 43 canonical First Term papers

**Execution:** 16 October 2026, isolated Windows workstation Chrome + loopback-only VPS Vite QA harness. **Verdict:** `WINDOWS_CANONICAL_PDFS_PASS_NOT_RELEASE`, 43/43 actual generated PDFs PASS. This is independently re-readable machine evidence, *not* deployment or physical-paper approval.

## Source ancestry and protected ownership

- Source is an isolated worktree based on Core's clean security-review descendant `audit/core-effective-grants-role-graph-20261016@984655411a78cca7251e2102dd1751258c6f208d` and forward-ports the existing Paper Studio canonical Windows 5-paper QA commit `62621f6e...` as `e6593874...`. Core subsequently produced an even newer **separate** backend-security commit `3b7f6b24` while this full-corpus task was underway. Neither source is production release authority; forward-port these Paper QA files to Core's newest reviewed descendant only through issue #4.
- New code: `ops/paper-studio/emit_windows_canonical_manifest_20261016.cjs` (reads existing untouched canonical corpus; exports only document ID/direction/font expectation and corpus SHA); optional `ASSPS_CANONICAL_MANIFEST` support in `verify_windows_canonical_chrome_cdp_20261016.cjs`; portable adversarial tests; dedicated GitHub workflow for **offline tests only**. No private font binaries, teacher identities, question text, school papers, scores, auth tokens, test PDFs or browser profiles committed.

## Machine results: actual Windows Chrome PDF, all 43

- Canonical collection: **43 documents**. **17 RTL Urdu-category** (including Islamiyat/Tarjuma/Social Studies where language is Urdu) and **26 English LTR**. All 43 had correct `dir`, CSS language-family, nonempty live DOM and acceptable horizontal overflow. All 43 Chrome DevTools Protocol `Page.printToPDF` returned genuine A4 `%PDF-` bytes with `/MediaBox` geometry, actual `/FontFile2` or `/FontFile3` PDF font embedding and **Jameel Noori Nastaleeq Kasheeda** subset for RTL, **Times New Roman** subset for English. Each paper had one locally mocked, no-store `/api/` response and one external browser request explicitly denied; none used authentic school credentials or live API.
- **Machine-reported counts:** `PAPER_COUNT=43`, `RTL=17`, `LTR=26`, `A4_COUNT=43`, `FONT_EMBEDDED_COUNT=43`, `EXTERNAL_BLOCKED=43`, `RELEASE_AUTHORIZED=False`, `ERROR_BYTES=0`. Total emitted ephemeral Chrome PDF bytes **13,034,445**. The runner destroyed its private temporary browser profile and did not queue physical printing.
- Root-private machine receipt (case IDs, hashes and boolean checks only): `/root/paper_studio_private_qa_20261016/full43_windows_a4_receipt_20261016.json`, file SHA256 `58850d3a17926e0fd32b6bb5aebf2338a394bc91ab25bc18621e65375e07d868`, chmod 0600. Do not treat PDF SHA256 as stable across Chrome runs; per-file Chrome metadata can vary.
- Per-case progress instrumentation and explicit tab target disposal have been added for memory-bounded future runs. The **full 43/43 above** was on the prior runner version (Chrome torn down at end). Regressed the updated tab-cleanup runner separately with **5/5 actual Windows PDFs PASS**, Jameel/Times subset plus A4, progress 5/5. Did not mislabel those five as a second 43-paper execution.
- Portable **manifest tests 4/4 PASS**: correct existing 43-paper corpus, metadata-only export, reject truncated/duplicate/bad language source; Windows reader reject modified count, fake font, duplicate ID, bad SHA or symlink. Real latest descendant marks/Diary tests 8/8 PASS; current live RLS catalog `CATALOG_PASS_NOT_RELEASE`; current live Core effective-role audit `ROLE_GRAPH_PASS_UNSIGNED_NOT_RELEASE`, 15/15 hermetic tests PASS. None grants release certification.

## How to reproduce without staff input or real paper mutation

Generate metadata-only manifest on VPS source:

```sh
node ops/paper-studio/emit_windows_canonical_manifest_20261016.cjs > /root/private-qa/manifest.json
node --test ops/paper-studio/test_emit_windows_canonical_manifest_20261016.cjs
```

Run Vite **isolated on 127.0.0.1**, with a separately authenticated loopback-only Windows SSH forward. Copy the QA verifier script and **metadata-only** manifest privately to Windows, set `ASSPS_CANONICAL_MANIFEST` to manifest path, execute `node verify_windows_canonical_chrome_cdp_20261016.cjs`. Expected strict verdict: `WINDOWS_CANONICAL_PDFS_PASS_NOT_RELEASE` and 43 results; nonzero/HOLD on any gap. The runner has no credentials, uploads, file exports, access to school student content, or printer jobs. Keep public app/API unchanged. Teardown the test Vite process and tunnel after verification.

## Non-negotiable release HOLD

This verifies *isolated canonical preview* font fidelity only. It does **not** prove genuine live teacher or School2 login; production signed restricted worker; independently signed off-host restore, rollback, or tenant/subject denial; server-to-client print differences; printer drivers/toner; or physically inspected paper. It also does **not** approve Grade IX/X academic content. SaaS Core release owner must independently reverify live source, offsite signatures, adopted backups, backend worker, tenant security, real Save→Reopen→Print and full official 13/13 release gates before cutover. No production DDL/DML, marks changes, Nginx reload, migrations or physical print jobs executed by this QA.
