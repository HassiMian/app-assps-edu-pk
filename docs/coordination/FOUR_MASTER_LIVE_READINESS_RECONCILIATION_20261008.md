# ASSPS Four MASTERs — live source and integration readiness, 8 October 2026

Read-only checkpoint taken 16:35–16:37 UTC. The original full transcripts and all ChatGPT uploads from other Projects are **not directly accessible** in the current chat. Reconciliation is based on user-provided reports, retrieved historical context, checked GitHub issue #4, project handoff/governance documents and actual VPS/Git source evidence. This is **not** a comprehensive byte-for-byte recovery of every chat.

## Component release source (artifact metadata, not running-code attestation)

- FRONTEND `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92` — date-sheet/theme release 14:40Z
- BACKEND `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9` — fee/payment release 09:48Z
- Release anchor `68a158e` remains historical only. Newer development cannot replace production without Core security and artifact/release gates.

## Four stream sources and current ownership

| Stream | Latest checked branch/ref | Evidence | True blocker |
|---|---|---|---|
| SaaS Core | `feat/saas-core-phase7-signed-rls-clone-20261008` `3d2f0e4ae4765f119462db923eff7f97a2f967bb` | Clean local/remote, Phase 7 clone-only signed tenant policy and tests; previous Phase 6 `80523e9f` had restricted-route checks | Privileged deployed `apexos_user` has BYPASSRLS; clone policy is not a deployed independent runtime; ARCHV1 paper role and privileged/service/Connect routes still require reconciliation; provider ingress, rollback |
| Paper Studio | `feat/paper-studio-master-phase7-20261008` `fc8e769d4b082d4e3a04f241b1351de6b49cce92` | Clean local/remote, isolated real JWT/HTTP schema clone repaired Lesson Plan initial sentToPortal bypass and Daily Diary DATE PUT 500; G43 metadata-list fix | Non-bypass role integration, actual teacher-role assignments, full authenticated flows, physical printer/long bilingual pagination, #2/#3 issues |
| Grade IX–X Academic | `feat/grade910-academic-master-evidence-20261008` `1e2e62619cf9ae704ed49e8c71b85a37aded449d` | Branch advanced after `e57551ae`; clean local and remote now match; revision-pinned review triage and Math X numerical mechanical QA tools committed | Independent source pages/edition applicability and reviewer signoffs; **zero** academically approved/published items, no automatic verified Question Bank seeding |
| APEX Connect | LOCAL-only `audit/apex-connect-role-contracts-20261008` `8becc089998dd3f1b883549f5a3905d5ef33181a` | Clean local repo, saved list fail-closed/race tests and anonymous Edge acceptance reported in #4 | Connect Git write permission unavailable and full live-source-to-Git provenance not certified; teacher/student/guardian authenticated and RLS acceptance unresolved |

Question counts, citations and test tallies are in per-stream issue #4 comments and source reports; do not roll their separate tests into one "production PASS". Academic 2,581 authored draft count and 0 approved are as last observed in academic issue report, not current live SQL counts.

## Newly verified source integration contract

- Independently compared Core Phase 7 vs Paper Studio Phase 7: their **G43 `paperStudioProjectionService.js` full-file SHA256 matches**: `ca11164561c8e5695d005face3c427838afc1b59ecc8385b174398458398f4b4`. This removes the prior source-level ownership conflict for metadata-only saved-paper LIST, but does NOT prove it is live or RLS-enforced.
- `dailyDiaryRoutes.js` and `lessonPlanRoutes.js` in Core Phase 7 **do not yet match** the Paper Studio Phase 7 bug-fix versions. This is an **integration dependency**, not an instruction for Paper Studio to overwrite Core's security branch. SaaS Core must selectively integrate Paper's clean route fixes with signed runtime tenant/actor roles, then rerun the real clone/HTTP/regression tests.
- The Grade IX–X worktree briefly preceded its new remote push (local `1e2e6261` vs earlier remote `e57551ae`) during observations. Recheck at 16:35 UTC shows exact remote/local match `1e2e6261`. Never label a contemporaneous transient ref mismatch a lost commit without re-checking.

## Reproducible checks (no production changes)

Script `scripts/coordination/verify-four-master-checkpoints.sh` is read-only and prints component metadata, live remote refs, local workspace commits, G43 file parity and current source integration mismatches. It does not inspect production secrets, SQL tenant records or firewall reachability. It cannot confer release authority.

- `bash -n scripts/coordination/verify-four-master-checkpoints.sh` PASS.
- Current Core/Paper/Academic candidate refs/parity: `READ_ONLY_PREFLIGHT_OK`, **NOT** production release certification.
- Negative control using intentionally older Core Phase 5 branch: detects both un-synced Core ref and missing G43 privacy parity, returns **exit 3** (expected BLOCK).
- No existing worktree modified, reset or deleted; no build to live, PM2 action, database migration or service restart.

## Verified next action, by owner

1. **SaaS Core**: reconcile latest signed Core Phase 7 with Paper Studio Phase 7 route fixes and ARCHV1 policies in a **new isolated integration worktree**; certify non-BYPASS signed production-equivalent HTTP/teacher/attendance/fees/Connect roles and constrained privileged paths. Then ingress, backup+restoration, release provenance, source parity and rollback. **Only Core may release.**
2. **Paper Studio**: preserve `fc8e769d`, review signed tenant/author interactions and approve narrow G43 parity; independent long bilingual/Urdu overflow & connected-printer acceptance, #2/#3.
3. **Academic Master**: continue physical book/page/exercise evidence, independent answer accuracy/bilingual review and immutable approval; report verified/approved separately. New revision triage and math QA is **not** human approval.
4. **APEX Connect**: recover write permission/immutable source provenance; retain tested local portable fix; signed-in roles/session/race/authorization acceptance against Core restricted endpoints once available.

## Chat operational rule

One MASTER conversation per Project; previous chats are historical references. Repeating the short issue #4 continuation instruction on a **paused** normal chat is acceptable, but it does not maintain an always-running background agent. Full Project chat transcripts and attachments may be inaccessible across Projects. Record each verified checkpoint in issue #4; do not archive/delete older conversations until unique user decisions, test artifacts and uploads are indexed.

**Decision: initial governance complete; independent safe engineering ongoing; live production security, academic approval and cross-module release gates HOLD.**
