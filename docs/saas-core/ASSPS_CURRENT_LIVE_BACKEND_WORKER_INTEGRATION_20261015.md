# SaaS Core P0 — live-backend-preserving restricted worker integration candidate

Date: 2026-10-15 UTC. Owner: SaaS Core. GitHub issue #4. **NO public deployment / NO teacher credential or school data write / release HOLD.**

## Provenance and runtime

- Exact clean Core base before this change: `dad9778e8cd5ea8564e5b9de640204e2f9eb9100`, isolated child branch `fix/core-worker-current-live-integration-20261015`.
- Current real public SaaS Paper Studio Vite source (separate component) `2e14c2ded97d303edc08c83dd79f0396b8f8f3d4` released concurrently by Paper Studio; preserve Weekly Notebook Studio and protected question/results work.
- Running backend `/var/www/apex-backend` is untracked deployment filesystem, with historical `release-meta.json` commit `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9` dated Oct 8 **which is NOT the verified current file-level source commit**. Live backend route `src/routes/lessonPlanRoutes.js` is newer, SHA256 `435cf755904dcd7fdf74189d5a99d267b8ace98a6627c9180a2375e9dfaaf74f`. Cannot certify exact running backend commit ancestry without new provenance.
- Public APEX Connect Next remains BUILD_ID `ONDwxEIZlx5onDIKY7wYf` in recent issue #4 checks; anonymous dashboard still redirects to `/login?next=/admin`, so it is NOT the reviewed role-neutral `aMD_UNZVOSO2lpyRO0-RO` candidate.
- Separate worker LOGIN `assps_ai_worker_login` / scoped inherited `assps_core_ai_worker`, validated with production SCRAM and read-only scoped query. No original staff credentials inspected.

## Source-only fix and current-live reconciliation

- In `al-siddique-backend/src/services/ai/aiQueueWorkerDatabase.js`, lazily load the Blue legacy database module only when Blue queue is actually invoked. In signed Green, eager importing `src/config/database.js` unnecessarily instantiated broad DB dependencies and triggered the strict signed JWT/HMAC guard even in a standalone least-privilege worker read-only smoke; the fix **does not disable or bypass the guard**.
- Retain previous reviewed `paperAiQueue.js` and `opsRoutes.js` worker-only callsite changes. Staging now always starts from **actual current live** `/var/www/apex-backend`, rather than the older pre-Weekly-Notebook candidate.
- Root-only `stage-current-live-backend-ai-worker-20261015.sh` refuses destination overwrite, excludes .env and key material, checks syntax, compares original live `lessonPlanRoutes.js`, `server.js` and `release-meta.json`, and rejects observed mid-staging live changes.
- Verified latest source candidate: `/root/assps-release-candidates/apex-backend-worker-live-reconciled-verified-20261015`. Worker adapter SHA256 `2f5e4c0e5e827a1bedb6291c59598057b89f88d8c66109fe9611eeab90ed4d06`; `paperAiQueue.js` `8e24b52c8c8f23f84d2518aacb21c586d715da9c5170fa775a00e80783bf7c30`; `opsRoutes.js` `a4ade0bd9d9917afc1a6fa056844a0c5762948a0d6808d781867bbd27b1aba0b`. Current Paper Studio `lessonPlanRoutes.js` preserved byte-for-byte.
- Verified root-only independent pre-worker **backend source snapshot** at `/root/assps-release-backups/current-live-backend-pre-worker-20261015/current-live-backend-source.tar.zst`; archive SHA256 checked; extracted exact Weekly Notebook route matches live. This is a source recovery layer only, NOT an independently signed, off-VPS or completed live traffic rollback.

## Actual tests (not certification by assertion)

- First real signed worker smoke exposed eager DB import's strict-guard failure. With the lazy import fix, separately authenticated real worker login **PASS**; permitted queue SELECT **PASS**; prohibited organizations SELECT returned PostgreSQL `42501` **PASS**; no legacy DB module loaded in signed mode **PASS**. No queue/student/marks rows written.
- New Node mocked Blue/Green import tests **2/2 PASS** without network, supporting Blue backward compatibility and Green fail-closed config.
- New stage-guard tests prevent unsafe source overwrite and excluded credentials. Whole `ops/release/signed-bluegreen` Python test suite passes at current candidate; live restricted worker gate explicitly returns `technical_worker_candidate_status=PASS` but `public_worker_integration_status=HOLD` because actual running backend is still the old modules.
- Current public anonymous APEX dashboard checked HTTP307 `/login?next=%2Fadmin`. Public authentication, genuine staff, browser acceptance, independent peer-tenant/subject denial and runtime Next/Nginx role-neutral release **not certified**.
- Previous live issue #4 data protection checkpoint: Exam9 1,762 genuine scores including 213 real zeros; this source-only work made NO SQL writes and does not claim a new data fingerprint.

## STOP / security release gates

Do not promote this staging branch or older Next build to production. Mandatory before a single controlled Core release:
1. Reconcile exact running backend/Next/Nginx versions with newer Paper Studio and independent APEX Connect source; generate current candidate and complete re-review of dependency, tenant/RLS, school1 and peer-school HTTP.
2. Real **Muhammad Imran** temporary-password challenge → teacher self-change → relogin → assigned subject positive and unassigned negative; independent *existing* peer-school authenticated tenant negative; never mint fake evidence or retrieve teacher plaintext passwords from DB.
3. Truly independent recipient-held encrypted-current-backup restore/reviewer signature (CYBERSPACE is standby) plus correct signed owner receipts, exact current Blue Next/Nginx and live backend rollback envelope. Current Next archive and post-worker full-ACL backup are previously hashed, but updated offsite independent confirmation is missing.
4. Only then integrate the worker with supervised signed Green, execute Core-owned atomic role-neutral Next+Nginx controlled release, public HTTP and authenticated postflight and rollback exercise. If any gate is missing, **HOLD**. Do not auto-release academic marks or alter schools/students/papers.
