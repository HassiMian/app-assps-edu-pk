# ASSPS Paper Generator — Phase 3L independent page review workpack (unapproved)
Date: 2026-10-02. Exact clean parent: Phase3K ab89d1251d5dd128d9ea9cb9fd3bba947e0d0fab.
Branch: feat/paper-independent-visual-review-docket-phase3l-20261002.
Mode: OFFLINE, dormant, no production application mounting, no authenticated staging access.

## Remaining user-signoff blocker
As of this phase, principal-selected genuine native baseline JSON, Phase3D visual
manifest JSON, actual original FULL native PNG and matching original A4 Print PDF
are not available in the selected worktree. An unsigned screenshot/JSON hash or
a developer-run fixture can NEVER authorize any live system change. The principal
must independently identify the approved original from the signed-in current
paper before any comparison to native screen, source and every PDF page.
This phase does NOT claim to resolve absent actual human sign-off.

## New Phase3L workpack
al-siddique-backend/src/services/papers/paperIndependentVisualDocketPhase3L.js
accepts only the exact non-approving preflight result from Phase3K and requires
an explicit MANUALLY CLAIMED PDF page count of 1–32 (not a machine count).
It creates an unsigned source-fingerprint-bound worksheet with only four source
SHA fingerprints, original renderer/scope/paper reference, fixed checklist and
hard-false release gates. Ten separate original visual categories on EVERY
claimed page: school header/logo, all question text/order, marks/totals, MCQ
option labels/brackets, Urdu Jameel Noori/RTL punctuation, Times New Roman/LTR,
sketches/assets, tables/borders/answer lines, A4 margins/page breaks/clipping
and editor-preview/PNG-vs-native-PDF appearance parity.

Each claimed page requires all ten explicitly boolean observations in the correct
sequence; missing/duplicated pages and missing fields reject. Any discrepancy
requires reviewer notes and creates VISUAL_REVIEW_DISCREPANCIES_RECORDED hard
blocker. Missing machine-readable A4 PDF geometry is an explicit blocker.
Collector and observer references must differ, but do NOT count as actual verified
human identity: unsigned manual checklist entries remain SELF-ATTESTED and must
later be independently authenticated and signed by an authorized reviewer.
All-true checkboxes still NEVER return independentlyApproved, source mutation or
production cutover true. Fixed blockers continue to include missing authoritative
live-original provenance, independent human signature, persistent staging
authorization, REAL encrypted backup/fresh-cluster restore and reviewed production
auth/secrets. Recomputed unsigned checksum or forged APPROVED field is rejected
on the original worksheet and cannot convert it into authority.

ops/paper-staging-review/phase3l-CREATE-UNAPPROVED-review-docket.cjs
is a deliberate local-only explicit 10-flag intake and worksheet handoff:
baseline, manifest, preview, print, paper-id, tenant-scope, family, claimed-pdf-pages,
collector-ref and output. It FIRST reuses Phase3K exact four-file intake and its
second stat+SHA recheck, then creates a NEW user-chosen private review .json via
exclusive wx, mode 0600. No existing review or source file is overwritten.
Output may NOT be inside this Git worktree and stdout/stderr never display original
student/teacher paper content, sensitive selected paths or tenant names.
This is a local operator utility, not an Express route, source mutation, secret
store, genuine reviewer approval or global-role test. Do not save original files,
review worksheets with real school identities or genuine DB backups inside Git.

## Verified acceptance
- Phase3L module and executable Node source syntax PASS.
- tests/paperIndependentVisualDocketPhase3L.test.js: 10/10 PASS; includes
  unavailable originals, denied fake approval, altered four-file fingerprint,
  recomputed unsigned approval label, invalid PDF page count, missing/duplicate
  per-page checks, discrepancies without notes, explicit pending human signature
  with all ten checks TRUE, unknown A4 page geometry blocker, CLI no-args/missing
  files refusing without creating an output, Git-location/output-overwrite guard.
- Full default-no-real-DB Phase3B→Phase3L backend regression recorded before
  commit. Any real DB test is opt-in ONLY and was already completed in separate
  previous phase isolated runners; no new PostgreSQL test cluster needed.
- Approved original native source/editor/print/UI and protected frontend Git
  tree 209bf6375b9eb57fc269e04309f435bc1270effe remain untouched.

## External gates STILL BLOCKED
1. Principal last-approved actual original selection and exact DATA/PNG/PDF/manifest.
2. Actual independent reviewer identity, signed provenance and EVERY real PDF
   page's human visual comparison; PDF page count is currently a claimed input.
3. Explicitly authorized isolated persistent staging inventory and genuine
   encrypted staging backup with verified independent restore/role rotation.
4. Reviewed private authentication and credential management for real tenants.
No live migration, no existing production PostgreSQL 5432, no original-paper
overwrite, no print renderer cutover, no school other-module edits.
Continue Phase3M only from Phase3L pushed clean checkpoint, do not restart phases.
