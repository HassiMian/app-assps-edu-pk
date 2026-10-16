# Paper Studio — real Windows Chrome canonical Urdu/English A4 PDF proof

**Date:** 16 October 2026. **Origin:** reviewed Core paper/marks candidate `integration/core-paper-marks-safe-20261016@05a59127e43cdcd2ee3a6b26694b8d798efef4d3`. Prior QA parent: `audit/paper-urdu-real-font-proof-20261016@0b850decdb8ecc46addf85dea29ec6ea81ee953d`. New branch `audit/paper-windows-canonical-a4-proof-20261016` contains a single additional QA script and this handoff. No application source files, academic paper data, backend, database grants, Nginx or production deployment changed.

## Confirmed regression of the earlier QA *method*, and fix

- Initial Windows Chrome `--dump-dom` and bare CDP `Page.printToPDF` incorrectly returned login/Arial PDF or stalled, even though VPS Chromium 43/43 canonical paper rendering passed. CDP diagnosis showed `location.pathname === '/login'` after paper initialization. **Root cause in the QA harness:** Windows CDP had not installed the same synthetic `**/api/**` route fulfillment as the existing isolated Playwright test. An unauthenticated API response caused redirect away from `/b3-test.html`. This does **not** establish a real production authentication defect.
- Corrected standalone Windows Node 24 Chrome DevTools Protocol QA instrument starts Chrome with a disposable profile, intercepts all requests at `Fetch.requestPaused`, returns a synthetic no-store JSON 200 for `/api/` fixtures, permits only specified `127.0.0.1:<PRIVATE_VITE_PORT>` browser assets, and blocks all other outgoing network requests. It verifies no redirect, valid canonical DOM and CSS direction, PDF signature, actual embedded font subset (`/BaseFont` plus `/FontFile2` or `/FontFile3`), A4 media box and sufficient PDF size. Entire Chrome process/profile is cleaned up by the script. No PDF or font file is stored or uploaded.
- QA setup uses a disposable loopback-only Vite server on the VPS (`127.0.0.1:5681`) through a private authenticated workstation SSH `-L 5681:127.0.0.1:5681` tunnel; **not** live app/API endpoints. Node script rejects non-Windows hosts, malformed QA port and missing QA HTTP. It labels all successes `PASS_NOT_RELEASE`.

## Fresh actual Windows acceptance

`node ops/paper-studio/verify_windows_canonical_chrome_cdp_20261016.cjs`, tested on authorized Windows workstation with locally installed private Jameel Noori Nastaleeq Kasheeda font. **Exit 0, `WINDOWS_CANONICAL_PDFS_PASS_NOT_RELEASE`**, actual canonical B3-derived papers:

| Source paper | Direction | PDF bytes | Observed result |
| --- | --- | ---: | --- |
| Class 1 Urdu | RTL | 469,169 | A4, embedded Jameel font PASS |
| Class 6 Urdu | RTL | 472,848 | A4, embedded Jameel font PASS |
| Class 8 Tarjuma-tul-Quran | RTL | 412,933 | A4, embedded Jameel font PASS |
| Class 1 English | LTR | 223,711 | A4, embedded Times New Roman font PASS |
| Class 8 English | LTR | 189,167 | A4, embedded Times New Roman font PASS |

All five cases intercepted at least one synthetic API request and blocked one external request; none reached production APIs. Output SHA256 differs between runs because Chromium PDF metadata can vary; verifier checks content-invariant assertions instead of requiring fixed PDF bytes. A separate fail-closed negative run with `ASSPS_PRIVATE_VITE_PORT=5699` and no QA harness returned **HOLD / `QA_HARNESS_UNREACHABLE`, exit 2**. The prior standalone local synthetic Jameel-only font gate also passed its missing-font denial.

Existing **latest source** historical acceptance prior to this change: full 43/43 official first-term canonical papers rendered with screen/print text parity on VPS Chromium (one test, 43 document assertions); real isolated PostgreSQL 16 teacher login → Save → Reopen → A4 PDF plus unauthorized access denied 1/1 PASS on disposable schema-only clone. These remain distinct from Windows results above.

## Release and scope constraints

- **No physical school printer/hardcopy test was performed.** Font embedding evidence is for actual *canonical browser previews* from an isolated Vite harness, not authenticated live production print flows, local printer driver, preview-to-hardcopy fidelity, all school documents, or a general rollout certificate.
- Existing official First Term documents and live marks/results (including numeric zeros) were not edited. No Grade IX–X provisional bank content was approved or selected. No font binaries were copied, shared or committed.
- Frontend candidate requires current SaaS Core release ancestry check and real independent recovery, restricted signed worker, tenant denial, physical acceptance and **official Core 13/13 gates**. Green Paper Studio QA does not grant production promotion. This is a reversible, documentation-and-test-only commit and must be coordinated in GitHub issue #4.
