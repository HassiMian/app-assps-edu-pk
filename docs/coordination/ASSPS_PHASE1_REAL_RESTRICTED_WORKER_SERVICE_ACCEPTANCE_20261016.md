# ASSPS Phase 1 — independent restricted-worker OS service (16 October 2026)

**Scope: actual VPS execution, machine-readable read-only operator acceptance. Not a signed full Core release certificate.**

## Exact source lineage

The clean source branch `integration/core-phase1-production-worker-guard-20261016` begins at previously protected `bfd7a35eb514a67e06705ae57b028c2eb5119488` (including V3 Cards, Employees, Diary controllers, Marks, Early Years, Lesson V5, worker staging rollback and five-route postflight) and merges newer independently completed `integration/core-zero-human-validation-unified-20261016@341d8f3ee40fc941ccdd217ab37054261b9eeee6` via merge `91c1d20e0c140a80dd5362f7eadb641c0a002319`. Existing staging, monitored school marks and academic evidence remain protected. No dirty agent worktree modified.

## Actual machine-executed restricted worker service

- Source entrypoint: `ops/release/worker-probe/phase1-worker-readonly-probe.cjs`; reviewed worker adapter SHA256 `97090fee75c77283375141e21d572d52a1a9fe58952ff16a4584ca9f308592cc` (source = installed byte-for-byte).
- Real installed **one-shot, non-scheduled** systemd unit `assps-phase1-worker-readonly-probe.service`, dedicated OS `User=assps_ai_worker_login`, `Group=assps_ai_worker_login` and no login shell, PostgreSQL Unix peer socket authentication, port 5432. No stored real password; the adapter's mandatory config value is clearly marked as an UNUSED peer socket sentinel, not a credential.
- Runtime hardening: `NoNewPrivileges=yes`, `PrivateNetwork=yes`, `PrivateTmp=yes`, `ProtectSystem=strict`, `ProtectHome=yes`, kernel and control-group protections, `RestrictAddressFamilies=AF_UNIX`, blank capability sets. User service does not run as root or expose an HTTP port.
- `systemctl start` and the reproducible source guard `install-phase1-worker-readonly-probe-20261016.sh --check/--install` both executed successfully; systemd `Result=success`, `ExecMainStatus=0`, `ActiveState=inactive` **as expected for one-shot**.
- Actual journal returned `status=PASS`, `actor=assps_ai_worker_login`, member role `assps_core_ai_worker`, **5/5 sensitive table ACLs denied** (students, exam_results, organizations, campuses, admin audit), **2/2 live PostgreSQL SELECT refused** with SQLSTATE 42501 for students and exam_results, queue read verified **3/3**, `production_data_modified=false`, `backend_cutover_performed=false`, `signed_tenant_or_offsite_receipt_issued=false`.
- No production student/mark data read by probe, no SQL mutation, no migration, no password/login modification, no PM2 or Nginx restart. This ONE-SHOT worker security check is not the live signed AI queue transport used by backend.

## Verified release-source constraints and tests

- The installer requires clean Git tree; descent from protected Core commit; exact reviewed worker adapter hash; Node syntax; availability of existing dedicated worker principal and socket; source unit verifier; only installs named probe program/adapter/unit and runs its one-shot. It never turns on signed RLS flags for existing `apex-backend` or invents external signer receipts.
- CI added paths and regression tests `ops/tests/test_phase1_worker_readonly_service_20261016.py`: **4/4 PASS**; previous immutable live SHA/source staging negative suite **4/4 PASS**, rollback postflight **5/5 PASS**, synthetic restricted-signed tenant + lesson source publication HTTP **25/25 PASS**.
- Separate existing independently accepted real Muhammad Imran login / initial password-change owner witness is recorded in coordination issue #4 and not re-requested.

## Unmet release criteria (no mislabeling)

Do not call this `signed runtime transport` or `global_worker_separated_and_authenticated` from the official release verifier, which checks the **actually deployed reviewed adapter in the running backend, configured separate worker, independent Ed25519 signatures and signed peer-school + unauthorized-subject denial**. The probe is genuine **production-database actor and SQL privilege** evidence, but not a live backend queue service, second-tenant identity or off-host restore signature. Original running `apex-backend` source still lacks the worker adapter and Lesson publication guard.

Official Core release remains **HOLD** until genuine signed recovery/worker/peer-school evidence, protected backend rollout, authenticated real boundary tests and additional safe deployment gates pass. Do not promote a new frontend on the strength of this source-only / one-shot proof alone.
