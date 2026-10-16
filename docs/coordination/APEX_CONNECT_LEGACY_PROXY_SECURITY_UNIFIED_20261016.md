# APEX Connect MASTER — unified mission continuation: legacy API proxy fails closed

**16 October 2026, Pakistan time. AUTHORITATIVE RELEASE DECISION: HOLD_NO_PRODUCTION_CUTOVER.**

## 1. Source continuity / one mission

Continues earlier unified five-phase Connect checkpoint [APEX_CONNECT_UNIFIED_AUTONOMOUS_MISSION_CHECKPOINT_20261016.md](APEX_CONNECT_UNIFIED_AUTONOMOUS_MISSION_CHECKPOINT_20261016.md) and central GitHub coordination issue #4, *not* a restart. The latest independently built clean standalone Next source was `fix/connect-mail-html-escape-20261016@e776d8f15350f62708ed55f6b7cd9fbdfc636ec3`; this round created isolated direct descendant **`fix/connect-legacy-proxy-guard-20261016@20ebae71ca438ad1590720ac93ff1ed9d59fedd7`**. Standalone Next source has **no GitHub remote**, so no false claim of its independent application SHA on GitHub. Its exact two-file reversible patch is checked into the official ASSPS GitHub coordination branch descending from `fix/connect-mail-html-escape-handoff-20261016@3206b4748589d09eea082324134813a11920c47c`.

Exact immutable patch: `ops/connect/recovery/reviewed-next-legacy-proxy-20261016.patch`, SHA256 **`eeb08d15032c2aad19efa536098131f0687d8430b1af12c7e4ce178516407b7c`**. Verified `git apply --check` on exact original e776, and reverse `git apply --reverse --check` on fixed 20eb, both PASS. Changed standalone paths ONLY `src/app/api/proxy/[...path]/route.ts` and `tests/apex-legacy-proxy-failclosed.test.cjs`. No Core/Paper/Academic ownership overlap or production modifications.

## 2. Newly reproduced source defect

Legacy `/api/proxy/[...path]` compatibility route directly allocated `request.arrayBuffer()`, `response.json()`, or `response.arrayBuffer()` without size ceilings, returned JSON 200/401 without explicit private/no-store, and constructed an upstream target from raw decoded path fragments. Untrusted dot/delimiter segments could be normalized or change path/query interpretation. Upstream invalid JSON resulted in a 503 instead of a deliberately sanitized 502. HTTP204 was mishandled by wrapping an invalid response body. These are **source-level risks**; no real tenant leak, exploit, external connection, or historical 204 incident has been proven.

The canonical general `/api/[...path]` gateway already implements separate protected limits; preserve its current owner-reviewed behavior. This fix protects only the legacy compatibility route without changing canonical school data ownership, SaaS authentication, JWT, grants or RLS.

## 3. Exact code behavior repaired

- Require validated path segment count/length; deny dot, slash/backslash, query/hash, control or ambiguous percent sequences before any upstream request, then encode individual safe Unicode segments.
- Enforce **32 MiB standard** and **128 MiB large Paper/upload** request and response ceilings. Stream budget checks work even without declared Content-Length. Invalid or oversized inbound requests receive 400/413 before contacting Core; oversized/invalid upstream JSON returns sanitized 502 without reflecting sensitive HTML or unlimited buffers.
- For all JSON and binary statuses return `Cache-Control: private, no-store` and `Pragma: no-cache`; handle no-body HTTP204/205/304. Preserve approved Authorization forwarding only to configured canonical API; reject invalid backend config and request redirects with `redirect: 'manual'` to avoid forwarding sensitive headers offhost. Set 30-second ordinary and 120-second large workflow upstream timeout without changing expected paper functionality.
- Never generate, modify, cache or own canonical marks, results, paper documents, academic approvals or other tenants' records.

## 4. Actual tests and limitations

**Before fix:** Executed the same 9-case TypeScript-transpiled test suite against the exact unchanged e776 source with stubbed backend, **0/9 PASS, 9 expected FAIL; process exit1**. No actual student records or backend fetch.

**After fix:** New 9/9 focused proxy tests PASS, including JSON200/401 private no-store, unsafe path rejection without upstream call, declared 40-MiB JSON response rejection before reading, malformed JSON safe failure, HTTP204, undeclared 33-MiB streamed body budget, oversized upload request refusal and normal Unicode/query forwarding. Complete Next synthetic CJS+MJS Node regression **128/128 PASS**, scoped ESLint **exit0**, full project independent TypeScript `tsc --noEmit` **exit0 after required build-provenance generation**, and fresh optimized **Next.js 16.2.6 `npm run build` exit0**, including TypeScript, static pages and postbuild normalization. One earlier bare independent TSC attempt could not resolve `@/generated/buildProvenance` before its normal generator ran: that setup failure was corrected, not silently counted as green.

Compiled **PRIVATE** Build ID **`91l6KJsI2x_oOVXPQjUd5`**. Root-only build log SHA256 **`47706b5b3b529f5c0164257fe287d0867b0889406f62df9c6919eb03c2a15b1e`**.

Reused the existing isolated private Next HTTP acceptance runner, adding only byte-pinned exact `20eb` source SHA, Build ID, eslint.config SHA and two changed source/test file digests. Strict **11/11 real loopback HTTP checks PASS RC0**, anonymous login200, unauthenticated dashboard/teacher redirects and protected APIs401. Root-only private result SHA256 **`68e4a6de75d459ef1cf8192291d81ce124065c6e733ebfc686e27d608fa44fc0`**. Detached private server terminated. Real Chromium headless login screenshots generated and PNG dimensions verified at **mobile 375×812, tablet 768×1024 and desktop 1440×900**. This is **render existence**, not signed genuine teacher/School2 acceptance or human-reviewed UI layout.

The unified coordinator's expanded offline Python tests (including two anti-allowlist tests and four immutable exact patch/ownership tests) **309/309 PASS**. GitHub Actions workflow push and pull-request path triggers now include the new patch/test/report, and source-only CI runs the new immutable contract. Local YAML parse PASS. **No hosted GitHub Actions green has been verified.**

## 5. Integration and HOLD without shortcuts

Public production Connect remains compiled Build ID **`ONDwxEIZlx5onDIKY7wYf`** from independently observed VPS `/var/www/apex-connect`, not this private candidate. Frontend HTTPS200, Connect login200 and active PM2 observed; no production cutover, load balancer edits, credential reads/resets, real mail, database DML/DDL/permissions, Marks Save changes, physical Diary print, worker or SaaS Core restart was performed.

SaaS Core's latest independent coordination now records current same-host full PostgreSQL archive and genuine disposable restore, but **not separately signed offhost ACL/ownership recovery**, and the official 13-signature release gate still **6/13 HOLD**. Real positive teacher Marks Save→GET, genuine independent peer-school denial, signed restricted global worker transport, separately authenticated worker, inherited grants and full rollback/physical printing have not been certified. Unsaved Class One marks are NOT recoverable from guesses; preserve all 152 old Class One First Term scores, six numeric zeros, and the separately documented 1,763-result/213-zero production baseline. Any Core numbers are inherited signed owner evidence, not new Connect DB reads.

**Only acceptable promotion path:** Core owner independently verifies the latest live source ancestry and current recovery state, applies the exact reviewed source patch to the correct modern Connect descendant with full integration tests, then signs the missing required live authority checks and performs rollback-ready promotion/postflight. User delegation permits routine technical work, not fabricated independent witnesses or tenant authorization bypass. No scheduling, school marks writes, credential access, or production deployment were attempted.
