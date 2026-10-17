# ASSPS Grade IX–X — Matric-Tech Source Applicability & 137-Record Review Firewall

**17 October 2026 | Authoritative academic research-only checkpoint | Not teacher approval, school adoption, or Paper Studio publication**

## Cluster findings

The existing protected Grade IX/X academic ledger contains **137 HIGH answer-depth research items** with Matric-Tech subject labels. This metadata-only audit joined each distinct question ID and **current protected live full-question revision SHA256**, its immutable original research revision SHA and already-attested PECTAA catalog identity; it does **not** extract or persist question stems, answers, copyrighted textbook content, or student information.

| Evidence category | Verified metadata |
|---|---:|
| Current School 1 HIGH Tech-labelled question revisions pinned | 137 |
| Distinct earlier SHA-attested official source PDFs mapped | 15 |
| Official catalog item label explicitly 2026–27 | 26 question references |
| Catalog item session **not specified** | 111 question references |
| Catalog item medium **not specified** | 29 question references |
| Same subject/grade/chapter-number English–Urdu **candidate** pairs | 53 pairs (106 IDs) |
| Single-medium question records | 31 |
| Verified school programme/textbook adoption | 0 |
| Verified exact printed textbook exercise/question pages | 0 |
| Independent qualified subject or Urdu equivalence reviews | 0 |
| Newly approved/published questions | 0 |
| Production database writes | 0 |

A matched chapter number is only a **candidate pairing**, NOT proof the English/Urdu questions or answers are equivalent, nor that the school adopted that subject. Do not infer textbook session from a filename, link an unpaired record automatically, or treat a published Matric-Tech catalog title as adopted by ASSPS.

The official Punjab Education Curriculum Training and Assessment Authority lists Matric-Tech textbooks and curricula at [Curriculum & Compliance](https://pectaa.edu.pk/curriculum-compliance/). A dated title on this public site is **not** evidence of a particular private school's approved academic session, stream, grade grouping, medium or board examination scheme. Similarly, an internally cached PDF's previously validated bytes and physical page count are not independent proof of a question appearing on a specific exercise page.

## Current subject/grade queue

| Grade | Tech-labelled subject | HIGH research items |
|---|---|---:|
| IX | Agriculture Sciences | 20 |
| IX | Biology | 18 |
| IX | Chemistry | 26 |
| IX | Computer Science & Entrepreneurship | 20 |
| IX | General Science | 22 |
| IX | Physics | 2 |
| X | Biology | 8 |
| X | Communication Skills & Personal Grooming | 9 |
| X | Health Sciences | 9 |
| X | Physics | 3 |
| **Total** | | **137** |

The 137 HIGH Tech-labelled items are **not additional database questions**. They remain within the original protected **2,411 School1 live provisional question IDs**, 2,581 original source research IDs, 170 original-only held items, 604 original subjective answer-depth screening flags, and 358 current unlinked answer-research flags. Their HIGH priority is **editorial answer-depth risk**, not expert determination of scientific correctness. The conventional high-depth items have supplemental original **unapproved** research, not published academic approval.

## Source-proof architecture and limits

- `ops/qbank/build-grade910-tech137-adoption-metadata-proof-20261017.py` validates 137 unique question IDs, grade/subject source metadata, immutable original revision SHA, real *previously computed* School 1 live full-revision SHA, the 111-record frozen official catalog manifest, the existing 56-PDF physical-page/hash-attestation receipt, exact counts and no-approval invariants. The manifest bytes must match the SHA in that earlier protected audit.
- The root-private `/var/lib/assps-grade910-sourceclaims/tech-137-school-adoption-source-ledger-20261017.json`, mode `0600`, contains IDs, hashes, catalog/source metadata and review-required false flags only. It contains **no question or answer text**.
- This execution uses earlier independently attested source PDF byte hashes. **It does not itself rehash all 15 PDFs or authenticate textbook question/exercise pages**, and makes no claim of doing so.
- Existing fail-closed tests reject stale live revision hashes, false prior reviewer approval, modified catalog sessions and prior PDF-attestation conflicts. GitHub CI runs hermetic checks; protected VPS tests also verify full current read-only ledgers.
- A safe additive scheduled-audit postcheck re-authenticates the root-private receipt after the preexisting Grade IX/X one-shot academic checks. No new production deployment, duplicate timer, tenant mutation or paper publication.

## Single authoritative academic release gate

The unified Grade IX/X Academic Master retains **4 of 6 machine phases**. Official textbook adoption in ASSPS 2026–27, authentic applicable Tech-stream programme/medium, original exercise-level source references, qualified independent revision-specific subject/Urdu/answer reviews, Paper Studio approved-only selection integration and SaaS Core restricted-role/RLS/production certification remain **unmet**. Never transform a research count or PDF catalog count into an academically approved or selectable Question Bank record.

For coordination use GitHub issues [#1](https://github.com/HassiMian/app-assps-edu-pk/issues/1) and [#4](https://github.com/HassiMian/app-assps-edu-pk/issues/4). Preserve all provisional data and original governance handoffs.
