# ASSPS / APEX Connect — School Document & Notice Studio
Status: APPROVED DESIGN CANDIDATE FOR IMPLEMENTATION, NOT LIVE APPROVAL OR PRODUCTION RECEIPT
Date 2026-10-16 | School 1 is initial tenant, product design is multi-tenant.

## Critical distinction: do not merge unrelated timetable concepts
A. `school_bell_profiles` = what time the bell rings, assembly, period boundaries, Friday no-break, effective dates. No teacher/subject/student data.
B. `timetable` = class, section, day, period number, subject, teacher, room; existing historical 58 Regular rows are preserved. Teacher allocations must never be inferred from Bell Profiles.
C. `school_documents` = notices, circulars, print-ready snapshots, general class date sheets, school-wide bell-timing circulars, approved academic roster attachments. A document can *reference* an academic source without altering it.
D. Student-specific date sheet in student workflow is intentionally distinct: authorization-scoped, can carry student identity. Notice Studio's general/class date sheet NEVER renders student name, student ID or marks. One print per class/section or combined school table.

## Research-inspired notice taxonomy
Administrative: holiday/closure, revised hours, bell schedule, exams and general datesheet, fee dates/policy (no personal account amount), admissions/enrollment, dress/uniform, transport and route changes, parent-teacher meeting, policy changes, special assembly, emergency safety, weather/health advisory, event/sports/trip consent, syllabus/homework reminders, achievements, meeting agenda/minutes, facilities, visitor notices.
Staff-private: teacher duty/allocation, substitution, meeting call, exam invigilation, staff circular, observation, lesson-plan deadline, duty roster, leave procedure, acknowledgement/sign-off; sensitive individual personnel matters are PRIVATE, never printed in general student notice or school-wide bulletin.
Document kinds: Notice / Circular / Office Order / Memorandum / General Datesheet / Academic Timetable / School Period Timings / Consent / Staff Acknowledgement / Custom.
Templates are structured starting points, never irreversible AI free text.

## Placement and workflows
New sidebar parent 'School Documents' under OPERATIONS, leadership and academic staff:
  Notice Studio (draft, templates, structured preview); Document Library; Publish/Approval Queue; Sign-off Receipts; Published Noticeboard (read-only audience filtering).
Existing Academic Timetable stays under Academics. Existing Date Sheet remains student/exam module. Add separate 'Period Timings' tab/view from Core Bell Profiles; expose print through Notice Studio using source reference.
Flow: choose document type -> source picker (if linked) -> audience (school/parents/teachers/classes/sections) -> metadata/body -> preview -> save draft -> request approval -> approve via signed actor -> publish -> acknowledged receipts -> archive or issue corrected revision. Printing drafts carries 'DRAFT' watermark; no forged electronic signature.
UI: clean editorial dark navy + cyan/teal + silver/gold restrained; white print paper, readable 11-12 pt body, contrast>=4.5:1, 300dpi logo asset when available, minimalist micro-grid/foil visual, visual templates: Formal Authority, Premium Prism, Academic Ledger, Staff Circular, Event Editorial; separate monochrome ink-saving mode. PDF, print and Word share one document schema/layout engine; true output parity must be tested with browser renderer, not assumed.

## Data boundary / schema
Proposed tables, additive migration ONLY after DBA preflight and restore rehearsal:
- school_bell_profiles(id, school_id, academic_session, version, effective_from, effective_to, status, regular_json, friday_json, created_by, published_by, published_at, revision). Unique school/version, partial unique active effective policy per school; no teacher data.
- school_documents(id UUID, school_id, doc_no, kind, status, audience_scope JSONB, title, language, source_kind, source_id, source_revision, template_id, current_revision, created_by, approved_by, published_by, published_at, expires_at, brand_snapshot JSONB, created_at, updated_at).
- school_document_revisions(document_id, revision, structured_content JSONB, rendered_hash, actor, created_at), append only; published revision immutable.
- school_document_events(id, school_id, document_id, actor_id, event_kind, metadata, created_at), append-only release and print auditing.
- school_document_acknowledgements(document_id, recipient_type, recipient_id, revision, acknowledged_at); school-scope and uniqueness.
- school_branding_versions(school_id, revision, logo_url/asset_sha, names, address, palette, updated_at) if current settings are insufficient; source remains canonical SaaS branding. Connect consumes Core, not a second manually uploaded logo.
Avoid new columns on marks/results/students/date_sheets/timetable in initial release.

Document content contract: {paragraphs, headline, issue_date, action_required, due_date, signer_label, optional schedule_rows, optional general_date_sheet_rows, copies_to}, with strict max lengths and no unsanitized HTML. Never trust displayed logo URL without origin/path validation.

## Backend/API proposal
GET /api/school/bell-profiles/active (scoped; current version + effective date).
GET /api/school-documents/templates (school-scoped catalog, no PII).
GET /api/school-documents (scoped, filter status/audience/class/term).
GET /api/school-documents/:id (scoped, audience).
POST /api/school-documents (draft only, server validates actor/school).
PATCH /api/school-documents/:id (draft only, optimistic revision check).
POST /api/school-documents/:id/submit, /approve, /publish, /archive (state transition and role/scope checks).
GET /api/school-documents/:id/print (signed revision and brand snapshot, print-safe).
POST /api/school-documents/:id/ack (actor and recipient binding, cannot ack another person).
GET /api/school-documents/sources/general-date-sheet?class=&section=&term=&session= (server selects class-level rows and strips identity).
GET /api/school-documents/sources/class-timetable?class=&section= (only validated linked roster).

P0 must NOT expose publish until persisted approval/audit model is verified. If existing /api/notices is reused during transition, treat its rows as separate legacy data and do not assume publish workflow. Existing notices table has read/write routes but not official Print Studio or approval status.

## Permissions
Teacher: create personal/department drafts only, see own drafts and appropriate published notices, no publish/approve, no arbitrary staff confidential access.
Principal/admin: approve and publish permitted school documents; cannot approve one's own high-risk HR order without policy.
Student/parent: scoped published notices only, no staff confidential docs and no student roster/marks disclosures.
Super Admin: tenant-specific access must respect school_id and RLS, never read across tenants by altering request body school_id.
Service actors: require explicit scope, tenant binding and audit; absence of school context fail closed.

## Logo/branding ownership
Core canonical GET /api/school/settings/current -> tenant_id + school_id + logo_url + school_name/address/palette/version. Core UI uses TenantBrandingContext already; new Studio must consume it, not paperSettings hardcoded logo. On error no fallback to another school's cached logo; show visible missing-branding warning. For official publish/print, block if branded asset cannot be verified; accept text-only emergency print only by explicit school leadership choice with audit. APEX Connect should GET Core tenant branding via authenticated school context with ETag/brand version; never synchronize by manually copying an ASSPS logo file into an unrelated school tenant. All derived printed snapshots lock brand version at approval to avoid unreviewed header changes.

## Live compatibility, rollback, acceptance
Read-only current inventory: notices table exists with zero ASSPS notices; 58 old Regular class/assembly rows, no Friday rows. Academic DateSheet uses /api/date-sheets; preserve student-specific variants separately.
Build all features on latest tested descendant; do not replace current production Next.js/Nginx work or teacher/staff records.
Security checks: tenant A allowed/B denied, no anonymous access, teacher cannot publish, fake school_id ignored, body XSS cannot escape, no leaked student names in general date sheet. Race version tests; no zero-vs-blank marks mutation. Print checks: A4 portrait/landscape, Urdu RTL/Jameel Noori screen/print, English Times, page breaks, logo aspect ratio, no clipping, monochrome, empty field behavior. Teacher signatures must be real human sign-off, not programmatically forged. Confirm backup, rollback, route smoke, Core/CASC provenance, Student ID & Connect coherence before production.
Release staged: architecture -> schema in isolated QA DB -> API security tests -> frontend/print tests -> Connect branded consumer -> signed production gate -> read-only smoke -> rollout. No automatic publication or DB overwrite.
