# Paper Studio — unified Core2324 result-card/grade-policy safety reconciliation (17 October 2026)

**Scope:** isolated source-only candidate for SaaS Core review; NOT a production deploy, RLS change, grade approval, or permission grant.

## Provenance and coordination
- Governance: ASSPS issue #4, https://github.com/HassiMian/app-assps-edu-pk/issues/4 ; original PAPER_STUDIO_MASTER_HANDOFF.md read from governance branch.
- Exact clean GitHub-matched base: fix/core78-hermetic-ci-gates-20261017 at 2324bcb9d8f27e8032b1bddfeb8b09133c4df7bc.
- Isolated worktree: /root/workspace/assps-paper-core2324-result-safety-audit-20261017.
- Production stays at its independently verified existing frontend/backend source; all other owner worktrees remain unchanged.
- Only candidate files: ops/production-safety-check.js, ops/release/tests/resultcards-selected-exam-grade-policy-contract-20261017.test.cjs, .github/workflows/verify.yml and this report.

## Actual contradiction, rather than a cosmetic CI pass
On the exact base the read-only production safety CLI failed with precisely TWO static source-expectation complaints. The ResultCards UI's "All Classes" output prints *one selected examination's* saved student cards, not every examination. It does ONE per-exam result request; loadedExamId===selectedExam and latest-request guards keep older exam data out of all-class printing. The secured server endpoint applies exam ID, authentication, student-tenant, exam-tenant and portal-student row scopes. An independently existing multi-exam batch endpoint remains bounded by 100 IDs; unbounded fanout is explicitly forbidden.

The old static checker nevertheless demanded the multi-exam batch client call. Replacing the selected-exam endpoint with the batch endpoint without reviewing incompatible response projection aliases (single-route s.name/student_class/student_section/photo versus batch student_name/class/section) could break existing cards.

The second checker expected loadGradeBandsForSchool(schoolId) on write, but the actual write path deliberately calls loadGradeBandsForSchool(schoolId,{previewDefaults:false}), then saves grade=null unless school-configured bands exist and state is SCORED. The grade-preview GET uses display-only fallback. Replacing this with preview defaults on writes could fabricate unapproved grades.

## Source-only resolution: Core owns final review
- Correct the safety expectations for the current selected-exam/all-classes contract; retain anti-fanout and 1–100 batch server bound guards.
- Assert selected exam API, stale request denial, activeResults print isolation, authenticated server route and exam-ID filter.
- Assert configured-only school grade lookup and null grade when policy is absent/nonscored; do not change grade calculation.
- Register a dependency-free Node adversarial contract test in existing hosted Verify SaaS workflow. It rejects synthetic mutations to endpoint scoping, stale guards, tenant/portal restrictions and fabricated grades.

## Actual local evidence
- Original production-safety checker: RC1, exactly two static mismatch complaints; no evidence of marks corruption.
- Candidate production-safety checker: RC0 PASS.
- New adversarial test: 12/12 PASS (one actual-source positive plus eleven synthetic negative corruptions); corrected three initial test harness weaknesses before successful rerun.
- Existing zero-versus-blank exam state and tenant intersection: 11/11 PASS.
- CI step presence/order and git diff --check: PASS.
- No frontend/backend runtime code, SQL DML/DDL, RLS grants, PM2, Nginx, printer queue, student scores, 43 papers or protected templates modified.
- Hosted Verify SaaS: not yet attested at report creation; verify exact pushed commit and job steps, not local RC0 alone.

## Non-bypassable HOLD
Latest independent signed SaaS Core remains 6/13. Outstanding offsite owner/ACL backup-and-restore, restricted worker/adapter/transport/grants, genuine School2 denied scope, authorized teacher assignments/print, original Urdu A4 physical witness and executable rollback cannot be forged by CI. Principal's saved 38 Urdu marks and the original 1,801 result records/213 zeros must not be replayed, altered or made public. Grade IX–X provisional research remains unapproved/nonselectable. SaaS Core is sole deployment owner.

## Review boundary
Core/Results owner must independently inspect selected-exam behavior, secured server route and configured-only grade semantics before accepting the revised checker. If the intended requirement is multiple examinations in one print, this candidate is NOT sufficient: implement a genuine batch UI, normalized result projection, full browser and tenant security QA with separate review.
