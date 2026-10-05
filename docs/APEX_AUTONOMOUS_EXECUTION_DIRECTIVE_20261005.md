# APEX OS — Autonomous Execution Directive
Date: 2026-10-05
Status: Active working directive

## Mission
Transform APEX OS into a premium, reliable, lightweight, highly coherent school operating system with world-class architecture, UX, mobile behavior, data integrity, accessibility, observability and workflow quality — without corrupting approved school data or protected document templates.

## Operating mode
- Do not stop for routine approval after architecture and scope are already established.
- Continue phase-by-phase through analysis, implementation, verification, documentation and integration.
- Resolve ordinary blockers independently when they are within the approved technical scope.
- Prefer evidence over assumptions.
- Challenge every architectural decision, including prior decisions, before locking it.
- Optimize for the best defensible solution, not the fastest cosmetic patch.
- Work quickly through parallelizable analysis, but never trade away correctness, tenant isolation, data integrity or rollback safety.

## Quality bar
The target is not “good enough.” The target is the strongest practical version that can be justified by:
- architecture quality;
- domain correctness;
- visual coherence;
- performance;
- accessibility;
- mobile usability;
- security/tenant isolation;
- testing evidence;
- operational reliability;
- maintainability;
- clear rollback.

## Non-negotiable awareness
At every change, explicitly consider:
1. Canonical source of truth
2. Tenant/school/campus boundary
3. Role/permission boundary
4. Data fidelity
5. API contract
6. Transaction behavior
7. Error/loading/empty states
8. Light/dark behavior
9. Mobile/tablet/desktop behavior
10. Accessibility
11. Performance
12. Observability/audit
13. Tests
14. Migration/rollback
15. Protected templates/documents

## Speed rule
Move fast by reducing repeated manual work, using automation, shared primitives, inventories, scripts and regression checks.

Do not move fast by:
- skipping tests;
- editing production blindly;
- performing broad search/replace without scoped review;
- inventing data;
- bypassing tenant boundaries;
- changing protected document templates for aesthetic consistency;
- shipping unverified destructive migrations.

## Approval behavior
No routine approval is required for:
- code analysis;
- branch/worktree creation;
- audits;
- tests;
- non-destructive refactors;
- design-system implementation;
- documentation;
- reversible code changes;
- fixes already inside the agreed architecture and product scope.

Production changes should proceed only after the defined quality gates, backup/rollback preparation and post-deploy verification are ready. Do not pause merely to ask for a routine “go ahead” when the user has already authorized the established plan.

Stop only when:
- an external system requires the user’s own interactive confirmation;
- required access/credential is genuinely unavailable;
- the requested action expands beyond the agreed product scope in a materially risky way;
- an irreversible/destructive action cannot be made safely reversible;
- evidence shows the planned architecture is wrong and a major scope decision must be changed.

## Design directive
- Premium minimalism, not visual noise.
- Art through proportion, spacing, typography, hierarchy and restrained atmosphere.
- Dark mode: luminous graphite/navy, vibrant but calm.
- Light mode: pearl/air, bright, premium, not washed out.
- Blue is an action/brand accent, not the entire background.
- Teal is secondary energy.
- Gold is rare premium emphasis, not the default CTA.
- Tenant logo remains clean, transparent and proportionally correct.
- Every major background must feel intentional and lightweight.

## Data directive
Official school data must never be changed to improve presentation.

Canonical data -> domain service/API -> typed/view model -> UI.
No production business fact may be invented from localStorage, hard-coded demo content or visual-only state.

## Document/template directive
Approved templates are protected.
- Audit first.
- Change only evidenced defects.
- Preserve template identity.
- Preserve exact data.
- Preserve print geometry.
- Compare before/after.
- Keep rollback/reference version.

## Testing directive
Every completed workflow must have appropriate coverage across:
- unit/schema validation;
- integration/database transaction;
- API contract;
- component behavior;
- E2E happy path;
- E2E failure path;
- tenant isolation;
- light/dark;
- responsive/mobile;
- accessibility;
- protected data equality;
- deployment smoke.

## Definition of “complete”
A phase is complete only when code, tests, documentation, build, regression checks and rollback/verification are all aligned. A visually finished screen with weak data/workflow architecture is not complete.
