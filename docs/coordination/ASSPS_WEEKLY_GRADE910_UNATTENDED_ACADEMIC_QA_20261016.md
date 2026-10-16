# ASSPS Grade IX–X Weekly Zero-Human Routine Academic QA

**Implementation:** 16 October 2026. Principal's standing authorization is for automatic technical verification; no additional teacher/printer requests. This document is a deployment/QA attestation, **not** an independently signed academic publication certificate.

## 1. Weekly unattended full QA
- The VPS systemd `assps-grade910-weekly-qa.timer` runs the existing authoritative 30-batch / 1,112-test academic evidence suite on **Sunday 02:30 Asia/Karachi**, small random delay.
- Dedicated service uses `ProtectSystem=strict`, `ProtectHome=read-only`, `NoNewPrivileges=yes`, `PrivateTmp=yes`, `ReadWritePaths=/var/lib/assps-grade910-weekly-qa`, `MemoryMax=3G` and `CPUQuota=90%`.
- The runner first requires a clean, recognized Git source descending from Core protection baseline `4cc2c4d4fcb1e8cbb4aa9bd344fd5769cb7bedc8`, the exact expected academic test inventory and known offline backend test dependencies. Any drift => **HOLD**, no user action required.
- It copies 67MB-ish source to a root-only **disposable source workspace** under `/var/lib/assps-grade910-weekly-qa`; tests may generate their own review fixture files there but **never write to the authoritative source repository, production DB, paper library, Nginx or printers**.
- Test dependencies are reused read-only; no `npm install`, uncontrolled download, score edit, login impersonation, fake school approval or server cutover.
- 30/30 batches + TAP count/pass/footer verified from the actual JSON evidence. Result is `QA_PASSED_NO_AUTOMATIC_ACADEMIC_PUBLICATION` or `QA_FAILED_HOLD_PUBLICATION`, with permissions `0600` for receipts.
- On failure, preserve last QA evidence and notify via condition watch, without automatic unsafe production deployment. Cleanup is strictly limited to older `run-*` folders under the dedicated private QA state directory, retaining the two newest snapshots.

## 2. Protect existing school work
- Hourly `assps-technical-self-verification.timer` separately verifies tenant data preservation, 10 Result Card designs, 11 Diary controllers, marks login and null/zero distinction, 5 anonymous API security denials and academic question integrity.
- School-level institutional approval and prior **RICOH MP C307 physical A4 hardware acceptance** remain acknowledged, not recurring signoff blockers. Samsung backup unaffected.
- Grade IX/X live academic research remains `is_approved=false` for 1,530+881 School 1 candidate records; 2,411 missing exact original-textbook page references. Independent revision-bound faculty academic publication approval cannot be counterfeited from machine tests.

## 3. Fully versioned operations
- Private `/usr/local/libexec/assps-grade910-weekly-qa/...` installs only the QA script and service/timer, not frontend/backend binary assets.
- `ops/release/install-assps-grade910-weekly-qa-20261016.sh --check|--apply` and reversible `rollback-assps-grade910-weekly-qa-20261016.sh --check|--apply` preserve genuine technical acceptance.
- Source CI and Core governed release scripts fail closed if the QA self-test contract disappears.
- Discrete sandbox `--smoke` test (original Grade IX/X draft-selector HTTP test) **PASS** before activation.
- First full service run is independently inspected in `/var/lib/assps-grade910-weekly-qa/latest.json` after completion. Do not claim its result before that receipt exists.

## 4. Source coordination
The authoritative Core integration branch descends from the previously tested Paper Studio V3/Urdu/Diary/Employees fixes. Do not deploy any stale Academic source over current SaaS Core. GitHub issues #1 and #4 capture QA data contracts and release ownership.
