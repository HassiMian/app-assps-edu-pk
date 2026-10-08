# ASSPS Grade 9–10 independent academic review and Results RLS closure

Checkpoint: 8 October 2026 UTC.

## Source lineage

Production baseline for both frontend and backend:
25536200ff1d891fedf1adb0c7155e943d3372e1,
release/paper-results-v1-prod-final-20261008.
Changes are backend-only; no frontend sources or assets are modified.

Grade 9–10 question publication requires source SHA, a pinned content
revision/hash, attested academic evidence, distinct author/reviewer/releaser
identities, school/role boundaries and complete question/answer/marks parity.
No provisional question is autoapproved.

## Executed certification

- Combined Question Bank governance and HTTP regressions 18/18 PASS.
- Authenticated HTTP rejects self-review, source/hash mismatch, stale
  revisions and cross-tenant review; independent reviewers do not publish.
- Results and print authorization/revision/job tests 6/6 PASS on fresh
  disposable clone. An earlier repeat failed due to reused static fixture ID.
- G21 canonical DOCX HTTP 9/9 PASS with correctly resolved source fixtures.
- Existing production backend runtime source baseline 365/365 byte identical.
- Isolated production-mode staging on alternate port 5058: /health 200,
  unauthenticated review-context 401, backend release smoke PASS.
- App runtime Results RLS extension applied twice successfully on disposable
  clone. The original full runtime probe found 77 tenant tables protected,
  findings empty and safe=true.
- Specific Results check: NOLOGIN/NOBYPASSRLS runtime, forced RLS,
  permissive access plus restrictive school guard on both Results tables;
  empty school context sees no rows, school 1 only school 1, school 2 none.
- A cross-tenant Results UPDATE attempted in a rollback-only clone
  transaction returned PostgreSQL 42501, as required.
- Existing Results data remained present after the targeted migration.

## Guarded release/rollback requirements

1. Before any production mutation, re-check the live backend/frontend
   commits and exact Git remote, refuse reverse ancestry or concurrent drift.
2. Verify private frontend, backend and PostgreSQL rollback snapshots.
3. Roll out only changed backend files, metadata and additive RLS migration.
   Never overwrite parallel agents' sources or any school data.
4. Keep production NODE_ENV=production, PORT=5000,
   AUTO_MIGRATE_ON_BOOT=false, effective runtime role apex_app_runtime.
5. After rollout test local/external health, protected routes, RLS, release
   smoke, current source inventory and school-data integrity; rollback
   backend and policy changes if gates fail. Never restore an old full
   student database on top of fresh transactions without explicit recovery.
6. Editorial approval of actual provisional textbook questions remains
   a separate human academic quality gate; this certification only secures
   the mechanism for reviewed original/derived items.

No scheduling, tenant transfer, seed autoapproval or unrelated SaaS change.
