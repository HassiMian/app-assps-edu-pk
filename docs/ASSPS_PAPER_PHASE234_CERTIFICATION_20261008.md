# ASSPS Paper & Assessment Studio — Phase 2/3/4 certification

**UTC checkpoint:** 8 October 2026
**Owner:** AL SIDDIQUE SCHOLARS PUBLIC SCHOOL, Sharif Chowk, Rayya Khas, Narowal
**Execution scope:** Verification and safe operational tooling only. No production migrations, question promotions, tenant data movement, backend/frontend replacement, or automatic scheduling.

## Frozen architecture invariants

- The **manual editor is an independent foundation**. A teacher can create, edit, save, finalize, reopen, and print without a Question Bank.
- Manual, Question Bank and intelligent authoring paths converge into a governed, revision-bound **PaperDocument** and the same teacher-facing Paper Workspace. Legacy editors cannot become a second authority.
- Publication/ScoringPlan must preserve choice-aware marks, immutable revisions, question options and output-source parity.
- Tenant RLS, user role/class assignment, curriculum/source provenance, Urdu RTL/Jameel Noori and English print geometry are protected gates. Unapproved or provisional imported questions must not be used for automatic paper generation.

## Phase 2 — production workflow certification

**Result: PASS for tested software workflows.** Authenticated HTTP was tested against a **disposable production database clone**, with the service isolated on port 5048, and genuine Chromium UI checks were performed against an exact current source descendant. No synthetic production DB writes.

| Gate | Actual evidence |
|---|---|
| Teacher creates through assigned portal, detail/list scoping | G40 4/4 PASS |
| Save, guarded rename, revision conflict, soft-delete and immutable journal | G34 7/7 PASS |
| Revision/SHA-bound DOCX HTTP and cross-tenant fail-closed | G21 9/9 PASS |
| Teacher manual creation without QBank, finalize/reopen/print | Browser 1/1 PASS |
| Class 1 Islamiyat uses unified Workspace, not retired V2 | Browser 1/1 PASS |
| All 43 official First Term sources reopen through teacher Saved Papers in unified Workspace; retired editor flag blocked | Genuine Chromium 43/43 PASS and legacy guard 1/1 PASS |
| Urdu Workspace typography/structure/print, ScoringPlan, DOCX browser | 12/12 PASS |
| Lesson Planning, Daily Diary, auth recovery, personalized duplex print | 4/4 PASS |
| Real authenticated school dashboard, students, attendance, fees, timetable, academic setup, paper context, bank, lesson plans | 14/14 PASS |
| Governed Question Bank capture and lifecycle | HTTP 9/9 PASS |
| Tenant-bound durable lesson plans | HTTP 12/12 PASS |
| Teacher Question Bank lifecycle/assignment scope | 10/10 PASS |
| Governance list identity/revision hydration | 3/3 PASS |
| Real Chromium official English/Urdu A4 binary PDF and RTL/LTR geometry | 1/1 PASS |
| Official corpus screen/print parity | 43/43 PASS in genuine Chromium against the current frontend source: render structure, 1,027+ nodes, Urdu direction, screen/print text and horizontal overflow checks |
| Physical school printer | NOT TESTED — genuine Chromium PDF proof is not a device/driver test |

## Phase 3 — canonical source and forward-only release guard

**Actual live frontend:** `7887d80427f03c0a028f521ba4a10562cd8e7429`

**Actual live backend:** `b829290a7ebb47de9946fc9f2291283c6c0fc90f`

Separate component commits are legitimate. Git verifies the backend descends from the frontend's source commit. The branch is not rolled backward to `main` or stale Paper Studio worktrees.

- Deployed backend runtime inventory: **361 matching tracked files**, zero missing/different.
- Current production build: `index.html` byte-identical; 83/83 asset names present. Two Vite/Rolldown chunks differ at the byte level only because the preload-index map order changes; resolving and comparing the actual referenced dependency sets produces identical normalized JavaScript contents. **Do not misstate this as exact-byte reproducibility.**
- The pre-existing single-hop release guard incorrectly treated a later valid security/stability backend commit as drift. The isolated forward patch now checks **multi-hop ancestry**, exact remote branch commit, both intermediate base references, and rejects backend-only certification if shipped frontend source changed. Live component release guard returned safe=true. The patch is not yet claimed deployed.
- Full ops suite (including nine new exam readiness/QA gates): **76/76 PASS**; production safety check PASS and protected templates **6/6 unchanged**.
- PostgreSQL effective tenant runtime role `apex_app_runtime` verified NOLOGIN and NOBYPASSRLS; 75 tenant tables inspected. A privileged bootstrap role exists for schema management, but it is not the effective role of authenticated Paper Studio queries.
- VPS root disk reported **37% used, 31 GB free** at initial inspection. Historic cleanup removed Git worktrees, so a new isolated clone was taken directly from the exact production backend branch; no stale branch was deployed.
- Production PM2 remains PORT=5000. Staging uses 5048 and a disposable DB; no changes were made to PM2 production.

## Phase 4 — daily examination Question Bank readiness

**Automatic Grade 9/10 Question Bank readiness: BLOCKED (verified, not assumed).**

The school database currently has two records with the same institution name but separate tenant codes. The operational school identity is school **1**, code `assps` (581 users, 317 students at the clone snapshot), and the second record is school **5**, code `al-siddique` (no users/students).

- Grade 9–10 bank available under operational school 1: **0 records**; approved inventory and ready chapters: **0**.
- At the isolated database-clone snapshot, tenant 5 held **2,151 provisional Grade 9–10 drafts** (1,279 Grade 9, 872 Grade 10) across **297 grade/subject/chapter entries**. A subsequent **read-only live database check** found **2,271** drafts (1,399 Grade 9, 872 Grade 10): 120 additional Grade 9 draft records appeared during this certification. This is concurrent staging activity, not a release-approved inventory.
- All 2,151 cloned records were `is_approved=false`, `metadata.review_state=provisional_internal`, and have no verified `source_page_no`. Existing independent source audit identifies missing exercise/source/edition mappings. Therefore **zero chapters meet the sample daily recipe** (5 MCQ + 5 short + 1 long, configurable).
- Of **701** provisional multiple-choice questions in the clone snapshot, **666 have key A** (95.01%). This extreme skew is an editorial QA warning, **not proof** that individual answers are wrong. It is an additional reason not to release these drafts automatically.
- No tenant 5 source questions were moved, approved, copied into active papers or made visible to school 1 by this certification. The live audit likewise found **zero** approved 9th/10th questions in that staging tenant. The actual teacher endpoint restricts to `school_id`, approved questions, and the teacher's active class/subject assignment.
- A new **read-only, restricted-role, explicit-school-identity exam readiness CLI** checks subject/chapter coverage and refuses to count duplicate, blank, unapproved or provisional seed records, even if `is_approved` were incorrectly flipped. **9/9** pure QA/readiness tests pass, including metadata/approval and MCQ-key bias checks. In the clone, it deliberately exits 2 (not ready) for both school 1 and provisional tenant 5.
- Existing manual authoring and print workflows remain available independently, so teachers are not forced to consume unverified bank content.

**Safe technical closure sequence:** verify duplicate-tenant ownership using authoritative school records; reconcile source/edition/chapter/exercise/page identifiers against official PECTAA text; review correct MCQ keys, answers, Urdu terminology and original source permissions; import the independently approved subset into the correct tenant through versioned governance (not ad hoc SQL updates); prove class/subject assignment and chapter-level coverage; then exercise create/save/print/reopen against the newly approved bank and promote with a rollback package. Educational content approval is a substantive academic quality gate, not an administrative click to bypass.

## Final release rule

Phase 2 and the technical release-lineage verification may be marked green only for checks actually executed. **Do not mark the full Grade 9/10 automatic daily examination pipeline complete until verified and approved questions exist in the operational school tenant.** Preserve all saved papers, academic data, staging source manifests and separate agent workstreams.
