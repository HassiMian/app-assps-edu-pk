# APEX Connect / SaaS Core — combined six-table worker security integration

**Date:** 14 October 2026.
**Scope:** Source integration and disposable full-ACL PostgreSQL QA only.
**Production decision:** NO-GO until real signed staff/tenant/rollback acceptance.

## Exact source provenance and workstream preservation

Two source parents merged as an actual two-parent Git merge commit in a NEW
isolated worktree, without changing the original Core/Paper/Academic/Connect
worktrees:

- Core global least-privilege worker branch SHA:
  350dce0d148083b771451bc2f42bcdca6fdae454.
- Independent Connect-owned signed-catalog QA branch SHA:
  82c103022ceb1fac3cc60dd421cc6d8466b3cf4b.
- Shared signed release gate ancestor:
  67e73aa7a3a6aa56d8922c03a82d299001c13246.

Preserved Core queue database adapter, role-bound permission checks,
restored full-ACL QA migration and worker test; preserved independent
Connect-owned six-table forced-RLS and exact reverse QA tests and catalog
fail-closed release gate. No production migration created or executed.

## Real privilege root cause and remediation architecture

Current restricted Green inherits DML on SIX RLS-disabled global tables from
apex_app_runtime via inherited membership. Revoking Green child grants does
NOT remove inherited access. Revoking shared parent rights breaks Blue.
None of the six has a direct school_id/tenant_id column.

The reviewed Core approach is to materialize previously inherited positive
permissions on signed school tables, remove the unsafe parent membership
from signed Green, and separate three scoped NOLOGIN service identities:
AI queue worker, global organizations/campuses directory reader, and
append-only security audit writer. In signed-Green mode, the Core AI queue
adapter accepts a separate worker DB connection only and validates
current authenticated restricted SQL role and its actual limited grants.
It does not silently fallback to generic privileged query execution when
genuine worker transport credentials are absent.

Connect's additive FORCE-RLS QA staging is retained as independent proof
and strict rollback rehearsal ONLY, not a proposed live migration.

## Actual restored-production-schema integration proof

New reusable script:
ops/release/signed-bluegreen/replay-integrated-six-global-fullacl-20261014.sh

It validates SHA256 of root-private current complete database backup, creates
a disposable PostgreSQL16 Unix-socket-only cluster on QA port55477, recreates
NOLOGIN role names WITHOUT staff passwords, restores original table owners,
ACLs, RLS and all real data, applies only QA-port-guarded Core stage SQL,
runs the independent signed Core role verifier and then stops and deletes
the isolated cluster regardless of success or failure.

**14/14 actual restored PostgreSQL tests PASS.**

- Green denied every one of six global relations; Blue parent preserved all
  six reads, with unchanged old worker access.
- Signed Green retained reads on 75 previously parent-readable FORCE-RLS
  school relations and unsigned Green returned zero school rows.
- AI queue worker can access three global queue objects only; organization
  and audit access denied.
- Global directory reader and append-only audit writer correctly scoped.
- Tenant runtime cannot inherit or SET ROLE any scoped worker role.
- Original Blue-parent rollback membership verified in a transaction that
  was ROLLED BACK; active QA Green remained isolated.
- Cloned school1 ExamID9 official 1762 stored marks, 213 genuine numeric
  zeros, and the historic 301-mark digest remained exactly preserved.

Additional source and integration gates:
- 23/23 independent Core/Connect catalog and policy unit tests PASS.
- 5/5 separate worker configuration negative cases PASS.
- 66/66 source Core integrated release checks PASS (Node22, Python39,
  frontend5).
- Actual currently deployed Core release gate exit2/HOLD (correctly refuses
  to certify still-unfixed LIVE unprotected six tables).

## Connect login-only deployment boundary

Separate corrected Next Source SHA c9de089362c3d170d0da3a84140069cf6402014b
has actual Chromium 15/15 PASS for private HTTPS Nginx -> Next -> restored
real-schema QA with synthetic school identity. Evidence published on coordination
branch SHA 09cbc98ced35b3ac52a126b0b7e13cf51dfd5094.
Reviewed compiled Next BUILD_ID ONDwxEIZlx5onDIKY7wYf differs from
currently deployed public XI7EvxpUMkKOxK5ByM2BH. Live Nginx still
intercepts /dashboard and forces /admin before Next. They must be switched
as ONE rollback-capable release, not as separate fixes.

Full real production staff temporary-password rotation, genuine signed
teacher identity, independent peer-school HTTP denial, dedicated real worker
DB login, Core-owned independent signing root and actual live traffic rollback
remain uncertified. Synthetic QA proofs cannot replace genuine evidence.

Official marks results publication remains an independent assessment and
school record-release process. No academic results, teacher roles,
staff credentials, student records or live Nginx/PM2/DB changed.

## Exact Core owner actions required before live release

1. Review/forward-port this integration onto the latest verified Core
   canonical release descendant (not blindly deploy an older integration).
2. Provision genuine separated worker database transport under Core
   credentials custody; verify AI queue, ops and school settings behavior
   with real worker process supervision and bounded tenant API.
3. Replay current full-ACL isolated clone, signed teacher scope, peer-school
   negative and rollback checks on the exact release build.
4. Pin genuine owner-controlled release attestation key without forged
   staff or reviewer signatures; verify Blue archive and off-host backup.
5. Execute Core-authorized atomic Next+Nginx login-only switch if genuine
   pre-cutover protection criteria pass, immediately follow with authenticated
   teacher acceptance and independent signed rollback evidence.
6. Reverse to Blue on failure, recheck every real official ExamID9 mark.
   No academic publication bundled into this operation.

**This source handoff is not a signed production release certificate.**

## Actual separate login-only Core PRE-cutover verdict

New independent, READ-ONLY Core gate source:
ops/release/signed-bluegreen/verify-connect-login-only-core-20261014.py

This explicitly excludes the unrelated academic maximum-mark approval gates
from a login-only software rollout while STILL requiring actual authenticated
Core security and disaster recovery evidence. Current live safety conditions:
- Safe full-ACL backup checksum and secure mode.
- Current catalog has no unsigned/inherited global Green access.
- Active backend is actually running signed tenant transport.
- Separate authenticated AI worker SQL identity verified, not an agent-only
  QA role; fresh Core Ed25519 attestation proves queue, org/audit denial.
- Genuine signed independent peer-school and unassigned-subject denial.
- Original historical exam mark integrity remains unchanged.
- Reversible old Connect compiled archive, successful Nginx -t.
- Actual owner-pinned Ed25519 trust root and independently signed encrypted
  off-host recovery, independent decryption rehearsal and Blue restoration.

Source includes authenticated signature + timestamp + pinned source/release
identity validation. Synthetic fixtures cannot certify production: main emits
HOLD until every true live gate passes. New 18/18 adversarial unit cases PASS,
including forged/replayed actor evidence, worker privilege assertions,
missing signer, false backup proof and absent live session security.

The output may reach READY_FOR_LOGIN_ONLY_CORE only after independent
authorized SaaS Core evidence, and is only the first PRE-cutover condition.
After real traffic promotion, Connect's separate true teacher and real
rollback postflight remains mandatory. No signing key, staff credential or
human institutional approval is synthesized by this code.

## Final reconciliation with the newer canonical multi-workstream Core candidate

After the first two-parent integration was verified, Issue #4 reported a newer
Core+Paper Studio+Grade IX-X+composer integration branch at exact source
b54c4d3de4d9c2b1e14598bf67675a231168f136. A NEW isolated worktree
was created from this newer source and ONLY the previously proven Core
login-only release gate / independent full-ACL QA runner commit f288878 was
forward-ported without changing any parent worktree. This preserved all
latest composer-safe class/source content and the original Core global
worker implementation already present in the newer integrated source.

This new source lineage independently repeated:
- FULL actual restored full-ACL PostgreSQL16 55477 QA role isolation 14/14 PASS.
- New signed login-only and existing signed catalog/security source 41/41 PASS.
- Core global queue worker configuration and separation 5/5 PASS.
- Authoritative Core policy/regression 66/66 PASS (backend22/Python39/frontend5).
- Live cutover still exit2/HOLD because the real SaaS runtime has not yet
  received reviewed signed worker/tenant DB migration, authentic existing
  staff/peer-school HTTP denials, trusted Core release evidence or live rollback.

No lesson plans were imported, edited or published; no Principal or teacher
identity was impersonated, and no source branch was force pushed. This newer
candidate is the preferred forward-port for coordination, not evidence that
production has been deployed.
