# ASSPS Grade IX–X — School-specific textbook edition adoption evidence

**Date:** 16 October 2026. This is a narrow, read-only School 1 database evidence-chain check. It must NOT be interpreted as proof that a school never adopted textbooks or that official PECTAA/NCC documents are inapplicable. School-issued adoption records could exist outside these tables and need authentic attribution.

## Actual database result

| Source table (School 1) | Versioned records |
|---|---:|
| academic_session_versions | 0 |
| curriculum_profile_versions | 0 |
| resource_books | 0 |
| resource_versions | 0 |
| learning_scope_versions | 0 |
| school_academic_approval_events | 0 |

These existing schema tables currently supply **no complete session → curriculum profile → adopted textbook edition → chapter/learning scope chain** for Grade IX or Grade X in School 1. Therefore catalog source PDF hashes, edition inventories and older published smart syllabus cannot independently establish the school's adopted 2026–27 textbooks.

## Autonomous truthful verification

The machine now reads all six tables within an explicit PostgreSQL read-only transaction, stores only count-based root-private evidence at `/var/lib/assps-grade910-sourceclaims/school-adoption-inventory.json`, and maintains `schoolEditionAdoptionVerifiedByThisAudit=false` even if new version records appear; those new records become evidence candidates requiring authenticated edition, subject, medium and session linking.

The script `ops/qbank/audit-school1-versioned-textbook-adoption-20261016.py` has **six regression tests PASS** including zero/partial/full artificial version counts, missing/malformed counters, non-fabrication of school adoption, and root-private receipt. The existing weekly source-integrity systemd service, CI and canonical six-phase mission receipt use the result without modifying database rows or promoting a research candidate.

**Explicit continuing academic boundary:** genuine School 1 adoption evidence and original specific PDF chapter/topic/exercise locations, independent qualified subject/Urdu per-revision review and Paper Studio/Core authorized publication are unfulfilled by this technical scan. General Principal institutional acceptance and printer hardware acceptance have already been carried forward and are not re-requested.
