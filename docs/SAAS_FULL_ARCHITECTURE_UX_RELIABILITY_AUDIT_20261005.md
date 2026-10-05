# ASSPS / APEX OS — Full Architecture, UX, Reliability & Workflow Audit
Date: 2026-10-05
Scope: app.assps.edu.pk (SaaS)
Baseline: origin/main @ b47941a
Status: Architecture audit + remediation blueprint (no production mutations in this audit)

## Executive judgement
The product has strong feature breadth but currently behaves more like a collection of powerful modules than a single coherent operating system. The dominant risk is not missing features; it is source-of-truth fragmentation, inconsistent workflow contracts, UI architecture drift, and insufficient end-to-end verification. The recent phantom Urdu `سٹاٹر / Blue` class is a concrete symptom: Academic Setup, student records, attendance filters and class identity are not governed by one canonical model.

The redesign should not be a cosmetic reskin. It must be a layered operating-system architecture: Canonical Domain Data -> API Contracts -> Workflow Services -> UI State -> Design System -> Automated Acceptance -> Observability.

## Evidence snapshot
- Frontend source: ~56,625 lines across JS/JSX/CSS.
- Backend source: ~19,113 lines of JS.
- Backend uses ~590 raw query/pool.query call sites.
- Frontend has ~138 explicit api.get/post/put/patch/delete calls plus direct fetch usage.
- 45 localStorage call sites.
- ~5,887 inline `style={{...}}` occurrences.
- 318 hard-coded dark palette occurrences in source.
- 2,893 CSS lines; 2,373 in one `index.css`.
- 484 `!important` declarations.
- 489 hard-coded 3+ digit pixel width/height constraints in JSX.
- Only 8 conventional test files discovered across the repo; frontend coverage is concentrated in Paper Editor.
- 636 button elements vs only 52 aria-label occurrences (approximation; not all buttons require aria-label, but the gap indicates accessibility audit debt).
- 75 browser `alert()` / `confirm()` usages.
- Backend has only 3 explicit migration files in `al-siddique-backend/migrations` despite broad schema surface.
- Prisma schema exists but runtime code does not use PrismaClient; actual application persistence is raw SQL. This creates schema-documentation drift risk.

## P0 — Canonical domain model / data integrity
### Finding: Classes and sections do not have one canonical server-side source of truth
`AcademicSetupModule.jsx` persists academic setup under `al_siddique_academic` in browser localStorage. Backend student records independently store raw `class` and `section` text. Attendance builds class filters dynamically from student rows. Therefore any arbitrary class string in a student record can create a phantom class in another workflow.

This is exactly how `سٹاٹر / Blue` appeared while registered `Starter / Blue` still existed separately.

### Required architecture
Create server-side canonical tables/entities:
- academic_years
- campuses
- class_levels
- sections
- class_sections (or cohorts)
- subjects
- class_subjects
- enrollments

Student should reference a cohort/class_section by immutable ID, not free-text class + section as authority. Free-text labels should only be denormalized display caches if needed.

### Rules
- Canonical class identity = UUID/ID, never label.
- Display label can be English, Urdu or localized aliases without creating a new class.
- Aliases table can map `Starter`, `starter`, `سٹارٹر`, `سٹاٹر` to one canonical class only when intentionally configured.
- No module may synthesize a class list from arbitrary student text.
- Deleting/renaming a class requires impact analysis and transaction-safe migration of enrollments.

### Acceptance
- Attempt to create student with unknown class label -> API rejects with 422.
- Urdu/English display labels can change without changing class identity.
- Attendance, fees, exams, paper generator, timetable, reports all consume same class_section ID.

## P0 — API contract architecture
### Finding
API calls are distributed throughout UI modules and backend routes contain substantial business logic directly. Large route files (feeRoutes, studentRoutes, paperRoute, etc.) mix HTTP, authorization, validation, persistence and workflow orchestration.

### Target
Controller -> Request Schema -> Authorization Policy -> Domain Service -> Repository -> DB Transaction -> Event/Audit Log.

Introduce versioned contracts (`/api/v1/...`) and typed request/response schemas. Use a validation library (Zod/Joi/express-validator) consistently. Generate frontend API clients/types from a contract (OpenAPI or shared schema package).

### Error contract
Every failure should return:
- code
- message
- fieldErrors[] when relevant
- correlationId
- retryable boolean
No route should expose raw DB errors to users.

## P0 — Multi-campus / tenancy
### Finding
Tenant and school context exists and has adversarial tests, which is good, but campus hierarchy is not consistently represented as a first-class domain throughout the product.

### Target hierarchy
SaaS Account -> Organization -> School/Tenant -> Campus -> Academic Year -> Cohort/ClassSection -> Student/Employee.

Every mutable domain row should carry required tenant/school identity and, where applicable, campus + academic_year IDs. Cross-campus queries must be explicit and permission-gated.

Login should resolve organization/school/campus context deterministically instead of relying on loose query params or divergent settings.

## P0 — Database lifecycle
### Finding
Raw SQL is valid, but schema ownership is unclear because Prisma schema exists while runtime does not use Prisma, and only three formal migration files are present for a broad DB surface.

### Target
Choose exactly one schema authority:
A) raw SQL migrations + schema snapshot; or
B) Prisma migrations + Prisma runtime.
Do not maintain a decorative Prisma schema disconnected from runtime.

Every deploy must run migration dry-run, backward compatibility checks, backup/rollback point, and post-migration invariants.

## P0 — Workflow transactions
High-risk workflows need atomic orchestration:
- admission -> student -> enrollment -> fee profile -> credentials -> optional challan
- promotion/demotion -> enrollment history -> timetable/exam/report visibility
- fee payment -> ledger -> challan balance -> receipt -> notification
- exam marks -> validation -> publish -> report card -> parent/student visibility
- employee creation -> role -> permissions -> attendance/payroll identity

No partial success should leave ghost entities. Use DB transactions plus idempotency keys for retryable POST workflows.

## P0 — Deletion / archival policy
Current delete behavior varies by module. Establish one lifecycle policy:
Active -> Archived/Inactive -> Purge (privileged, impact reviewed).

Permanent deletion must produce an audit event and reversible backup/retention artifact for critical records. UI must distinguish deactivate vs purge.

## P1 — Frontend architecture
### Finding
Several modules exceed 1,000–2,000 lines. Examples include QuestionBank (~2480), StudentModule (~2470), UnifiedPaperGenerator (~2132), CardsGenerator (~1794), Employees (~1655), Settings (~1370), Fees (~1347), ViewChallans (~1305). This makes state, side effects, rendering and business logic tightly coupled.

### Target module anatomy
`features/<domain>/`
- routes/
- pages/
- components/
- hooks/
- api/
- schemas/
- state/
- tests/

A page should compose components and workflows, not own every rule.

## P1 — Design system / premium minimal art direction
### Finding
The UI has strong visual ambition but is implemented with thousands of inline styles, hundreds of hardcoded palette values and 484 `!important`s. This prevents consistent theme adaptation, increases regression risk and makes mobile overrides fight desktop rules.

### Design principles
- quiet premium shell, not dashboard noise
- 8pt spacing grid
- limited radii scale
- one typography scale
- semantic colors, not module-specific arbitrary colors
- subtle motion 120–220ms
- glass/transparency only where information hierarchy benefits
- transparent school logo with controlled contrast on light/dark surfaces
- no decorative glow behind dense data tables
- icons from one system
- primary action visually unique; secondary/tertiary predictable

### Token layers
Primitive tokens -> semantic tokens -> component tokens -> tenant brand overrides.
Examples: `--surface-1`, `--surface-elevated`, `--text-primary`, `--border-subtle`, `--action-primary`, `--danger`, `--focus-ring`.

Remove page-level hardcoded `#071e34`, white text assumptions and one-off rgba values.

## P1 — Light/Dark mode
Theme must be semantic, not CSS inversion. Every component must pass both modes.

Required modes:
- system
- light
- dark
- optional tenant override only for brand accents, not readability.

Persist user preference. Login respects preference but defaults to product policy. Icons, charts, tables, modals, rich editors, print previews and logos require explicit dual-theme acceptance.

## P1 — Responsive/mobile architecture
### Finding
Mobile support currently includes layered patch files (`mobile-responsive-v3.css`, `mobile-responsive-v4-iphone.css`) plus many fixed dimensions. This is a patch strategy, not a responsive system.

### Target
Mobile-first component contracts:
- 320, 360, 390, 430 px phone widths
- 768 tablet
- 1024 compact desktop/tablet landscape
- 1280/1440/1920 desktop

Every table needs a defined small-screen strategy: column priority, card transformation, horizontal scroll, or drill-down. No accidental clipping.

Touch targets >= 44px where practical. Sticky headers/footers must respect safe areas. Forms must work with mobile keyboards and zoom.

## P1 — Navigation and hierarchy
The product needs a stable information architecture instead of feature accumulation.

Recommended top-level hierarchy:
1. Home / Command Center
2. Students
3. Academics
4. Attendance
5. Fees & Finance
6. Examinations & Results
7. Staff
8. Communication
9. Operations (transport/library/cards/etc.)
10. Reports & Analytics
11. Settings / Organization

Paper Generator belongs under Academics/Assessment but may have a high-priority shortcut.

Submodules should expose breadcrumbs and a consistent page header: title, context, primary action, secondary actions, help/status.

## P1 — Button system
Define component variants:
- Primary
- Secondary
- Tertiary/Ghost
- Danger
- Icon
- Split/menu
- Loading
- Disabled

No inline handcrafted buttons inside each module. All destructive buttons require consistent confirmation pattern. Avoid browser alert/confirm dialogs; replace with accessible modal/toast system.

## P1 — Notifications
### Current positives
Backend supports inbox/read-all and send/bulk endpoints, and topbar bell syncs notifications.

### Gaps / target
Create one Notification Service with:
- in-app inbox
- read/unread state
- category
- priority
- action/deep link
- delivery attempts (WhatsApp/SMS/email/push)
- retry/dead-letter state
- recipient resolution
- tenant/campus scope
- audit trail

Bell should show deterministic unread count, optimistic read with rollback, pagination, loading/error/empty states, and deep-link action.

## P1 — Profile / identity shell
One account/profile model should power topbar, permissions, avatar, campus/school context, password/security and session management.

Profile menu should contain only identity-context actions; operational settings belong in Settings. Avatar fallbacks, school logo and role badge must use standardized components.

## P1 — Global search
Topbar search currently knows a static module list and student store. Move toward server-backed command/search palette with permission-aware entities, recent actions and keyboard navigation.

## P1 — State management
Local component state + localStorage + ad hoc stores should be classified:
- server state: query/cache layer
- authenticated session state
- tenant branding/context
- ephemeral UI state
- offline drafts

Do not use localStorage as authoritative business data. Academic setup is the highest-priority removal from localStorage authority.

## P1 — Loading, empty, error and success states
Every data surface must implement four standard states using shared components. Errors should include retry and correlation ID for support. Skeletons should match final layout. Toasts should not be used for information requiring acknowledgement.

## P1 — Accessibility
Run WCAG 2.2 AA baseline. Approximate repo scan shows 636 buttons and only 52 aria-label occurrences, plus clickable div/span patterns. Audit keyboard navigation, focus order, visible focus, dialog traps, labels, contrast, screen-reader names and reduced motion.

## P1 — Performance
- route-level code splitting already exists in areas; extend consistently
- measure bundle by route
- virtualize long student/fee/question lists
- debounce search
- avoid refetch storms after mutations
- normalized caching/invalidation
- image/logo optimization
- reduce large monolithic module re-render scope
- performance budgets in CI

Targets (p75 on representative hardware/network):
- initial authenticated shell interactive < 2.5s
- route transition feedback < 100ms, meaningful content < 1s cached / < 2s network
- input response < 100ms
- no >200ms main-thread tasks during common workflows

## P1 — Observability / reliability
Add structured logs with correlation IDs from browser -> API -> DB. Centralize error reporting. Define health probes and SLOs.

Suggested SLOs:
- API availability >= 99.9%
- critical write success >= 99.95%
- p95 API read latency < 500ms (excluding external providers)
- zero cross-tenant data leaks
- zero silent partial writes in critical workflows

Dashboards: auth failures, 4xx/5xx by route, DB latency, slow queries, notification failures, fee workflow failures, attendance write failures, deployment version.

## P1 — Audit log
Critical events: login/security, student lifecycle, fee changes/payment, result publishing, employee/permission changes, settings, tenant/campus changes, bulk actions, permanent deletes. Include who/when/what/before/after/correlation ID.

## P1 — Test architecture
Current conventional test surface is far too small for feature breadth.

Testing pyramid:
1. Schema/validation unit tests
2. Domain service tests
3. Repository/transaction integration tests against ephemeral Postgres
4. API contract tests
5. Component tests
6. Playwright workflow tests
7. Visual regression light/dark + responsive
8. Accessibility tests
9. Load/concurrency tests
10. Migration/rollback tests
11. Tenant-isolation security tests
12. Production canary smoke tests

Critical Playwright journeys:
- login/logout/password change
- tenant/campus context switch
- admission -> student appears everywhere
- class setup -> enrollment -> attendance
- attendance mark/save/edit/history
- fee challan -> payment -> receipt/report
- exam create -> marks -> publish -> portal
- notification send -> inbox -> read state
- employee -> permissions -> login access
- theme light/dark persistence
- mobile navigation and all critical forms
- global search and profile

## P1 — CI/CD quality gates
No production deploy unless all pass:
- lint + type/schema checks
- unit/integration
- API contract
- production build
- security/dependency scan
- migration dry-run
- Playwright critical paths
- accessibility smoke
- visual snapshots (core shell)
- release manifest
- backup + rollback readiness
- canary health

Add GitHub Actions or equivalent; repository currently exposes deployment scripts but no visible `.github/workflows` in the audited checkout.

## P2 — Product polish / UX language
Use one vocabulary throughout. Do not mix "Class", "Grade", "Level" arbitrarily. Same for fee/challan/invoice/payment. Same action must have same label and icon across modules.

Empty states should teach next action. Confirmation messages should state outcome, not just "Success". Form validation should be inline, specific and preserve entered values.

## P2 — Reports
Create a Report Registry: report ID, domain, filters, permissions, columns, export formats, schedule capability. Avoid each module independently implementing report UI/export.

## P2 — Printing/export
Create one export service for PDF/print/CSV/Excel/Word where applicable. Print theme should be independent of app theme and deterministic.

## P2 — Feature flagging and rollout
Use tenant-aware feature flags for major workflow replacements. Run old/new paths in parallel where data migration risk exists. Feature flags require owner, expiry date and cleanup task.

# Target reference architecture

Browser/PWA
  -> App Shell + Design System
  -> Feature modules
  -> Server-state client / generated API client
  -> API Gateway / Express controllers
  -> schema validation + auth/policy
  -> domain services/workflow orchestration
  -> repositories
  -> PostgreSQL canonical schema
  -> outbox/events
  -> notification/report/background workers
  -> observability + audit

Cross-cutting: tenant/campus context, academic year, permissions, correlation ID, idempotency, localization, theme tokens.

# Remediation sequence

## Phase A — Control plane / safety baseline
- Freeze ad hoc architecture changes on main.
- Build route/module/API/data inventory.
- Establish design tokens and component inventory.
- Establish CI gates and critical smoke suite.
- Add structured error/correlation model.

## Phase B — Canonical academic hierarchy
- Build campus/year/class/section/cohort server models.
- Migrate existing raw class/section labels safely.
- Replace localStorage Academic Setup authority.
- Introduce alias/localization mapping.
- Update Student/Attendance/Fees/Exam/Timetable consumers.

## Phase C — Core workflow services
- Admission/enrollment
- Attendance
- Fees/payment
- Exams/results
- Employees/permissions
Each gets schema, service, repository, transactions and E2E tests.

## Phase D — UX shell/design system
- App shell, sidebar/topbar, page headers, buttons, forms, tables, modal/toast, empty/loading/error.
- Full light/dark semantic tokens.
- Tenant logo/brand treatment.
- Remove inline/hardcoded style debt progressively.

## Phase E — Mobile + accessibility
- Responsive component pass.
- Touch/keyboard/focus/contrast.
- Mobile E2E matrix.

## Phase F — Secondary modules + reports + notification orchestration
- Library, transport, cards, diary, paper generator integration, reports, communication.

## Phase G — Reliability hardening
- load/concurrency
- chaos/failure simulations for external providers
- backup/restore rehearsal
- canary deploy
- SLO dashboards

# Definition of Done for every button/module/submodule
A UI action is not "done" until all are true:
1. Permission rule defined.
2. Request schema defined.
3. Server transaction/domain behavior defined.
4. Success/error/loading/empty UI defined.
5. Light/dark pass.
6. Mobile pass.
7. Keyboard/accessibility pass.
8. Analytics/audit event where required.
9. Unit/integration coverage.
10. E2E happy path.
11. E2E failure/retry path.
12. No cross-tenant leakage.
13. Performance budget pass.
14. Rollback behavior known.

# Highest-priority weaknesses found now
1. Academic setup is browser-local while students store free-text class/section: severe source-of-truth flaw.
2. UI styling is highly fragmented: 5,887 inline styles + 484 `!important` + hard-coded theme values.
3. Large monolithic modules create regression and ownership problems.
4. API/business/persistence boundaries are weak; many raw queries and route-level orchestration.
5. Test coverage is not proportional to product breadth.
6. Mobile responsiveness is patch-layered rather than component-designed.
7. Schema governance is ambiguous (Prisma schema present but raw-SQL runtime, few formal migrations).
8. Browser dialogs and inconsistent interaction patterns weaken premium UX.
9. Accessibility has significant unverified surface.
10. Observability/audit/correlation are not yet strong enough for a multi-tenant operating system.

# Non-negotiable product principle
Do not add major new feature breadth until canonical data, workflow contracts, design system and acceptance automation are strong enough to prevent new features from increasing structural debt.
