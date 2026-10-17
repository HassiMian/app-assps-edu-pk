# ASSPS Core742 / Paper / Results + Notice Studio + Lesson Diary-format release integration

**Source-only release candidate, 17 October 2026. NOT DEPLOYED.** Central coordination GitHub issue #4.

## Exact source ancestry and isolation
- Latest reviewed integrated base: `integration/assps-master-core-paper-result-20261017@742e277a00cddadae9e82251e8147863c989dadd`, clean and remote-confirmed at reconciliation.
- Independently tested Notice/Diary candidate: `integration/core78-school-notices-diary-contract-20261017@a4bdbf8db5e6603ee63a1940c0978bdf4808b511`, based on older Core2324 and preserved.
- A new isolated clean Core742-descendant worktree forward-ported exactly that reviewed Notice/Diary source with `git cherry-pick -x`; **sole conflict** was existing Core CI branch triggers. Both original Core/Paper/Results and Notice branch triggers preserved in the unified source. Other owners' independent worktrees, especially dirty Results branch, untouched. No Paper/Result runtime overwrite, grading-policy gate waiver, student data change or release reset.

## Verified source QA
- Current unified source actual `node --test` Notice document/bell and source parity **13/13 PASS**; `npm run production:safety` PASS; CI workflow YAML parses successfully. Original exact Notice candidate separately achieved **11/11** synthetic Express/staff/school/approval unit tests and genuine hosted Core 25-success-step and Lesson 36-success-step pipelines on the same recovered Notice/Diary runtime changes. These inherited candidate results are not described as fresh completed Core742 hosted CI.
- Notice source retains separate old `/api/notices` compatibility, revisioned new `/api/school-documents`, principal approval and user-scoped drafts, A4 notice/circular/office-order/consent/meeting formats, tenant-linked branding and read-only class datesheets. Staged `ops/release/document-studio/001_school_document_drafts.sql` has **never been applied to production**.
- Existing `DailyDiaryWorkspace initialMode="lesson"` is now the primary Lesson Planning view. Weekly/Term and Advanced views remain available. Diary records stay isolated from Lesson plan records. Original Diary Save/Reopen/Print 15/15 synthetic Chromium and source-only Lesson CI passed on original a4 source; real staff/physical output not certified.

## Real disposable PostgreSQL 16 migration probe — incomplete, NOT CERTIFIED
- A private temporary PostgreSQL 16 cluster was automatically created by `pg_virtualenv -t -v 16` and dropped on exit; synthetic schools and temporary signing-function double were exclusively local to the throw-away cluster.
- The **unmodified** additive document migration executed past its creation/guard statements. The trial then failed in a new test-harness assertion treating PostgreSQL's built-in `PUBLIC` pseudo-role as an ordinary role (`role "PUBLIC" does not exist`). This is a test-fixture error and **NOT** a claim of production schema failure.
- An attempt to correct that assertion and rerun was denied by connected safety checks. No alternate bypass was tried. A scratch `verify_disposable_pg16_notice_rls.sh` is **untracked, unreviewed and not a qualified release proof**. Independent same-school/peer-School2 deny, event/revision FORCE RLS and actual production signed guard, permissions and rollback remain **UNVERIFIED**.

## Additional independently identified legacy notices release blocker
- Older `/api/notices` currently has audience filtering risks for teacher reads, even where a separately reviewed private issuer/role source patch exists. Separate owner-signed audience authorization contract and real same-school recipient tests are not yet proven. Do not merge unreviewed legacy-notice auth changes, widen teacher grants, publish confidential notices, or promote Notice Studio until the inherited read policy is reconciled.

## Production release HOLD
- Live frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`, backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`, app/login 200, API health 200, anonymous identity 401. This integration candidate is NOT those deployed artifacts.
- Last independent Core verdict **6/13 HOLD**: current fully signed global owner/ACL backup, offhost owner+ACL restoration, restricted worker transport/deployed adapter/separately authenticated worker/effective grants, genuine independent School2/unassigned-subject denial. Also 43 unreviewed teacher links and 0 explicit active assignments, Urdu offering official signoff, actual staff Save/Reopen/Print, witnessed Jameel Nastaleeq physical Ricoh A4 page, known rollback and cutover. Never mint external signers, fabricate identities or data.
- Do not replay the 38/38 already-saved Principal Class One Yellow Urdu marks or mutate historical 1,801 results and 213 true numeric zero scores. Original Paper/Academic publication freeze remains.
- No production DB writes/DDL, RLS or role grants, PM2/Nginx restart, original paper corpus replacement, new printer job, or active agent worktree mutation in this task.

**Next permitted owner actions**: Review latest GitHub integration ancestry and hosted combined CI; independently repair/verify teacher audience filtering and notice schema against an authorized disposable DB; obtain independent School2/teacher/ACL restore attestations and Paper Studio physical print acceptance; only then sign a rollback-ready, reviewed frontend+backend rollout. **A green build is never a 13/13 release certificate.**
