# Principal original-paper evidence and genuine staging handoff — Phase3J review-only
Date: 2026-10-02. This is a CHECKLIST, never an attestation or production approval.
At Phase3J checkpoint: no genuine four-file native principal package, actual
authorized persistent staging database or actual encrypted school backup was supplied.

## A. Principal source-native four-file package (same signed-in paper AND revision)
[ ] Original last-approved ASSPS paper identified; not a generated/sample/altered copy.
[ ] Use existing Phase3D Paper Editor evidence workflow (do NOT change renderer).
[ ] Export and privately retain actual full source-native DATA baseline JSON.
[ ] Save COMPLETE original native A4-height preview screenshot as PNG (including
    all continuous page spans), not a screenshot of a re-created template.
[ ] Original native Print/Save as PDF at A4 with ALL pages and complete Urdu,
    English, logo/assets, tables and text (no regenerated mock/PDF).
[ ] Export the Phase3D visual evidence manifest JSON binding EXACT DATA + PNG
    + PDF fingerprints and paper/tenant/source revision/family.
[ ] Retain all FOUR original files unchanged in an authorized private location;
    never upload real student details, production secrets or school DB dumps to Git.
[ ] Reopen selected original paper while signed in and compare its current native
    data/overlay/template source SHA against baseline; refuse stale source.
[ ] Independently review EVERY PDF page against original editor + PNG: question
    order and complete text, marks and totals, MCQ options/brackets, Urdu Nastaleeq/
    RTL direction, Times New Roman/LTR, graphics/sketches, school name/logo,
    tables, answer space, margins, page breaks, clipping and print parity.
[ ] A reviewer distinct from merely ticking browser self-attestation documents
    exact paper identity, scope/revision, changes found, approval or rejection.
[ ] Phase3I read-only four-file verifier may report matching fingerprints ONLY;
    it always returns human visual review PENDING and cutover=false.
Current status: BLOCKED — actual four-file principal evidence not yet received.

## B. Persistent NON-PRODUCTION database and encrypted source recovery
[ ] Principal/deployment owner explicitly authorizes a named ISOLATED STAGING
    PostgreSQL server/DB not shared with actual production data or live app endpoint.
[ ] Read-only inventory verifies true schema, school/users PK types, paper tables,
    index/constraints, role grants, RLS ENABLE/FORCE and no legacy fail-open branches.
[ ] Trusted backend authenticates school before privately selecting per-school
    credential pool. User-supplied schoolId/header/actor/connect never has authority.
[ ] Secret manager stores isolated credentials; no credentials/URLs in Git or logs.
[ ] Independently take the genuine authorized staging encrypted backup with
    retention/access controls, not merely a fictional pg_dump size/status flag.
[ ] Practice restore to a separately initialized secure NON-PRODUCTION cluster;
    recover global roles and relevant database artifacts, rotate school credentials,
    compare original native TEXT SHA, audit chain, RLS, ownership and print source.
[ ] Principal/reviewer authorizes reviewed manual DDL only after real backup+restore
    and native visual source approval, with rollback plan and a lock on originals.
Current status: BLOCKED — Phase3J proved only synthetic fresh-cluster mechanics.

## C. Hard no-go guarantees
No existing production PostgreSQL 5432 queries or migrations. No live paper
updates/deletion/import, original A4 renderer switch or implicit approved-paper
conversion. No fee/marks/exam/attendance/Question Bank/Diary changes. Phase3J
feature branch code is dormant and offline until a reviewed later stage explicitly
authorizes staging integration; dummy role names 51/52 are NOT real ASSPS tenants.
