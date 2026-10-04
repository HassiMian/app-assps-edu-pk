# ASSPS Paper & Assessment Studio — Architecture Red-Team Review
Date: 2026-10-04
Status: Architecture challenge record; implementation PASS is not implied.

## Goal
Build a general-purpose ASSPS Assessment & Paper Studio that is fast for teachers, manually usable without a Question Bank, progressively enhanced by Question Bank/automation/AI, version-safe across publisher and syllabus changes, tenant-safe, print-reliable, multilingual, and browser-proven.

## External reference lenses
- 1EdTech CASE: stable digital competency/learning-outcome identities and framework associations.
- 1EdTech QTI: portable assessment items/tests/results/usage metadata.
- 1EdTech OneRoster: roster/class/result interoperability boundaries.
- W3C WCAG/WAI: keyboard, labels, understandable controls, error prevention.
- OWASP: multi-tenant isolation and least-privilege authorization.
- Browser paged-media guidance: modern break-inside/page layout behavior.

## Red-team weakness register

### A. Product / UX
W01 — Feature explosion can recreate the same noisy editor in a more powerful form.
Solution: progressive disclosure; contextual inspector; command palette; primary flow Create -> Add -> Arrange -> Review -> Print.

W02 — Multiple creation paths can confuse users.
Solution: three clear starts only: Manual, From Question Bank, Smart/Auto; all converge into one editor.

W03 — Advanced curriculum metadata can slow every paper.
Solution: resolve active curriculum profile automatically from class+subject+session; show advanced source details only when ambiguity exists.

W04 — Excess scrolling wastes teacher time.
Solution: sticky contextual add controls, bottom insertion handles, keyboard shortcuts, local section toolbar, command palette.

W05 — Too many toolbar controls reduce discoverability.
Solution: scope-aware mini-toolbar and inspector; hide irrelevant controls.

W06 — Templates may become cosmetic skins rather than useful structures.
Solution: templates define layout tokens, typography, spacing, section behavior, marks strip, header geometry, density and print rules; colors remain configurable.

W07 — Customizability can destroy visual consistency.
Solution: safe design tokens + advanced custom mode; warn on unsafe contrast/spacing but do not arbitrarily block expert users.

### B. Core document architecture
W08 — Hard-coded MCQ/Short/Long hierarchy cannot represent weekly/chapter/custom assessments.
Solution: universal block/section model with extensible block registry.

W09 — Arbitrary blocks can make schema unstable.
Solution: versioned block contracts, typed payloads, migrations, unknown-block fallback renderer.

W10 — Header treated as static metadata limits reuse/personalization.
Solution: first-class HeaderBlock with scoped styles, reusable templates, data bindings and safe defaults.

W11 — Presentation mixed with academic content causes accidental semantic changes.
Solution: separate content structure, presentation, bindings, assessment/checking data.

W12 — Question Bank edits could mutate old papers.
Solution: PaperDocument pins question revision + stores immutable content snapshot.

W13 — Multiple existing renderers/editors create divergent behavior.
Solution: controlled canonical cutover; legacy read/migrate adapters only; one canonical render/validation/print contract.

### C. Curriculum / publisher / syllabus
W14 — Publisher as a single Subject string is not future-proof.
Solution: Publisher -> Series/Book -> Edition as Resource entities, separate from Curriculum Profile.

W15 — Curriculum and textbook are conflated.
Solution: canonical learning scope independent of resource; map books/chapters to learning outcomes/skills.

W16 — One-subject-one-book assumption fails for coursebook/workbook/grammar/reader mixes.
Solution: ResourceSet per subject offering with primary/supporting resources.

W17 — Academic-year syllabus changes can overwrite history.
Solution: immutable AcademicSession CurriculumProfile versions; clone/migrate rather than overwrite.

W18 — Chapter-only question mapping fails for grammar, comprehension, cumulative revision, cross-chapter items.
Solution: multi-scope mappings: chapter, topic, skill, learning outcome/SLO, cross-chapter, general.

W19 — Unknown/local publishers cannot be represented if catalog is fixed.
Solution: open tenant-managed publisher/resource creation with canonical aliases/merge support.

W20 — Publisher change can strand useful old questions.
Solution: publisher-independent learning-scope mappings plus migration wizard for equivalent/renamed/moved/new/removed content.

### D. Question Bank growth / governance
W21 — Auto-capturing every manual draft pollutes the bank.
Solution: capture only from finalized/explicitly saved assessment states; Candidate -> Verified -> Ready -> Retired lifecycle.

W22 — Exact-string duplicate detection misses paraphrases.
Solution: layered duplicate engine: exact fingerprint, normalized fingerprint, semantic similarity suggestion.

W23 — Semantic auto-merge can destroy legitimately distinct questions.
Solution: never auto-merge semantic matches; human confirmation required.

W24 — Same question may exist across multiple curriculum/resource contexts.
Solution: QuestionMaster + QuestionRevision + many QuestionMappings.

W25 — Questions can silently lose source/provenance.
Solution: sourceType, creator, capturedFromPaper, resource mapping, revision history, rights/source metadata.

W26 — Bank can grow but quality may degrade.
Solution: readiness status, reviewer role, quality checks, usage statistics, retirement without destructive deletion.

W27 — Teacher-created questions can become bureaucracy-heavy.
Solution: inherit class/subject/chapter context automatically; no extra metadata form in normal workflow.

W28 — Auto mode can falsely imply completeness when bank coverage is weak.
Solution: coverage report + explicit gaps + manual completion path; never silently fabricate missing curriculum coverage.

### E. Assessment quality
W29 — A technically valid paper can be academically unbalanced.
Solution: optional blueprint engine for marks/topic/skill/difficulty/learning-outcome coverage.

W30 — Repeated questions can overfit students to the bank.
Solution: usage history, last-used indicators, configurable repeat warnings.

W31 — Difficulty labels can be subjective or stale.
Solution: treat initial difficulty as editorial metadata; later augment with item statistics, never present it as absolute truth.

W32 — Analytics can overclaim student weakness from one bad item.
Solution: show evidence thresholds, sample size, item quality flags and uncertainty; no single-question diagnosis.

### F. Manual / Bank / Auto / AI boundaries
W33 — Question Bank dependency could block manual paper creation.
Solution: Manual Mode has zero bank dependency.

W34 — AI outage could block the editor.
Solution: AI is an optional copilot only; deterministic core must work without it.

W35 — Auto-generated content can enter canonical bank unchecked.
Solution: generated items enter Candidate state with provenance; verified status requires deterministic checks/human policy.

W36 — Multiple creation engines could fork data formats.
Solution: every creation mode emits the same canonical PaperDocument.

### G. Persistence / concurrency / reliability
W37 — Browser-local localStorage is insufficient for a real multi-device school record.
Solution: server-backed canonical drafts with local recovery cache; local-only storage remains fallback, not source of truth.

W38 — Storage quota can lose work.
Solution: compact local journal, quota monitoring, server autosave, export/recovery path.

W39 — Two tabs/users can overwrite each other.
Solution: optimistic concurrency/version tokens; conflict dialog; non-destructive revisions.

W40 — Network interruption during exam preparation can lose progress.
Solution: local draft journal + visible sync state + retry queue + deterministic local print snapshot where safe.

W41 — Partial save can leave content/presentation out of sync.
Solution: atomic document revision save or transactional patch batches.

W42 — Schema migrations can corrupt old papers.
Solution: immutable source snapshot, migration version, reversible migration tests, migration audit.

### H. SaaS security / privacy
W43 — Cross-tenant Question Bank or student data leakage is a critical SaaS risk.
Solution: tenant scope enforced server-side on every object/query/cache/storage path; do not rely on UI filtering.

W44 — Roles are too coarse for curriculum/question approval.
Solution: least-privilege permissions for author, reviewer, curriculum admin, printer/exam operator, result entry.

W45 — Student names in personalized papers increase privacy exposure.
Solution: minimum required bindings, role-gated batch access, audit trail, no unnecessary persistence in templates.

W46 — Rich text/SVG/image content can become an injection vector.
Solution: strict sanitization, asset validation, CSP-compatible rendering, no executable markup.

W47 — Shared global publisher catalog can accidentally mix tenant-owned copyrighted material.
Solution: global catalog stores identities/metadata only; tenant-owned content and derived question material remain scoped with provenance/rights fields.

### I. Header / personalization / checking
W48 — Binding student names directly into saved paper duplicates papers per student.
Solution: one master PaperDocument + print-time personalization overlay.

W49 — Teacher name may be ambiguous where multiple teachers teach one subject/section.
Solution: resolve teacher binding from class-subject assignment with manual override recorded in print job.

W50 — Obtained marks should not mutate question maximum marks.
Solution: separate AssessmentResult/CheckingOverlay data model.

W51 — Question-wise marks strip can overflow on long papers.
Solution: responsive marks-grid with controlled wrapping and compact variants; print geometry tests.

W52 — Reordering/deleting questions can break historical marks mapping.
Solution: stable question instance IDs; display numbering is derived, not identity.

### J. Print / pagination / document fidelity
W53 — Multiple current print paths can create preview/print divergence.
Solution: one canonical PrintPipeline and print snapshot; legacy print paths retired after parity gates.

W54 — CSS alone cannot guarantee every pagination edge case.
Solution: explicit pagination model + browser measurement pass + print regression fixtures.

W55 — break-inside avoidance can create large blank gaps or overflow.
Solution: block-level break policy: atomic, splittable, keep-with-next, minimum-lines rules.

W56 — Duplex personalized printing can start next student on previous student's back side.
Solution: per-student booklet boundary and automatic blank padding page when needed.

W57 — Narrow margins may be outside printer capabilities.
Solution: presets plus printer-safe minimum; warn before print rather than silently clip.

W58 — Fonts may be unavailable at print time.
Solution: managed font-loading readiness gate and print fallback policy; Urdu print tests.

W59 — Urdu RTL mixed with English/math can invert punctuation/options.
Solution: language/direction at block/span level, bidi isolation, dedicated RTL fixtures.

W60 — Table expansion can overflow page width.
Solution: width constraints, column-resize limits, overflow diagnostics, split/landscape strategy if explicitly enabled.

### K. Accessibility / usability
W61 — Mouse-only drag/resize makes editor inaccessible and slower for keyboard users.
Solution: keyboard equivalents for reorder/resize/add; visible focus and shortcuts.

W62 — Color-coded sections alone are ambiguous.
Solution: color is supplementary; preserve labels/icons/text per WCAG.

W63 — Hidden advanced controls can hide essential actions.
Solution: progressive disclosure only for secondary features; core task actions remain visible.

W64 — Complex custom controls may be hard to learn.
Solution: standard controls where possible, contextual help, undoable operations, inline examples.

### L. Performance / scale
W65 — Rendering one huge editable document can become slow.
Solution: granular subscriptions, memoized blocks, lazy heavy inspectors/assets, performance budgets.

W66 — Personalized batch rendering hundreds of pages can freeze browser.
Solution: streaming/chunked print-job generation, worker/off-main-thread preparation where applicable, progress with cancellation.

W67 — Duplicate/semantic search can become slow as bank grows.
Solution: indexed normalized fingerprints; semantic search asynchronous/candidate-side, not blocking typing/print.

W68 — Huge image assets can bloat documents.
Solution: asset store references, compression policies, dimensions/size limits, immutable asset IDs.

### M. Interoperability / future portability
W69 — Proprietary-only question schema creates vendor lock-in.
Solution: internal schema remains primary, but build explicit QTI import/export adapter boundary.

W70 — Curriculum mappings become proprietary and hard to migrate.
Solution: CASE-compatible stable learning-outcome IDs/association model.

W71 — Roster/result coupling to one ASSPS schema blocks future integration.
Solution: internal adapters with OneRoster-style boundary concepts, without forcing OneRoster internally.

### N. Testing / operations / migration
W72 — Unit tests can pass while actual editor interaction is broken.
Solution: mandatory real Chromium acceptance for create/edit/reorder/save/reopen/print/personalize/RTL.

W73 — Golden screenshots alone can miss semantic/data corruption.
Solution: combine visual geometry tests with schema/marks/content assertions.

W74 — Legacy migration can preserve appearance but lose meaning.
Solution: semantic parity tests and source coverage checks, not screenshot-only migration.

W75 — New features may reintroduce old regressions.
Solution: permanent regression corpus of known historical failures and representative real papers.

W76 — “Works on my machine” print behavior can vary by browser/printer.
Solution: supported-browser matrix + PDF snapshot validation + real printer smoke procedure for release.

W77 — No release gate for critical data migrations risks production damage.
Solution: dry-run migration reports, reversible backups, canary tenant/feature flags, explicit production approval.

### O. Observability / governance
W78 — Failures may be silent and hard to diagnose.
Solution: structured error events for save/migrate/print/import, with user-safe messages and correlation IDs.

W79 — Auto-capture and curriculum migration can change knowledge base invisibly.
Solution: audit log with who/when/why/source and reversible administrative actions.

W80 — Feature flags/legacy fallback can live forever and create permanent complexity.
Solution: every fallback has owner, metrics, removal criterion and expiry milestone.

## Architecture changes accepted after red-team
1. Curriculum identity must be independent of publisher/resource identity.
2. Learning scopes must support chapter/topic/skill/SLO/cross-chapter/general.
3. Question Bank uses QuestionMaster + QuestionRevision + QuestionMapping + lifecycle.
4. Manual creation is the foundation; Bank/Auto/AI are optional accelerators.
5. One canonical PaperDocument is the convergence point.
6. One canonical validation/render/print pipeline is the end state.
7. Personalized printing uses bindings/print jobs, never document duplication.
8. Checking/results are overlays linked by stable question instance IDs.
9. Server-backed revisions are the source of truth; local storage is recovery/cache.
10. Progressive disclosure is a product requirement, not a cosmetic cleanup.
11. QTI/CASE/OneRoster are adapter/reference boundaries, not forced internal schemas.
12. Real-browser acceptance is mandatory before claiming completion.

## Release definition
Architecture is not considered proven until representative browser workflows pass:
- Manual weekly assessment with no Question Bank
- Chapter assessment with auto-capture and duplicate protection
- Mixed publisher/resource profile
- Curriculum version migration without changing historical papers
- Urdu/English mixed-direction paper
- Table-heavy custom assessment
- Personalized full-class batch with duplex boundaries
- Save/reopen/conflict/offline-recovery scenario
- Header template reuse and scoped formatting
- Print/PDF geometry and font fidelity
- Tenant/role isolation negative tests

## Current repo-specific findings
- Current Paper Generator contains multiple overlapping editor/generator/render/print paths.
- Question Bank currently includes publisher fields and hard-coded syllabus/subject data that are insufficient for the target versioned curriculum model.
- Several paper/draft paths still rely on browser-local storage; this is suitable for isolated recovery/prototypes but not the final multi-device source of truth.
- Existing canonical V2 work, Early Years isolation, revision guards, tenant-storage helpers and regression corpus are valuable foundations and should be preserved rather than rewritten blindly.

# Round 4 — Failure Engineering / Deep Adversarial Review
Date: 2026-10-04
Purpose: Extend the original W01–W80 register. These findings are additive. “Zero failure” is treated as a release discipline (zero known critical defects + graceful recovery), not as a mathematically provable promise.

## P. Current implementation / defense-in-depth findings

W81 — Database RLS migration does not currently include question_bank/question_bank_imports in its protected table list.
Risk: route-layer filtering becomes the only tenant barrier for those tables.
Direction: add DB-level tenant isolation policies and negative cross-tenant tests; route checks remain defense-in-depth.

W82 — Question Bank role gate gives teacher/admin/principal the same CRUD route surface.
Risk: an ordinary teacher can modify or delete institution-wide canonical questions.
Direction: split author/reviewer/curriculum-admin permissions and authorize every mutation separately.

W83 — Manual question creation defaults is_approved=true.
Risk: unreviewed teacher content immediately becomes trusted bank content.
Direction: default new captures to Candidate; promotion requires policy/reviewer.

W84 — Question update permits is_approved mutation through the normal edit endpoint.
Risk: author can self-approve or accidentally downgrade governance state.
Direction: lifecycle transition endpoint with role checks and transition rules.

W85 — Bulk AI import approval inserts records as approved immediately.
Risk: AI/OCR mistakes can become canonical without deterministic quality/duplicate gates.
Direction: imported content enters Candidate/Imported state; explicit batch review and duplicate gate before Ready.

W86 — Bulk import route currently has no bank-level duplicate/idempotency barrier visible at insertion.
Risk: retries/imports can multiply equivalent questions.
Direction: import batch idempotency key + normalized fingerprint + mapping-aware duplicate gate.

W87 — Question deletion is a hard DELETE.
Risk: audit provenance, historical references and usage analytics can be destroyed.
Direction: Retired/tombstone state; hard purge limited to exceptional retention workflows.

W88 — Question editing mutates the row in place.
Risk: history and exact paper provenance are lost.
Direction: QuestionMaster + immutable QuestionRevision; edits create new revisions.

W89 — Question edit route has no optimistic concurrency token.
Risk: two reviewers can silently overwrite each other.
Direction: revision/etag compare-and-swap; conflict UI.

W90 — Question IDs use timestamp + Math.random.
Risk: weak cross-system identity/import semantics and theoretical collisions.
Direction: UUID/ULID generated server-side; imported external IDs stored separately.

W91 — question_bank still keys class/subject/chapter largely by display text.
Risk: spelling/case/rename variants fragment the bank.
Direction: stable IDs for SubjectOffering, CurriculumProfile, LearningScope and ResourceVersion; display labels are mutable attributes.

W92 — board defaults to “Punjab Board”.
Risk: non-board/private-publisher items can be silently misclassified.
Direction: no implicit board authority; derive from active CurriculumProfile or leave explicitly unset.

W93 — difficulty/priority/type fields are free strings without strong controlled taxonomy.
Risk: “Med”, “medium”, “Medium”, custom values split analytics.
Direction: versioned taxonomies + validation + migration aliases.

W94 — marks is currently integer in the bank.
Risk: half/decimal marks and rubric-weighted scoring cannot be represented safely.
Direction: fixed-precision numeric marks with explicit rounding policy.

W95 — Schema/API round-trip is inconsistent: schema has fields such as question_subtype/question_text_english/explanation that are not uniformly handled by create/update/import paths.
Risk: silent data loss or divergent records.
Direction: one typed QuestionRevision contract used by every API/import/editor path.

W96 — Request validation is weak at the Question Bank boundary.
Risk: incomplete MCQs, invalid correct option, empty text, invalid marks can enter persistence.
Direction: server schema validation with per-interaction validators and actionable errors.

W97 — Question list pagination accepts client limit without a strict visible maximum clamp.
Risk: expensive queries or accidental large payloads.
Direction: hard server limits + indexed filters + cursor pagination at scale.

W98 — RLS policy architecture currently uses school_id while newer SaaS code also carries tenant_id.
Risk: dual tenant identifiers can drift or be inconsistently applied.
Direction: define one canonical tenant security identity; school_id may remain domain FK but tenant authorization must have a single source of truth.

W99 — Defense-in-depth coverage is inconsistent across tables.
Risk: newly added assessment tables may be forgotten in future RLS migrations.
Direction: schema convention/default-deny migration helper + automated “all tenant-owned tables have RLS” test.

## Q. Assessment / scoring model weaknesses

W100 — “Total marks = sum of question marks” fails when attempt-any or alternative groups exist.
Risk: generated totals can be mathematically wrong.
Direction: explicit ScoringPlan with maximum obtainable marks distinct from total available item marks.

W101 — Choice groups need identity independent of display numbering.
Risk: Q3(a) OR Q3(b) changes can corrupt total/marks strip.
Direction: ChoiceGroup entities with scoring rules and stable IDs.

W102 — Attempt-any at section level can combine with per-question choices.
Risk: naive marks engine cannot model nested constraints.
Direction: scoring graph/rule tree with deterministic validator.

W103 — Obtained mark “0” is not the same as Not Attempted, Absent, Not Checked or Exempt.
Risk: analytics/results become misleading.
Direction: result state + numeric score as separate fields.

W104 — Obtained marks must be constrained by the exact scoring rule active at finalization.
Risk: later paper edits can make old results invalid.
Direction: Result binds to immutable AssessmentRelease revision and QuestionInstance IDs.

W105 — Long/essay questions may need criteria/rubrics, not a single number.
Risk: inconsistent checking across teachers.
Direction: optional rubric/criteria model; simple marks entry remains default.

W106 — Partial-credit policy is not explicitly modeled.
Risk: MCQ, matching, multi-part and rubric scoring become inconsistent.
Direction: scoring strategy per block/interaction, with teacher override audit.

W107 — Negative marking/bonus marks are not represented.
Risk: future assessment rules may force hacks.
Direction: generic scoring policy supports normal, partial, optional penalty/bonus; defaults remain simple.

W108 — Marks rounding is undefined.
Risk: decimals can yield mismatched totals across UI, PDF and results.
Direction: school-level scoring precision and deterministic rounding.

W109 — Question-wise result strip can misrepresent optional questions.
Risk: student may be shown boxes for questions not required/attempted.
Direction: result strip generated from ScoringPlan, not raw question list.

W110 — Regrading after a marking-policy correction is not modeled.
Risk: edited scores overwrite history without explanation.
Direction: ResultRevision with reason/actor/timestamp and recalculation preview.

## R. Universal editor / block-model weaknesses

W111 — CanonicalNodeType is still a closed enum.
Risk: every new assessment block requires core schema changes and can revive fragmentation.
Direction: versioned BlockRegistry with core types + namespaced extension types; unknown-safe fallback.

W112 — Question-type capabilities are coupled to question type.
Risk: current registry marks MCQ/short as not supporting math/images in places even though real MCQs/shorts can contain them.
Direction: rich inline content capabilities (text/math/image/table/bidi) orthogonal to interaction type.

W113 — Some types are marked supportsRtl=false.
Risk: Urdu-medium Math/Science/matching activities become artificially unsupported.
Direction: renderer capability matrix + bidi-safe content nodes rather than language prohibition by type.

W114 — Board-specific section mapping is embedded in type metadata.
Risk: board policy leaks into generic question semantics.
Direction: Board/AssessmentPattern as separate preset/rules layer.

W115 — Legacy blank document factories include demo/default content and examination-specific defaults.
Risk: a “blank” weekly assessment can inherit wrong title, marks, instructions or sample questions.
Direction: truly blank creation contract; presets explicitly opt in defaults.

W116 — Legacy document defaults hard-code ASSPS identity/address.
Risk: multi-tenant reuse can leak wrong school identity.
Direction: identity comes from tenant profile binding; document snapshots it only at release/export.

W117 — Generic rich text can become an escape hatch that bypasses semantic structure.
Risk: marks, accessibility, duplicate detection and analytics cannot understand content.
Direction: rich text allowed as a block, but assessment interactions remain typed where semantics matter.

W118 — Tables need semantic roles beyond raw grid geometry.
Risk: matching, answer tables, grammar tables and layout tables become indistinguishable.
Direction: table purpose + header semantics + editable grid model.

W119 — Inline mathematics has no single canonical interchange representation across all question types.
Risk: pasted equations become images/HTML fragments and lose editability/accessibility.
Direction: canonical math node (MathML/LaTeX source + rendered view); QTI adapter maps appropriately.

W120 — Asset/image lifecycle is not separated from document text.
Risk: base64 bloat, broken URLs, duplicate images and inconsistent print quality.
Direction: immutable Asset records with dimensions, MIME, checksum, ownership and references.

W121 — Image print quality/DPI is not validated.
Risk: screen looks fine but printed diagram is unreadable.
Direction: effective-DPI warning and minimum-quality gate for finalized print.

W122 — Digital accessibility metadata for diagrams/images is not first-class.
Risk: future digital delivery/export cannot provide alternatives.
Direction: alt text/long description fields; print can ignore visually while export preserves metadata.

W123 — Unicode normalization is not explicitly part of duplicate logic.
Risk: visually same Urdu/Arabic strings can hash differently.
Direction: language-aware normalized search fingerprint while preserving exact authored text.

W124 — Aggressive Urdu/Arabic normalization can create false duplicates.
Risk: meaningful orthographic differences can be collapsed.
Direction: conservative normalization tiers; semantic match never auto-merges.

W125 — Translation/equivalent-language items can be mistaken for duplicates.
Risk: bilingual bank loses intentional variants.
Direction: relation types: translationOf, variantOf, derivedFrom, duplicateOf.

## S. Release / print / exam-day integrity weaknesses

W126 — There is no explicit immutable “AssessmentRelease” artifact in the current target model.
Risk: nobody can prove exactly what was approved/printed after later edits.
Direction: finalization creates immutable release snapshot + hash + renderer version.

W127 — Draft, Reviewed, Finalized, Sealed, Printed and Archived are not clearly separated lifecycle states.
Risk: accidental printing of incomplete paper or editing after approval.
Direction: simple lifecycle with role-aware transitions; daily weekly tests can use lighter policy.

W128 — Print action itself is not modeled as a durable PrintJob.
Risk: roster, teacher binding, duplex settings and copy count cannot be reliably audited/reproduced.
Direction: PrintJob references AssessmentRelease + roster snapshot + rendering settings.

W129 — Personalized batch must snapshot the roster.
Risk: student enrollment/section changes between preview and reprint alter the output.
Direction: immutable RosterSnapshot ID on PrintJob.

W130 — Subject-teacher binding must also be snapshotted.
Risk: staffing changes alter historical paper headers.
Direction: resolved teacher identity stored in PrintJob/Release binding snapshot.

W131 — Reprint semantics are undefined.
Risk: “reprint” may silently use latest paper/roster instead of original.
Direction: Reprint Original vs Create Updated Print Job are explicit separate actions.

W132 — Student-facing print artifact may accidentally contain answer-key data in hidden DOM/metadata.
Risk: PDF/HTML inspection could reveal answers even if visually hidden.
Direction: dedicated student-render projection that never receives answer-key fields.

W133 — Answer-key export needs separate authorization and artifact.
Risk: answer material leaks through common print path.
Direction: staff-only AnswerKeyProjection, separately audited.

W134 — Browser print output can vary across browser versions.
Risk: same paper reprinted months later paginates differently.
Direction: record renderer/browser engine version; archive finalized PDF when exact reproduction matters.

W135 — Font version drift can change pagination.
Risk: updated webfont alters line breaks and page count.
Direction: managed/versioned font assets and release-time font readiness/hash.

W136 — Margin presets can exceed a printer’s printable area.
Risk: clipping despite browser preview.
Direction: printer-safe defaults, calibration/smoke procedure, explicit risk warning for custom margins.

W137 — Batch print temporary files can contain student PII.
Risk: stale PDFs remain on server/browser/device.
Direction: retention policy, short-lived signed access, automatic cleanup and audit.

W138 — Print cancellation/retry could create duplicate physical copies without record.
Risk: exam material overprinting/exposure.
Direction: PrintJob attempt counter/status and operator confirmation for sensitive finalized exams.

W139 — Item exposure is not a first-class selection constraint.
Risk: auto generation repeatedly uses high-priority items until students can predict them.
Direction: exposure count/rate, last-used context, secure/practice classification and configurable cooldown.

W140 — Confidential exam items and normal practice-bank items need different access policies.
Risk: reusable weekly-test bank becomes a route to upcoming exam content.
Direction: sensitivity classification + embargo/release window + role access.

## T. AI / import / content provenance weaknesses

W141 — AI-generated questions may be linguistically good but academically wrong.
Risk: wrong answer/learning outcome enters assessment.
Direction: Candidate only, deterministic checks, provenance and human Ready transition.

W142 — OCR extraction can preserve text but map it to the wrong chapter/page.
Risk: false curriculum alignment.
Direction: source anchors + confidence per field + review of low-confidence mappings.

W143 — AI prompt/data path could receive student names or confidential finalized papers unnecessarily.
Risk: privacy/confidentiality exposure.
Direction: AI gateway strips PII by default and blocks sealed assessment payloads unless explicitly policy-approved.

W144 — AI provider/model changes can alter output behavior.
Risk: reproducibility and audit problems.
Direction: record provider/model/prompt-template version for generated candidates; never make generation deterministic correctness source.

W145 — AI outage/rate limit could surface as editor failure.
Risk: core paper creation appears broken.
Direction: capability degradation banner; manual/bank workflows remain fully usable.

W146 — Generated variants A/B/C may not be equivalent in difficulty.
Risk: unfair assessment.
Direction: variants require blueprint equivalence checks and teacher review; never claim statistical equivalence without evidence.

## U. Data durability / operations weaknesses

W147 — Browser-local saved papers are not an adequate final source of truth.
Risk: device loss/storage clear/quota destroys work.
Direction: server-backed PaperRevision store; local journal is recovery cache.

W148 — Backup/restore objectives are not specified for assessment data.
Risk: database incident can lose question bank/history.
Direction: defined RPO/RTO, encrypted backups, restore drills and tenant-scoped export.

W149 — Audit logs could be mutable/deletable with normal admin powers.
Risk: governance history becomes unreliable.
Direction: append-oriented audit stream with constrained retention/admin operations.

W150 — No explicit disaster-recovery acceptance scenario exists.
Risk: backups exist but cannot actually restore a paper/bank.
Direction: scheduled restore drill into isolated environment and checksum verification.

W151 — Migration success is not enough if rollback is impossible.
Risk: bad schema/content migration damages production knowledge bank.
Direction: expand/contract migrations, preflight report, rollback/forward-fix plan and backups.

W152 — Feature flags can preserve multiple behavioral worlds indefinitely.
Risk: permanent route/editor fragmentation.
Direction: every flag has owner, removal criterion, telemetry and expiry milestone.

W153 — Current multiple print/editor paths can diverge during transition.
Risk: fixes land in one path only.
Direction: canonical contract tests run against every remaining adapter until each legacy path is retired.

W154 — Release observability lacks explicit user-journey SLOs.
Risk: “server healthy” while saving/printing is broken.
Direction: monitor create/save/reopen/finalize/print success rates and latency, not only HTTP uptime.

W155 — Queue/global resource contention can let one tenant’s large job degrade others.
Risk: multi-tenant availability failure.
Direction: tenant quotas, fair scheduling, bounded batch sizes and backpressure.

## V. Privacy / interoperability / accessibility weaknesses

W156 — Student personalization should minimize data fields.
Risk: unnecessary PII printed/stored.
Direction: explicit binding allowlist; default name/roll only, optional fields require need.

W157 — Data export/import can accidentally cross tenant boundaries.
Risk: otherwise-correct QTI/CSV import becomes data leak.
Direction: import package is always assigned to authenticated tenant; external IDs never determine tenant.

W158 — CASE/QTI/OneRoster adapters can become internal-model dictators.
Risk: ASSPS complexity bends around external standards.
Direction: adapters at system boundary only; internal domain model optimized for ASSPS workflows.

W159 — Accessibility support cannot be postponed to export stage.
Risk: authoring choices make accessible output impossible later.
Direction: editor captures language, alt text, structure, keyboard operability and bidi semantics at authoring time.

W160 — “Drag to reorder” alone is insufficient.
Risk: keyboard/assistive-tech users cannot perform core editing.
Direction: Move Up/Down commands + keyboard shortcuts + drag as optional convenience.

W161 — Redundant entry remains possible if class/subject/session/header values are repeatedly requested.
Risk: wasted time and inconsistent metadata.
Direction: auto-populate from active context with clear override; aligns with WCAG redundant-entry guidance.

W162 — Destructive/final actions need reviewability.
Risk: accidental delete/finalize/replace causes high-cost mistakes.
Direction: reversible where possible; otherwise checked/confirmed review screen with exact consequences.

## W. New release doctrine

W163 — Literal “zero weaknesses / zero failure” cannot be honestly proven for a non-trivial SaaS.
Risk: false confidence causes weaker release discipline.
Direction: define “Zero Known Critical Weaknesses” plus graceful degradation/recovery, continuous red-team, and measurable reliability SLOs.

W164 — Passing tests can still miss unknown failure classes.
Risk: test suite becomes the definition of correctness.
Direction: production-like chaos/fault injection in isolated environment, exploratory browser sessions and post-release telemetry.

W165 — Fixing every edge case before shipping can create unbounded complexity.
Risk: architecture becomes too complicated to operate.
Direction: simplicity budget: every feature must justify its data model/UI cost; prefer reversible minimal mechanisms.

W166 — Reliability features themselves can create noise.
Risk: teacher sees sync states, revisions, lifecycle, warnings everywhere.
Direction: quiet-by-default reliability; surface only actionable exceptions and finalization status.

W167 — A universal editor can become a general word processor and lose assessment intelligence.
Risk: more power but less automation/validation.
Direction: free-form capability exists inside a constrained assessment document model; academic semantics remain first-class.

W168 — Conversely, over-structuring every block makes manual creation slow.
Risk: teachers bypass the system.
Direction: fast rich-text/custom block escape hatch + optional “Convert to structured question” workflow.

W169 — Automatic question capture can surprise teachers.
Risk: private scratch questions enter institutional knowledge base unexpectedly.
Direction: clear school policy + subtle capture indicator + ability to exclude a question/paper from bank capture.

W170 — Auto-capture from assessment can copy temporary mistakes before correction.
Risk: bank inherits an error even if paper is later fixed.
Direction: capture from finalized revision; subsequent correction creates linked candidate revision, never silent overwrite.

## Round-4 architecture consequences
- Question Bank security/governance must be fixed before auto-capture is enabled.
- DB-level tenant isolation must cover assessment/question-bank tables, with automated coverage tests.
- AssessmentRelease, PrintJob, RosterSnapshot and ScoringPlan become first-class domain concepts.
- Question interaction type must be separated from content capabilities such as math/image/RTL.
- Secure/practice item exposure policy is required before Smart/Auto selection is trusted.
- Final source-of-truth must move from browser local storage to server revisions while retaining local recovery.
- Finalization/printing must produce student-safe projections that physically exclude answer-key fields.
- Reliability target is “zero known critical defects + graceful recovery,” not an unverifiable promise of mathematical zero failure.

