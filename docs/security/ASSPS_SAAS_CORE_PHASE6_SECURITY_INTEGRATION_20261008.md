# ASSPS SaaS Core — Phase 6 integrated security candidate
**8 Oct 2026 UTC. Status: tested ISOLATED CANDIDATE; production RELEASE HOLD.**
**Owner:** SaaS Core & Production. Paper Studio owns editor/official-paper features and must review the scoped metadata projection hardening.

## Source and changed boundaries
- Exact base `cf247cea7fa874509c2c17aa952809cfc56d786f` from the previous dedicated Core non-BYPASS candidate; underlying live frontend source `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92` and live backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`.
- Isolated worktree `feat/saas-core-phase6-rls-integration-20261008`. Do not deploy directly; reconcile exact newest component releases first.
- **No production DB credentials, school records, fees, papers or student records used.** Tests used separate PostgreSQL16 on localhost port 55432 containing schema-only copy + synthetic fixtures; no production migrations or service/firewall changes.

## ARCHV1 branch and conflict reconciliation
- Reviewed `feat/archv1-forward-privileged-path-seal-20261008` (`b5b2b20ba60c`), `feat/archv1-restricted-paper-db-integration-20261008` (`47dd031315ad`), `fix/archv1-release-closure-20261008` (`bdffed48817a`), `fix/archv1-scoring-release-seal-20261008` (`9fe7b560f879`), `feat/archv1-seal-certification-isolated-20261008` (`25536200ff1d`), `fix/archv1-security-phase4-forward-20261008` (`16ab8f346ba2`), and unfinished `feat/archv1-security-current-live-20261008` (`16ab8f346ba2` base, **26 dirty tracked paths**).
- ARCHV1's unique feature-gated, password-authenticated `apex_paper_runtime` pool, purpose-bounded Paper/Assessment middleware and signed DB actor/school claims are **not** present in the Core Phase5 branch. This path includes overlapping `src/config/database.js`, `config/migrate.js`, assessment and paper routes. Its distinct SQL and tests must be verified with its owner before joint integration. **No ARCHV1 dirty change was overwritten or cherry-picked blindly.** Last-reviewed ARCHV1 code is on older/diverged source ancestry.
- Independently integrated missing Core-only protections: verify effective role *after* role switching, fail closed on privileged session, verify signed tenant key against DB school/user identity, constrain signed virtual-branch lookup to signed school; these are feature-gated for isolated use and test-proven. Core did **not** bring over unfinished signed Paper DB migrations.
- Security-related narrow **Paper Studio review candidate**: metadata list no longer queries canonical document `payload`; serializer uses metadata columns only while detail/create retains authoritative document payload. Tests G43, G21 and G23 confirm no regression. Requires Paper Studio owner acknowledgment before release.

## Least-privilege access and source of authority
| Surface | Required authenticated authority | Database contract | Phase 6 coverage | Remaining gate |
|---|---|---|---|---|
| Login / refresh | Signed JWT, active DB user, canonical school + tenant identity | Restricted role; no unscoped privileged LOGIN | Real JWT prebound lookup/mismatch test PASS | Production token issuance/revocation, service/refresh, superadmin |
| Virtual branch admin | Signed tenant + bounded settings school row | Restricted scoped `settings` query | Synthetic virtual-branch A success, wrong school deny PASS | Branch management authorization and rollout |
| Teacher assignments | Verified user ID + school, assigned class/subject | Role RLS plus assignment predicate | Real Assessment Result allow/403, attendance allow/409 PASS | Reassignment, all legacy handlers |
| School administrators | Real DB role and active school | Scoped queries, fee totals own school | Real fee admin summary PASS, teacher fee admin denied | Payment write/ledger complete regression |
| Attendance | Role + assignment/school | Students JOIN attendance RLS with teacher assignment | Real HTTP assigned/unassigned, cross-tenant query denial PASS | Marking POST, bulk, history, notifications |
| Finance | Admin/accountant/parent/student purpose-scoped | School, child ownership and ledger SQL policy | Admin summary success, unauthorized summary 403 | Fee payment/proofs, parent-child privacy |
| Assessment Results | Teacher assignment or authorized admin; release-bound read/write | School scoped results/revisions | Real restricted PG router GET, cross-school 404, student 403 PASS | Revision writes/results scoring and rollback |
| Paper Studio | Teacher-owned or school-admin canonical paper | Paper Vault school + owner + strict document revision | Real saved-list A/B + 0 unassigned; 11/11 protected tests | Signed paper actor RLS from ARCHV1, full 43-document print acceptance |
| Grade IX–X Question Bank | Independent academic approval and teacher/school role | Approved snapshot only | Static role contract PASS; no publication | Academic approval remains zero |
| Connect | Authenticated role-filtered SaaS API projection only | SaaS is sole DB and paper source | Source-level projection boundary checks only | Full Connect DB/proxy provenance, role/tenant integration |

**Critical remaining tenant-context integrity risk:** The existing general `apex_app_runtime` RLS policies trust database session settings. The signed-tenant middleware prevents ordinary forged HTTP context in tested routes, but DB-side attestation for all endpoints is **NOT independently certified**. The ARCHV1 signed school/actor database policy is an integration dependency, not an assumed deployed guard. Do not conclude whole-application RLS closure from these tests.

## Real tests and evidence
- Independent PostgreSQL16 cluster: loopback-only `127.0.0.1:55432`, DB `assps_core_rls_clone_20261008`, actual `assps_core_test_login` (NOSUPERUSER, NOBYPASSRLS) and `apex_app_runtime` NOLOGIN. **87/87 schema tables restored; 77/77 protected tables FORCE RLS**. Entire fixture set synthetic: two schools, teachers with/without assignment, admin and student users, 2 assessment results/releases, 2 attendance rows, 2 paper_vault entries, 2 virtual-branch settings rows. Database has no real ASSPS student rows.
- Isolated aggregate Node security/regression tests: **30/30 PASS, 0 failures, 0 skipped**, including real production-source Assessment Results, Attendance, Fees, Paper Studio routers, signed JWT validation, role permissions, tenant claims/headers, and 43-paper DOCX identity and math projection tests. Security results under `/tmp/assps_core_p6_full_regression.log` on VPS.
- Protected DOCX/print model + metadata-only list isolated suite **11/11 PASS** after discovering/fixing two real list regressions; no physical printing.
- Frontend `npm ci` **PASS** (315 packages), `npm run build` **PASS** (3.54s), protected template verification **6/6 unchanged**. Output remained only in isolated worktree, never published. Full-repository `npm run lint` **timed out at 34s** and is **not certified**.
- Database synthetic rollback: pg_dump custom format into independent backup followed by new independent DB restore `assps_core_phase6_restore_20261008` **PASS**: 87 tables, 77 FORCE-RLS; school/results/paper/attendance/settings synthetic counts 2/2/2/2/2. Dump SHA256 `9fc306be216b1de2b08b6fbf9e01554964ea67fa3fcfe20e98233eb9030965dc`. **Not** production backup/rollback proof.

## Hostinger / SSH security (release block)
- UFW inactive, `iptables INPUT ACCEPT`, no nftables rules. Eight application/test ports listen on wildcard interfaces. **No independent verified Hostinger cloud firewall/ACL evidence**. Separate container-origin TCP probe could not reach even ports 80/443, so those failures cannot prove a provider firewall is blocking application ports.
- SSH login policy needs administrative hardening; detailed authentication posture is kept in private VPS verification rather than published in this public repository. `sshd -t` and `nginx -t` PASS. No settings changed.
- A **dry-run-only** nftables draft blocks non-loopback access to app/test ports while allowing loopback Nginx forwarding. Validated with `nft -c -f` PASS; **not installed**. iptables-save existing config saved on VPS privately. Consult Hostinger panel / emergency console before enabling host firewall. Do not touch SSH, Nginx, PM2 or DB service settings during isolated certification.
- Safe change checklist: (1) verify provider cloud firewall and SSH key login from independent external source; (2) verify rescue/KVM, capture backups and establish a second active admin SSH session; (3) authorize remote admin IP/CIDR; (4) first apply minimal cloud port deny or loopback listeners in staged canary with time-delayed rollback mechanism and independent recovery operator; (5) test 80/443 and blocked external 3000/5000/5017/8888/preview ports from outside; (6) only after proof, enforce host firewall plus SSH root/password hardening; (7) restore from saved firewall snapshot and provider console if verification fails. **No such change applied.**

## Remaining HOLDs
1. Core + Paper Studio joint code review for signed database actor/school RLS, real restricted Paper pool, all privileged paths, one unified `database.js`, migrations and no privileged fallback. Preserve dirty parallel worktree.
2. Auth lifecycle, superadmin/platform owner, service tokens, Connect direct DB, virtual branch administration, tenant-context DB trust controls and authenticated real-tenant boundary.
3. Privileged scripts and bootstrap grants, teacher assignment reassignment, attendance bulk marking, fee writes/proofs, student/parent scope, protected Paper official print/PDF/DOCX 43/43 physical browser acceptance, whole-suite cross-tenant.
4. Backend/frontend reproducible artifact parity, broader lint/automation, rollback of live services and production DB with recovery rehearsal, on-call monitoring, Hostinger cloud firewall and external reachability.
5. Grade IX–X academic publication only after independent provenance and academic review (0 independently approved at current evidence).

**NO PRODUCTION RELEASE APPROVED.** Future release candidate must be forward-ported onto independently verified latest production component ancestry, then gated through issue #4.
