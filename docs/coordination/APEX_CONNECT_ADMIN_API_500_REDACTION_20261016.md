# APEX Connect — SaaS administrator error-boundary hardening, 16 October 2026

## Latest source and ownership

This is a Connect-only isolated security hardening and QA checkpoint; it does **not** authorize a production release.

- Integrated coordination base: `integration/connect-core-marks-safe-05a-20261016@8ccee2f932266454b73aa10977f0bcbf8d637758`.
- Standalone private Next source parent `fix/connect-admin-csv-error-redaction-20261016@eb007ae1d2c539b6f20095ebc832605c0b5ac6e2`.
- Standalone repaired Next source `fix/connect-admin-api-error-boundaries-20261016@cecdcebd8e244cc73b784abaafc250f8ee8955cd`. The standalone Next repository has **no configured GitHub remote**; the portable patch and exact file checksums are published in the ASSPS coordinated Connect GitHub branch instead. No fabricated standalone remote commit.
- Separate authoritative Core/Paper technical candidate currently `integration/core-paper-marks-safe-20261016@05a59127e43cdcd2ee3a6b26694b8d798efef4d3`, compiled index SHA256 `1097d23897e1bc507a111c4c202aba47a54960e27cf62f34234f95e32e0c26e3`. This Connect change does not overlap Paper Studio or change canonical PostgreSQL permissions.

## Reproduced security defect and exact repair

Previous two administrative CSV export routes already had formula-cell injection, canonical status filter and HTTP500 data-redaction fixes. The subsequent read-only source audit found **nine more authenticated SaaS-admin API handlers** still returning arbitrary internal `Error.message` from unexpected backend exceptions directly in public HTTP500 JSON. Some of these messages can contain storage paths, SQL details or internal diagnostics. No production exploitation was attempted.

The scoped changed endpoints are Apex leads list/stats/follow-up/status; gateway sandbox/setup; subscription request stats/bulk-approve/approve. On these nine endpoints only, unhandled HTTP500 now returns fixed text `Administrative request temporarily unavailable` and `Cache-Control: no-store`. Existing explicit `Unauthorized` HTTP401 and `Forbidden` HTTP403 branches remain unchanged; status-specific HTTP400 and HTTP404 logic and successful admin workflows stay unchanged. No new authentication mechanism, broad shared middleware or protected DB access is introduced.

A new synthetic-only Node test covers the exact nine route source contracts, and actually evaluates six of their handler bodies with TypeScript transpilation and mocked backend/auth. It verifies backend exception secrecy, no-store and 401/403 short-circuit before backend invocation. No real school or staff record is read. Previous CSV helper, status and error regression tests remain intact.

## Actual test and build evidence

- Scoped Nine-Route Node synthetic/regression + earlier CSV: **31/31 PASS**.
- Scoped ESLint on modified administrative API paths: EXIT0.
- Real isolated Next.js16.2.6 optimized `npm run build`: process **exit0**, production compile 58s, TypeScript 28.0s, **103/103** prerendered static pages; postbuild passed. PRIVATE Build ID `FQusvFB3gAQSa5Cal2tJX`; public production is NOT using this build.
- Root-private `/root/assps-release-evidence/connect-admin-api-boundaries-20261016/build.log` SHA256 `6fcfa34d76777d2121912a344f403a5c51c23a2a67708761137be92ff82a1560`; `build.rc` literal 0, mode0600.
- Exact portable **ten-file** source diff `ops/connect/recovery/reviewed-next-admin-api-500-redaction-20261016.patch` SHA256 `64d28006fff3ef470bcfb93a8436d425ec5a90045205943bc308c7e8154b873b`; includes nine existing admin handlers and one newly added synthetic test. Actual `git apply --reverse --check` on repaired source PASS. Adjacent immutable manifest pins parent/new exact Next commits, all ten SHA256 file hashes, private build, build log and `releaseAuthorized:false`.
- Six new hermetic Python patch/scope/security tests PASS. Full Connect Python regression **212/212 PASS**, reviewed private-stage Node negative tests **8/8 PASS**, workflow YAML parses. This is VPS-local evidence; do not claim remote Actions status.

## Private anonymous HTTP acceptance, with fail-closed new-stage approval

Rather than allowing arbitrary workspace builds, the existing loopback Next smoke runner was extended with a QA-only permit for exactly this Git commit `cecdcebd...`, Build ID `FQusvFB3gAQSa5Cal2tJX`, approved ESLint hash and checksum-pinned **all ten** scoped source files. The pinned manifest itself is checked against SHA256 `6a8c8ca2c919dbd467e338d8a66091c400f144b24599694c91b00fdb7ca33684`. A modified/stale manifest, wrong SHA/Build ID, invalid source file or tampered scoped code fails closed. Two adversarial stage tests PASS. This changes neither the official signed Core gate nor the approved public Next release list.

A real temporary loopback Node Next process against the new optimized source ran **11/11 PRIVATE_HTTP_PASS**, exited0 and terminated its test listener: login200, protected anonymous session/API HTTP401 for seven fixed checks, teacher302 and two dashboard307 login redirects. Root-private status-only receipt `/root/assps-release-evidence/connect-admin-api-boundaries-20261016/private-http.json` SHA256 `aa7c87c91534996a6a6081d7bc01dbbc99fe938c8915d1c959a2adffacf6bf0d`, mode0600. This is **anonymous-only technical acceptance**, not independent signed teacher/School2 isolation.

## Production release HOLD and dependencies

Last actual protected joint release gate run against reviewed Core `05a59127`: Phase1 live read-only integrity PASS, Phase2 optimized joint technical **13/15** PASS (two public older build feature drifts), Phase3 official Core independent signed security only **6/13, process exit2/HOLD** and Phase4 production cutover HOLD. Seven real blocker categories remain fresh officially reviewed ACL backup, independently signed current off-host recovery, signed restricted production worker transport, exact reviewed adapter deployed live, independent persistent authenticated worker, effective worker inherited grants, and separately signed genuine School2/unassigned subject denial.

Do not bypass owner signatures, create synthetic staff sessions as signed evidence, or merge/deploy this older private Next tree over a more recent Core/Paper source. SaaS Core alone certifies and performs rollback-ready production promotion after 13/13 and real authenticated role/peer-school, Diary Save-Reopen-Print and protected results acceptance. No live Next/Nginx/PM2 restart, PostgreSQL DDL/DML, teacher credentials, school papers, marks/zeros, academic approval, printers or off-host signer state changed.
