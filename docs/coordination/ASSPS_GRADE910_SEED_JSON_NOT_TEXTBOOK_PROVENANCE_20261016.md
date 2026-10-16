# ASSPS Grade IX–X Source-Identity Truth Gate — 16 October 2026

## Live, read-only findings

The canonical School 1 live `question_bank` research candidates for Grades IX and X are **not textbook-provenance certified**. The source_file_id string is **NOT** an original textbook document identifier in this dataset; it names the local research seed input.

- Grade IX: **1,530** provisional candidates.
- Grade X: **881** provisional candidates.
- Total: **2,411**, all marked `source_type=json_seed` and `metadata.review_state=provisional_internal`.
- Distinct `source_file_id` entries: **29** JSON files, all provisional seed inputs.
- Genuine textbook page/exercise locator in `source_page_no`: **0/2,411**. (2,411 unresolved.)
- Live `is_approved=true`: **0**. This is evidence of unapproved source status, **not** a school owner refusing routine academic consent.
- Machine-checked Grade IX/X MCQs: **809** with four distinct option labels, four distinct nonempty texts, and exactly one matching A/B/C/D answer key reference; structurally invalid **0**. No proof yet that all 809 chosen answers match textbook facts.
- Exact normalized question-stem duplicates, scoped to grade+subject+medium: **0**; near-duplicates require separate conceptual review.

**Critical design correction:** It is false to count `source_file_id IS NOT NULL` as official original textbook source verification when the value is `*_provisional_seed_*.json`. The unattended operational guard now has explicit `provisional_seed_reference_rows`, `provisional_seed_file_count`, and `approved_rows_still_linked_to_provisional_seed` fields. The last one triggers **CRITICAL** if a later import flips an academic approval flag while its provenance is still a provisional JSON seed (even if a superficial page or answer is filled in).

The genuine verified source identifier must come from the applicable ASSPS-adopted edition/source catalog, its actual PDF/content hash and verifiable exact page/topic; the school’s prior institutional owner acceptance and separate independent qualified faculty’s **actual** revision decision remain distinct. Neither can be fabricated by software.

## Preserving First Term student data

In School 1 Exam 9, **1,763 saved examination score rows across two school tenants**, including **213 real 0 marks**, are unchanged. For School 1, **284 missing subject-score entries for 233 students** are not set to zero. A single non-roster-scoped historical `Mover / Purple / Computer` saved score remains preserved as an **unmapped historical result**. Do not delete, rename or reassign it without a legitimate teacher-confirmed classification. Existing 81 subject config revision statuses are administrative settings, not 81 fresh independent academic question signatures.

## Tested and deployed controls

The isolated machine academic runner was previously attested with **30/30 source/test stages and 1,112/1,112 TAP tests PASS**, no published faculty-approved snapshots. The weekly full protected QA timer is enabled and the initial real sandboxed run shows `QA_PASSED_NO_AUTOMATIC_ACADEMIC_PUBLICATION`. The hourly monitor is enabled and `OPERATIONAL`; it uses read-only PostgreSQL, protects marks, flags malformed MCQ keys and duplicates, checks Diary/Result Cards/Marks View and anonymous endpoints, and sends no printer jobs.

Source-controlled governance remains based on Core’s latest canonical descendant; no production app or database cutover authorized here. GitHub coordination issues #1 and #4 are authoritative for the handoff.
