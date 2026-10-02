# ASSPS Paper Generator — Phase 3B protected saved-paper baseline and persistence contract
Date: 2026-10-02
Parent Git checkpoint: 641cbe7347252c534be495167fa7646eaba96d61
Branch: feat/paper-approved-snapshot-revisions-phase3b-20261002
Status: isolated development, **NOT DEPLOYED**.

## Principal's appearance contract
An approved original is the authority, not an inspiration for a new template. Existing wording, question and subpart sequence, brackets, answer lines, MCQ table, header/logo, Urdu/Jameel/RTL, margins, breaks, spacing, A4 preview and native PDF must survive unchanged. A new edit/revision is ALWAYS a separate opt-in working copy unless explicit permission is granted after verified visual evidence. No baseline capture initiates a save, migration, rename, print or overwrite.

## Storage findings (actual checked-in source)
1. usePaperStore.js stores savedPapers inside tenant-scoped al_siddique_paper_store, and usePaperStore.loadStore() may seed/upgrade an in-memory view. Therefore the baseline must reread the currently persisted raw key WITHOUT migrateLegacy and confirm that the displayed selected paper JSON exactly equals the persisted object. Refuse stale displayed versions, duplicates, invalid JSON, or missing store. Never export the whole paperStore (questions, school settings, other papers).
2. Canonical workingDraftStorage.js persists independent teacher field/style/structure overlays under al_siddique_canonical_working_drafts. The per-paper export must include an exact matching draft (either paper ID or doc__paperID) and its own checksum when present, and refuse two matching drafts or mismatched draft ID. It must not substitute an empty draft if a corrupt one exists.
3. Early Years original reference edits are a different product/storage key, assps-early-years-editor-working-copy-v1 (paperID::questionID overlays), with a separate template map and a separate user-owned assps-early-years-user-papers-v1 library. The generic Saved Papers baseline dialog DOES NOT claim to capture those unrelated Early Years overlays. Their nine unedited teacher SOURCE papers are separately protected by Phase 3A SHA fixture and eight native print/geometry tests. Early Years *working overlay* export needs its own dedicated flow before any migration of those custom versions.
4. The native payload's property order and exact JSON string are meaningful for checksums. PostgreSQL JSONB may reorder object keys; the future storage plan retains native_json_text TEXT plus optional searchable JSONB and hashes the original text consistently.

## Current phase 3B implementation
- SavedPapersTab.jsx exposes an explicit Native Baseline button for non-teacher UI roles, opening SavedPaperBaselineDialog.jsx. The modal explains source-only evidence (not screen/PDF approval), asks acknowledgement, reads current authenticated tenant storage and downloads only the selected paper + its Canonical overlay. No network endpoint, no automatically granted approval and no global store write.
- PaperEditor/core/SavedPaperBaseline.js creates assps-native-saved-paper-baseline v1 with the full original paper (zero inferred marks/layout), original source SHA-256, original native appearance SHA-256, the actual separate working draft if present, exact source ID/revision/type/native renderer, explicit DATA_CAPTURE_ONLY status, screenshot/PDF still pending and independent payload SHA-256.
- verifySavedPaperBaseline validates entire envelope, source/working-draft fingerprints and refuses changing renderCutoverAllowed. Checksums detect accidental/unilateral file edits; these are NOT server signatures or proof of authorization (a party able to rewrite a file could recompute an unkeyed checksum).
- compareCurrentSavedPaperWithBaseline reports independently whether the original saved paper or Canonical overlay changed (including source top-level names) and NEVER installs/restores from the uploaded .json. It blocks cross-tenant comparisons. The same-card export refuses stale UI versus persisted version.
- planIndependentPaperRevision builds a strictly informational, uncommitted separate-copy proposal with expected source/draft SHA and original revision, validates that the new copy has no persisted ID and cannot self-approve. Actual backend authorization remains required.
- Existing official, recovered, reference and saved papers are not modified by this feature branch.

## Backend authorization and CAS policy — preparation only
al-siddique-backend/src/services/papers/paperRevisionPolicy.js exports pure assertSchoolPaperAuthorization and preparePaperRevisionCAS. It is NOT mounted in Express and runs NO query. Tests simulate:
- Authenticated principal/admin/teacher access by the owning school as verified by DB; teacher may revise only their own draft; approved, reference and locked records never enter revision flow.
- Even a super_admin must supply a separately VERIFIED owning school ID; never use request headers, query tenant values or caller-supplied school ID as trusted authorization. An untrusted school context is not a privilege grant.
- Optimistic compare-and-swap expectedRevision and native SHA; must match native JSON TEXT fingerprint already stored. Prevent wrong ID/provenance rewrite, self-approval, malformed/non-object proposals, oversized JSON and no-op revision.
- The return value explicitly states PREPARED_ONLY_NOT_EXECUTED; a real transaction is a distinct, gated next implementation step. Independent school/role tests must also run against real authenticated staging endpoints.

## Proposed database schema — REQUIRES independent live schema audit and backup first
The following is a non-executed design, not proof that these tables already exist. Do NOT auto-run migrations or attach these routes during Phase 3B.

paper_documents:
- composite PRIMARY KEY (school_id INTEGER REFERENCES schools(id), paper_id TEXT) — no cross-school ID alias.
- source_family TEXT; immutable_source_id TEXT; immutable_source_sha256 CHAR(64); source_protected BOOLEAN NOT NULL DEFAULT FALSE.
- native_json_text TEXT NOT NULL (the exact teacher-approved payload); native_sha256 CHAR(64) NOT NULL; optional native_search_json JSONB for indexed metadata only.
- original_renderer TEXT NOT NULL; appearance_sha256 CHAR(64); target_marks explicit or NULL; revision INTEGER NOT NULL CHECK (revision > 0).
- status TEXT NOT NULL CHECK IN (DRAFT, REVIEW, APPROVED, LOCKED); created_by/updated_by INTEGER REFERENCES users(id); created_at/updated_at TIMESTAMPTZ NOT NULL; latest_visual_evidence_revision INTEGER NULL.
- constraints verify native hash and JSON shape at service layer; checked constraint/index choices must be tested on the *actual* Postgres version and source data first.

paper_revisions:
- PRIMARY KEY (school_id, paper_id, revision).
- FOREIGN KEY (school_id,paper_id) -> paper_documents (school_id,paper_id); actor_user_id, previous_revision, previous_sha256, revision_sha256, full_native_json_text, appearance_sha256, diff_summary_json JSONB, created_at.
- append-only: no application UPDATE/DELETE privilege on revisions. Revision 1 contains the full imported native source and preserves links to its unchanged original.
- approved_paper_visual_evidence (later): school_id, paper_id, revision, artifact_kind (screen_a4, print_pdf), SHA-256, verified_by, verified_at and a real artifact pointer in access-controlled storage, never uncontrolled localStorage or big base64 in paper_documents.

Future atomic transaction (service design, NOT executed):
BEGIN; SELECT paper_documents WHERE school_id=authenticatedSchoolId AND paper_id=:id FOR UPDATE;
verify current revision, current native hash, authorized actor, DRAFT status and immutable source; UPDATE paper_documents SET native_json_text=:newExactText,native_sha256=:newHash, revision=revision+1,updated_by=:actor WHERE school_id=:scope AND paper_id=:id AND revision=:expected AND native_sha256=:expectedHash AND status='DRAFT' RETURNING...; require exactly one row or return 409, ROLLBACK;
INSERT paper_revisions for same school/paper/new revision (full exact JSON, old SHA, new SHA, actor and timestamp); COMMIT. On any failure ROLLBACK both. A principal's later paper approval is a *separate*, audited visual-evidence-aware endpoint, not part of this CAS update.

## Pre-deployment gates
- Read-only production database introspection, foreign keys/indices/RLS inventory and authorized role matrix (two separate schools + teacher/principal/admin + delegated super_admin).
- Make and RESTORE-TEST encrypted backup; verify migrations do not modify existing First Term examination result/marks tables, reference corpus, or local tenant keys. Confirm rollback and hashes.
- Verify browser data baseline plus independently captured original preview screenshot and A4 PDF for the principal-selected ACTUAL saved working paper(s). Compare text, coordinates, font, brackets/RTL and overflow before enabling a renderer switch. Current baseline JSON does NOT constitute approved pixel/print parity.
- Full fixed source-regression set: 101 SHA object fixtures; 43 canonical screen-vs-print examples; nine Early Years print/geometry and Jameel; Class 8 Urdu saved marks; native user drafts; cross-tenant/corruption/CAS tests; print/export no-op; trial on 8GB Windows PC.

## Phase 3B executable acceptance evidence
- New frontend pure tests: 9/9 PASS. Real principal Saved Papers browser: 5/5 PASS (including teacher hidden action, downloaded selected native paper AND independent saved canonical draft, compare-only MATCH, external mutation detection, no source overwrite and corrupted import rejection). Backend pure school/owner/revision policy: 11/11 PASS. Combined native golden/overlay/print-browser suites: 37/37 PASS including 101 locked source hashes, Class 8 Urdu and eight Early Years print/geometry cases.
- After final scoped lint cleanup, second frontend snapshot+browser suite: 14/14 PASS, ESLint PASS and fresh Vite build PASS.
- Phase 3B branch independent Canonical all-43 screen-versus-print parity rerun COMPLETE: all 43/43 iterations PASS; aggregate test exit code 0. Frontend baseline/browser targeted rerun 14/14 PASS, ESLint PASS, Vite build PASS. Earlier combined native/source/print/browser suite 37/37 PASS; standalone backend policy suite 11/11 PASS.
- No live personal browser snapshot has been created, and no source-file hash is substituted for the principal's actual saved working paper evidence.
- Feature-flagged staging only, supervised approval and rollback. Production release remains examination-first-term-workflow-v1-r3-paper-hotfix4-compact.

Next continuation: Early Years reference-overlay-specific read-only snapshots and native PDF/screen visual evidence capture; then staging-only authenticated paper documents transaction after DB schema/backup review. Do not turn user-selected DATA_CAPTURE_ONLY into APPROVED automatically.
