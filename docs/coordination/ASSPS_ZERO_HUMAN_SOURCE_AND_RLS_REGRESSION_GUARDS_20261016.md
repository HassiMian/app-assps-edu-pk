# ASSPS Zero-Human Canonical Source, Question Provenance and RLS Protection — 16 October 2026

## Production safety and technical acceptance
- Latest live frontend still `/var/www/assps-resultcards-owner-accepted-20261016`; HTTPS website and API return 200.
- Real `exam_results` unchanged: 1,763 rows in 2 tenants, including 213 actual numeric zeros. No student marks or historic single out-of-roster `Mover / Purple / Computer` result rewritten.
- Primary physical RICOH MP C307 A4 and school Principal's institution-level academic acceptance were already confirmed. Neither must be re-requested. There were **zero printer jobs** in this mission.
- Grade IX/X original Question Bank 2,411 live provisional rows (IX=1,530, X=881) with 809 structurally well-formed MCQs, zero exact normalized grade-subject-medium stem duplicates. Their `source_file_id` fields are **29 provisional seed JSON files**, `source_type=json_seed`, `metadata.review_state=provisional_internal` across all 2,411; **no actual textbook page locations** are populated. These facts cannot be published as independent source verification. No research revision falsely approved.
- The full existing protected academic 30-batch/1,112-test machine QA passed in an isolated systemd-backed disposable workspace, weekly QA receipt: `QA_PASSED_NO_AUTOMATIC_ACADEMIC_PUBLICATION`, machine not faculty approval.

## Actual improvement: canonical-source installer self-ownership
The prior hourly installation script was **incorrectly pinned** to an older `/root/workspace/assps-zero-human-ops-20261016` worktree. It would re-install stale monitoring code after future commits. Repaired to derive `SOURCE` and `REPO` from the installer’s actual resolved executable location, fail closed on non-Git or dirty source, and compare installed script SHA-256 against canonical source. The installed running hourly monitor now matches canonical source byte for byte. Source-level test locks this behavior to prevent future regression. No production web assets or DB schema modified to achieve the repair.

## Actual improvement: Grade IX/X source type correctness
`is_approved=true` on a candidate whose record still has `source_type=json_seed`, `metadata.review_state=provisional_internal`, or a provisional seed filename now triggers `GRADE910_APPROVED_WITH_ONLY_PROVISIONAL_JSON_SEED_PROVENANCE`, even if a fake page number or answer was supplied. The 2,411 genuinely pending records remain informational source-evidence gaps, not false live-site outages.

## Actual improvement: read-only RLS policy contract
Catalog/metadata audit independently found all **six key tables** (`exam_results`, `question_bank`, `exam_subjects`, `students`, `question_revisions`, `question_masters`) with forced RLS enabled; six app-runtime RESTRICTIVE `app_runtime_school_guard` policies, six signed-runtime RESTRICTIVE `core_signed_tenant_guard` policies, and **zero** `rolbypassrls` among the three tracked production roles (`apex_app_runtime`, `assps_marks_signed_runtime`, `assps_core_green_runtime`). The unattended hourly self-audit now fails closed on catalog drift from this exact contract. These checks do **not** impersonate real teachers or independently establish live cross-tenant authenticated denial, which remains separately evidence bound.

**School results:** First Term 302 student identities with 1,762 school1 recorded marks, 284 absent expected subject marks across 233 pupils and one saved `Mover / Purple / Computer` orphan subject; all preserved and not guessed as zero. 64/81 configurations have internally consistent saved maxima, 17 lack matching evidence.

## State / limitations
- Hourly service `assps-technical-self-verification.timer` active; 23/23 deterministic unit tests verify safeguards.
- Weekly `assps-grade910-weekly-qa.timer` active and first full sandboxed test 30/30, 1,112/1,112. Both emit root-only receipts and failure alerts.
- CI and guarded Core preflight remain enforced. No full-stack Core cutover was performed on this branch; production promotion remains the SaaS Core owner’s protected scope.
- Future academically verified Paper Studio snapshot requires real applicable school textbook/edition, exact source-page evidence and authentic independent subject faculty revision approval. Zero-human machine checks cannot forge these human-origin records.

Relevant owner coordination: GitHub issues #1/#4 and canonical branch `integration/core-zero-human-validation-unified-20261016`.
