# ASSPS Paper Generator — Phase 3N original source reinspection at review handoff
Date: 2026-10-02.
Parent: pushed and clean Phase3M 3f198f2cdeeadca4fdc8fc05633a18ffc56cadd1.
Branch: feat/paper-source-reinspection-handoff-phase3n-20261002.
Status: DORMANT original-preserving local-only development. No production route,
migration, persistent staging connection, school data export or paper release.

## The previously unclosed trust gap
Phase3L and Phase3M workpack JSON carry SHA-256 of local unsigned JSON.
They are useful for accidental corruption but any party with edit access can
modify native source reference / review metadata and RECOMPUTE that unsigned
checksum. Phase3M already marks persistedInspectorInvocationCryptographicallyAttested
false. Phase3N therefore NEVER trusts a saved workpack as proof of its own
provenance or original print-page count. The saved worksheet is UNTRUSTED INPUT.

## New production-independent service and CLI
al-siddique-backend/src/services/papers/paperOriginalReinspectionPhase3N.js

reinspectSavedNativeWorkpack requires the operator to explicitly select
the original Phase3D source DATA JSON, manifest JSON, full original native
preview PNG, native A4 Print PDF, independently chosen exact paper ID, tenant
scope and paper family, separately approved local PDF inspector executable
and independent executable SHA pin, and saved Phase3M workpack.

The wrapper FIRST reruns Phase3K actual four-file source/SHA/renderer/tenant
intake from FILE BYTES, then reruns Phase3M pdfinfo inspection against the
actual original PDF and independently supplied pinned binary. It compares the
ENTIRE saved workpack to a freshly regenerated canonical Phase3M workpack
built from those inspected facts and original same-paper source identity:
all four original fingerprints, original native renderer/family/tenant,
actual individually numbered full A4 PDF page count/geometries, pinned
inspector SHA, review checklist and ALL immutable false release flags.
A forged saved checksum cannot repair disagreement with actual current
native bytes or independently rerun page metadata. The wrapper rereads all
four original files AFTER external inspector returns, compares identity
and all source SHA again, and reruns exact canonical workpack comparison.

The separately exported pure helper compareAgainstFreshlyInspectedOriginal
is expressly labeled COMPARISON_ONLY: injecting synthetic input objects
cannot create actual independent reinspection provenance/approval.

ops/paper-staging-review/phase3n-REINSPECT-saved-review-READ-ONLY.cjs:
one-shot local CLI requiring TEN named explicit flags for four originals,
independently selected original identity, approved local inspector binary+pin
and the EXISTING saved private Phase3M workpack. It accepts only a regular,
nonlinked, non-hardlinked, bounded, unchanged .json workpack, uses verified
absolute paths, prints only REDACTED success/refusal (no original source
content, school scope, filenames or reviewer notes), does not write ANY file,
upload, install packages, access a database or integrate Express route.
It never treats self-reported workpack paths or reviewer text as authority
for the fresh source/inspector selection.

This new Phase3N verification reports only:
PHASE3N_RERUN_MATCHES_SAVED_UNAPPROVED_WORKPACK and verified count if ALL
real reinspection checks are successful. It STILL explicitly retains
false principalApproval, actual signed-in LIVE original source provenance,
reviewer signature, semantic page-to-native-screen parity, genuine authorized
persistent staging backup/restore and production release/source mutation.
No cryptographic signing key exists in this Phase3N workflow; local SHA is
not a trusted external attestation or automatic approval.

## Adversarial acceptance, synthetic ONLY
tests/paperOriginalReinspectionPhase3N.test.js:
- 10/10 initial PASS. Recomputed unsigned worksheet checksum can pass its
  older internal checks but fails against a freshly reconstructed source SHA.
- Even geometrically plausible edited PDF page sizes within A4 tolerance
  fail exact independent source reinspection; stale source revision, different
  school/renderer/family, rotated inspector SHA, omitted/reordered printed
  page and substituted native PDF fingerprint also fail.
- No path to APPROVED/cutover/SourceWrite via missing workpack, self-relabelled
  flags or injected fake pure-comparison arguments.
- No actual four-file package or vetted pdfinfo is available on the current
  reviewed PC, so the real native reinspection wrapper REFUSES rather than
  running on fiction; local CLI no-args rejects and emits redacted failure.
- Re-run final combined offline Phase3B–3N default suite before commit.
  All real DB tests remain intentionally opt-in and are not repeated on a
  production-installed DB. No new PDF inspector or PDF parser installed.

## External real-world blockers retained
1. Actual selected original paper in the signed-in school Paper Editor with
   its SAME-source Phase3D baseline JSON + complete native PNG + native print
   PDF + matching manifest, privately retained as real four-file evidence.
2. An approved, SHA-pinned local external native PDF inspector; genuine PDF
   full-page A4 inventory, independent every-page original human comparison
   (fonts/RTL/brackets/marks/tables/diagrams/answer spaces/page clipping).
3. Verified identity/signature and provenance of the independent reviewer.
4. Separately authorized genuine persistent ISOLATED STAGING DB inventory,
   actual encrypted school/staging backup and separate-cluster recovery
   including role/secret lifecycle before any persistent import/migration.
5. Preserve official and Early Years original reference, protected teacher
   data, frontend/print/editor, source SHA, approved marks and school projects.
   NO original-paper deletion, no fabricated visual signoff, no live cutover.

Exact next continuation: Phase3O may build strictly OFFLINE readiness tools
or, ONLY when separately supplied and authorized, review actual selected
original evidence. Do not restart or rerun completed Phase3A–N development.
