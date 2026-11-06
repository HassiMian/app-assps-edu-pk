# A214 — Academic authority & final release gate (review-only)

This review branch forks A213 commit a5d605b3. **No production frontend deployment, app-role/ACL migration, marks write, assessment publication, original browser mutation, or server cleanup is authorized by this artifact.**

## Why this gate exists

Class configuration (settings.academic_setup.subjects) is a legacy map, **not** a signed exam_subjects approval. Four Assessment headers do not substitute for enrolled subjects or results, and old browser paper counts cannot be inferred from saved_papers and paper_documents tables. Client-side original-paper recovery is a provenance workflow, not automatic migration. The attendance A213 candidate is review-only until all four published shells are actually replaced, role-specific principal/teacher acceptance completes and rollback is proven.

## Execution

From the review worktree, as a root operator with **read-only** production access:

    python3 ops/release/assps_academic_release_gate.py --out /root/workspace/assps-mission-20261106-a214-private/A214_LIVE_ACADEMIC_READONLY.json

Exit codes: 3 = justified release HOLD, 2 = missing/invalid evidence or database failure, 0 = all independently sourced gates verified (still requires independent human signoff; never auto deploy). Do not change this program to hardcode approvals to true merely to get zero.

Run 29 adversarial unit checks:

    python3 -m unittest discover -s ops/release/tests -p 'test_assps_academic_release_gate.py' -v

The check runs **BEGIN READ ONLY/ROLLBACK** queries as PostgreSQL inspection user; it is **not** an RLS tenant-bypass penetration test. Coverage is anchored to real live school_id=1 only, preserves Pre Nine and Nine section identities, requires original exam result SHA from 1,854 rows, tests attendance published assets, and fails closed on missing original paper proof, offhost restore, human signatures, repository provenance and generic application-login DDL ownership.

## Owner acceptance / remaining gates

Academic leadership must approve actual class/section teacher+subject source after identity/timetable review (no auto assignment). Distinct pre-nine/nine identities must pass live role-based attendance for actual teachers. Original workstation owner must verify and export the 49 papers with immutable encrypted provenance, then a true reopen/same-school acceptance. A human-authorized teacher must confirm Assessment offerings/marks, Assessment 5 source and Paper Studio revisions. Ops must verify off-host data+roles+ACL restoration, canonical GitHub branch ownership and release manifest, >=16 GiB root headroom, and a signed, rollback-ready deployment.

Any material school roster change invalidates a cached report; rerun this gate. A passing code suite never converts a production HOLD to PASS.
