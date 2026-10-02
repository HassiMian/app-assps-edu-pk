# ASSPS Global SaaS planning directive — Pakistan-first, world-ready
Recorded: 2026-10-02. Status: APPROVED USER STRATEGIC CONSTRAINT, NOT IMPLEMENTATION OR MARKET-VALIDATED DECISION.
Scope: overarching ASSPS school/college/education SaaS strategy and Paper Generator Phase 3Q onward.
Parent integration coordination: https://github.com/HassiMian/app-assps-edu-pk/issues/1

## North star
Launch priority: Pakistan. Long-term competitive scope: international, including UAE/GCC and other countries.
Never design an architecture which assumes that the permanent market, curriculum, language, currency,
calendar, academic session, grade naming, regulations, payment network, or institution type is Pakistani.
"Most advanced" is an ambition to measure against real outcomes, not a factual marketing claim.
Do NOT attempt to implement every jurisdiction in the first release. Build extensibility from day one;
activate additional markets only after source research, local legal review, operational proof and support readiness.

## Challenge before choosing or changing a feature
1. Compare both Pakistani and international competitors using current, dated, cited evidence; distinguish
   advertised claims from working product evidence; assess customer pain, complexity, acquisition and support.
2. Challenge ASSPS assumptions and existing competitor patterns; do not clone a rival's UI or build a second
   Question Bank to achieve familiar navigation. Prefer simpler teacher workflows when validated by tests.
3. Evaluate each proposed feature for: actual daily benefit, usability and clicks, reliability,
   security/privacy, availability under slow networks, localization, maintainability, cost and scalability.
4. Measure teacher paper-assembly completion, errors, successful recoveries and print parity; observe
   parent/student tasks; test across device sizes and keyboards rather than asserting user experience.
5. Preserve existing ASSPS sources, school/tenant data, archival/reference papers, approval records,
   Early Years, existing editor and examination workflows. Inventory + backup + reversible migration before
   modifying any persisted schema. No premature rewrite, merge, deployment or data seed.

## Target product architecture (provisional; subject to complete architecture/research audit)
- Shared SaaS core: identity, authenticated tenant/school/campus boundaries, role and permissions,
  consent/privacy, immutable audit events, revisions, backups and disaster recovery.
- Institution adapters: Early Years, primary/secondary, intermediate college, and later semester/
  credit-hour degree college, using distinct data-model capabilities rather than one overloaded class enum.
- Country/region packs: grade/school scheme, country-specific fields, academic calendars, holidays,
  timezone, currency/tax/billing connectors, official curriculum/board exam rules and data-residency controls.
  Do not hard-code PECTAA, Punjab, Urdu or Pakistan regulations into universal tables.
- Localization: Unicode, complete LTR/RTL/bidi and print parity, accessible UI, language/locale/timezone
  separated from curriculum medium; English, Urdu, Arabic and additional languages extensible.
- Academic authority layer: verified textbook edition, chapter/topic and language-specific source IDs,
  page/exercise evidence, authoring/review/approval, Full Textbook default, optional proven year-specific
  ALP (or analogous local exam scope) as a jurisdiction policy, not a hard-coded global switch.
- Assessment layer: independent approved Question Bank consumer and teacher-authored local questions;
  non-destructive Class > Subject > Chapter > Topic > MCQ/Short/Long navigation, immediate selection,
  persistent paper-side draft/marks and preview, de-duplication, separate Attempt Any sections, manual insert
  and independently editable paper instance. Question authoring must not rewrite approved source records.
- Business/consumer experience: attendance, fees, exams/results, lesson diary, parent/sibling/student
  portals, communications and student practice; country-specific payment and communication connectors.
- Infrastructure: modular monolith first unless measured need proves service extraction; versioned APIs,
  tenant-safe relational core, object storage for documents, transaction/outbox for critical workflows,
  background jobs with retries and observability, feature flags, disaster-recovery drills, scalable
  deployment regions as warranted. Offline-first selected workflows require explicit conflict resolution.
  Separate school operational transactions from expensive AI/OCR/PDF generation workloads.

## International research coverage to complete BEFORE final master blueprint
Pakistan (launch), UAE/GCC (regulatory/Arabic/bilingual/payment differences), and global vendors across
SIS/ERP, LMS, admissions, assessment/question-bank tools, fee/payment and parent apps. Review examples
such as PowerSchool, Infinite Campus, Veracross, iSAMS, ManageBac, openSIS, Moodle, Fedena and regional
alternatives; their inclusion is a research queue, NOT an endorsement or verified capability assertion.
For each country/product: source/date, specific audience and institution levels, demonstrable differentiator,
workflow depth, limitations, pricing uncertainty, integration/API, portability, privacy/residency and cost.

## Decision gates: no speculative final architecture
Gate 0 current data/route/storage dependency inventory and protected backups.
Gate 1 source-backed Pakistan + global market/JTBD and comparative UX research.
Gate 2 end-to-end paper creation user journey and prototype acceptance, preserving Phase 3O/3P contracts.
Gate 3 approved Curriculum provider with canonical bilingual source mappings, independent human review.
Gate 4 new-authoring PaperDocument + reversible persistence, strict school/tenant authorization.
Gate 5 regression, RTL/LTR A4 print, memory/load, recovery/security, accessibility and browser acceptance.
Gate 6 phased Pakistan pilot; validate retention, teacher time saved, support burden and fees accuracy.
Gate 7 country-pack expansion only after UAE/GCC/international validation and local legal review.
At every gate: smallest beneficial change first, explicit evidence, rollback and audit of legacy compatibility.

## Locked ongoing safety
Curriculum Implementation agent owns real original questions, source evidence and approval.
Paper Generator owns approved snapshot consumption and editor experience; GitHub Issue #1 coordinates.
Do not touch the parallel curriculum worktree's uncommitted source evidence or production.
Existing School/Class6 Urdu closure is not a reason to rebuild saved papers.
