# ASSPS Core + APEX Connect + Paper Studio — current-live frontend drift

**Verified 15 Oct 2026. Production HOLD; no public changes by this mission.**
Central coordination: GitHub issue #4.

## Exact reviewed sources

Core reviewed ancestor: `2782179f6ed0d3658ed8d7025cd5a7908b7ebdd0`.
Latest fail-closed combined release source: `c55922b2120232be1a392f203a35f4e9b683dfa5`.
Connect reviewed source: `98f6dfcff72fbe9d46d227d5c1200d388300d3d5`;
privately built Next `rc1vIlE6prAQ8pHrw7ohX`.
Paper Studio integrated owner source: `5f360a36a8c3a20e6faf8612853f4ce0cf593a65`.

Public Connect remains `ONDwxEIZlx5onDIKY7wYf` with old anonymous dashboard redirect.
Running backend restricted worker adapter is absent.

## Newly discovered live static asset drift

The actual configured live Grade frontend index at
`/var/www/assps-grade910-draft-save-print-b18a8aae/index.html`
had SHA256 `0af53ae824340f2ddc0b91e848163f8bddad4263d1bb7a7cf92a2bcda923325a`
at 07:56–08:01 UTC, not the previously reviewed baseline
`92283fc8eec1d5fe1562abfe26f75b731c0b9eeb5f1883802b3e2a2cabc330ff`.
HTTP200 public response matches current file exactly. The active HTML and
referenced main JS bytes match the separate existing Result Cards static tree.
That comparison does NOT by itself establish release approval or blame.

The archived previous Grade static index and JS asset remain intact at
`/var/www/assps-grade910-draft-save-print-b18a8aae.bak-20261015-1240`.
The Paper owner independent release verifier NOW returns 14/15 technical checks,
one genuine live-index mismatch, technical_pass=false. Its 6/6 pure negative
tests pass. Do not rewrite expected baseline hash, overwrite the current static
directory or restore archived files without reviewing the actual newest release.

## Core/Paper backend stage compatibility

Compared both existing isolated source trees recursively (650/654 src files).
EXACTLY six source differences exist: reviewed publication-guard extension
`routes/lessonPlanRoutes.js` SHA
`870de5e583fa3ef75744c11a28ab9facf30ae8e9a1d9d805653ad2dd6d6978e2`,
added guard `services/lessonPlanningPublicationGuard.js` SHA
`143265e63e9c7957c6ae4d9756a01079dd934ee0280e1e7282a37f22f95b7dbd`,
one changed lesson source test and three added lesson protection tests.
No other Core backend staged code differs.

Hardened restricted worker in BOTH staged trees is exactly
`97090fee75c77283375141e21d572d52a1a9fe58952ff16a4584ca9f308592cc`.
Both staged and currently running server.js are identical; currently running
Lesson Plans route `435cf755904dcd7fdf74189d5a99d267b8ace98a6627c9180a2375e9dfaaf74f`
has not been changed by this mission.

NEW read-only source cross-owner audit:
`ops/release/signed-bluegreen/verify-connect-core-paper-live-drift-20261015.py`.
Source compatibility mode reports PASS but discloses actual frontend drift.
Default production mode always EXIT2/HOLD, even when stage files agree.
New fail-closed adverse tests: 13/13 PASS. No release approval is inferred.

## Actual canonical-data and rollback checks

Production read-only School1 Exam9 audit: 1762 rows, 213 actual zeros, 0 NULL.
Historical MD5 `bcdc098a3e6cabb6f4c31736b14e39b9` unchanged.
Full-ACL database dump and roles backup SHA256SUMS: PASS.
Live nginx -t: PASS. No record writes, passwords, PM2, Nginx, static swaps,
staged secret files or production frontend promotions by this mission.

## Release decision — HOLD

Two separate dependencies remain:
(1) SaaS/Paper/Grade owners must reconcile origin and approval of the now
changed production static frontend, maintaining backward-compatible
Paper/Academic integrations.
(2) Genuine teacher-owned login/password-change/relogin, independent
authenticated School1/School2 role and subject-denial verification, exact
running restricted worker, owner and independent signed recovery/rollback
receipts, reviewed Core-owned transactional public cutover, real postflight
and proven restoration still lack authentic acceptance.
Neither QA fixtures nor code-only checks can substitute for these actors.
