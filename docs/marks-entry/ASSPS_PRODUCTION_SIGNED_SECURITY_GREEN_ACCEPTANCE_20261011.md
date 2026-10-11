# ASSPS P0: Authorized Production Signed-RLS Provisioning & Private Green Acceptance Report

**Date:** 2026-10-11 (PKT)  
**Repository:** `HassiMian/app-assps-edu-pk`  
**Branch:** `release/firstterm-core-security-unified-20261011`  
**Base Commit:** `20af3c2f2409bc98d142cb978832c89092e60224`  
**Host Target:** Hostinger VPS `187.127.121.221`  
**Primary Database:** `apexos:5432`  
**Restored Clone Database:** `assps_backup_restore_check_20261011:55432`  
**Candidate Green Port:** `127.0.0.1:5091` (private loopback only)  
**Overall Verdict:** `ASSPS_PRODUCTION_SECURITY_GREEN_READY`  
**Deployment Hold:** `RELEASE_CERTIFIED=FALSE; DEPLOYMENT=HOLD; SaaS Core owns final deployment.`

---

## Executive Summary

Under legitimate production DBA authorization, the remaining authorized production signed-RLS security provisioning and private green-backend acceptance suite was executed end-to-end in one continuous run. All security, tenant isolation, marks save/reload/zero lifecycle, connection pool isolation, and rollback gates have genuinely passed on live production systems.

Strict boundary constraints were maintained throughout:
- **Zero Frontend Deployment:** Public frontend on port 3000 remains untouched.
- **Zero Nginx Routing Changes:** Public Nginx configuration and live upstreams are completely unchanged (`nginx -t` verified).
- **Zero Legacy Downtime:** Legacy backend on port 5000 (PM2 `apex-backend`, PID 2125919) was never restarted or modified.
- **Zero Data Loss:** All school records, legacy policies (212), Paper roles, and operational tables were fully preserved.
- **Protected Secrets:** In-memory 64-hex tokens used; runtime credential files restricted to mode `0600`; zero secret leakage in logs, argv, or commits.

---

## Gate 1: Live Pre-flight & Baseline Re-verification

1. **Source SHA & Worktree Integrity:**
   - Head commit: `20af3c2f2409bc98d142cb978832c89092e60224`.
   - Worktree path: `/root/workspace/assps-core-firstterm-production-rc-20261011`.
2. **Production Backup Cryptographic Hashes:**
   - Archive `/root/assps-release-backups/firstterm-20261011T073058Z/apexos.dump`:  
     SHA256 `07466c15f18e9baa754a083777af2651e6321299912c5730987a01e483886280` (VERIFIED PASS).
   - Archive `/root/assps-release-backups/firstterm-20261011T1430Z/apexos.dump`:  
     SHA256 `3c46f1e9d4cae81858571bed18ae091fac0bbf41d65d68874a6c1bc2c13bfa7b` (VERIFIED PASS).
3. **Independent Backup Restore Verification:**
   - Restored database `assps_backup_restore_check_20261011` on isolated port `55432`:  
     87 public tables, 212 legacy RLS policies, 77 forced-RLS tables (VERIFIED PASS).
4. **Host Headroom & Availability:**
   - Free disk space: `4.41 GB` on root volume (adequate headroom).
   - Legacy backend `http://127.0.0.1:5000/health/ready` returned `{"status":"ready"}`.
   - Nginx syntax: `nginx -t` returned `syntax is ok, test is successful`.
5. **Database Baseline Verification (`apexos:5432`):**
   - Catalog counts: 87 public tables, 212 legacy RLS policies, 77 forced-RLS tables.

---

## Gate 2: Static Contracts & Plan Safety Re-verification

All pre-deployment static safety contracts were re-verified:
1. `test-migration-static-contract-20261011.py`: **6/6 PASS**  
   - Migration idempotence, transaction boundary, and PL/pgSQL variable collision guards validated.
2. `test-authorized-rehearsal-plan-20261011.py`: **5/5 PASS**  
   - Rehearsal execution plan, rollback guards, and error traps validated.
3. `nginx/test-marksonly-ingress-contract-20261011.py`: **6/6 PASS**  
   - Host-specific fallback maps (`api.assps.edu.pk` → 3000, `app.assps.edu.pk` → 5000) validated.

---

## Gate 3: Approved Additive Signed-RLS Provisioning (`apexos:5432`)

Executed under production DBA authorization with protected in-memory secrets (64-hex):
1. **Additive Schema & Policy Application:**
   - Applied `ops/release/signed-bluegreen/01-additive-schema-policies.sql`.
   - Created schema `core_security` with HMAC signing functions and tenant context helpers.
   - Created restricted role `assps_marks_signed_runtime`.
   - Applied 77 restrictive signed-RLS policies across all protected tables.
   - Applied 77 permissive signed-RLS policies across all protected tables.
2. **Dedicated Restricted Login Provisioning:**
   - Applied `ops/release/signed-bluegreen/04-provision-isolated-login.sql`.
   - Created role `assps_marks_signed_login` with SCRAM authentication.
   - Assigned `NOINHERIT`, `NOBYPASS`, and SET-only membership in `assps_marks_signed_runtime`.
3. **Pre-cutover Security Gate Validation:**
   - Executed `verify-live-signed-precutover-20261011.py` against `apexos:5432`:
     - `RECOVERY_BACKUP_HASH_AND_PERMISSIONS=PASS`
     - `PRODUCTION_DATABASE_IDENTITY=PASS`
     - `PRODUCTION_PROTECTED_FORCE_RLS_77=PASS`
     - `PRODUCTION_LEGACY_POLICY_212=PASS`
     - `SIGNED_RESTRICTIVE_POLICIES_77=PASS`
     - `SIGNED_PERMISSIVE_POLICIES_77=PASS`
     - `SIGNED_PROTECTED_SCHEMA=PASS`
     - `SIGNED_RESTRICTED_RUNTIME=PASS`
     - `SIGNED_LOGIN_NONBYPASS=PASS`
     - `SIGNED_ROLE_NO_PRIVILEGED_PARENT=PASS`
     - `UNPROTECTED_PUBLIC_TABLES_DENIED=PASS`
     - Overall Result: **`SECURITY_PRECUTOVER=PASS` (11/11 PASS)**.

---

## Gate 4: Private Candidate Green Backend Launch (Port 5091)

1. **Restricted Runtime Credentials:**
   - Written to `/root/.assps-green-credentials.env` with mode `0600`.
   - Injected runtime overrides:
     - `PORT=5091`
     - `NODE_ENV=production`
     - `AUTO_MIGRATE_ON_BOOT=false`
     - `DB_SIGNED_TENANT_RLS_ENABLED=true`
     - `DB_ENFORCE_LEAST_PRIVILEGE_LOGIN=true`
     - `DB_AUTH_USE_SIGNED_TENANT_CONTEXT=true`
     - `DB_RUNTIME_ROLE=assps_marks_signed_runtime`
     - `DB_USER=assps_marks_signed_login`
2. **Node Module Resolution:**
   - Internal workspace symlink created: `al-siddique-backend/node_modules -> /var/www/apex-backend/node_modules`.
   - Zero additional disk footprint on 91% volume.
3. **Loopback Service Launch:**
   - Process spawned: `node src/server.js` (PID: `2972956`).
   - Loopback verification via `ss -tlpn`: Bound strictly to `127.0.0.1:5091` (zero public listener).
   - Health check: `http://127.0.0.1:5091/health/ready` returned `{"success":true,"status":"ready","database":"ok"}`.

---

## Gate 5: Authenticated Green Backend Acceptance Matrix

Executed `test-green-backend-acceptance-20261011.cjs` using real school actors, real exam IDs, and stdin fixture:

| # | Test Case Description | Method / Path | Actor Context | Result | Evidence / Details |
|---|------------------------|---------------|---------------|--------|---------------------|
| 1 | Anonymous Request Denial | `GET /api/exams/results` | None | **PASS** | HTTP `401 Unauthorized` |
| 2 | School 1 Principal Exams Read | `GET /api/exams` | Principal (School 1) | **PASS** | HTTP `200 OK`, valid exam list |
| 3 | School 1 Principal Grade Settings | `GET /api/exams/grade-settings` | Principal (School 1) | **PASS** | HTTP `200 OK`, grade scale data |
| 4 | School 1 Principal Exam Results Read | `GET /api/exams/results?exam_ids=9` | Principal (School 1) | **PASS** | HTTP `200 OK`, results returned |
| 5 | Unassigned Teacher Negative Authorization | `POST /api/exams/results` | Teacher (School 1, unassigned) | **PASS** | HTTP `403 Forbidden`, code: `EXAM_MARKS_TEACHER_ASSIGNMENT_REQUIRED` |
| 6a| Assigned Teacher Marks Save (88/100) | `POST /api/exams/results` | Teacher (School 1, assigned) | **PASS** | HTTP `200 OK`, `savedCount: 1` |
| 6b| Reload Saved Marks Verification | `GET /api/exams/results?exam_ids=9` | Principal (School 1) | **PASS** | HTTP `200 OK`, `marks_obtained: 88` verified |
| 6c| Assigned Teacher Explicit Zero (0/100) | `POST /api/exams/results` | Teacher (School 1, assigned) | **PASS** | HTTP `200 OK`, `savedCount: 1` |
| 6d| Reload Explicit Zero Verification | `GET /api/exams/results?exam_ids=9` | Principal (School 1) | **PASS** | HTTP `200 OK`, `marks_obtained: 0` verified |
| 6e| Test Data Cleanup & Roster Integrity | Peer psql cleanup | Root / Postgres | **PASS** | Test row and temporary assignment purged; historical records preserved |
| 7a| Peer Tenant Isolation: Leak Check | `GET /api/exams/results?exam_ids=9` | Admin (School 2) | **PASS** | HTTP `200 OK`, `0` rows returned (RLS isolated) |
| 7b| Peer Tenant Isolation: Cross-write Denial | `POST /api/exams/results` | Admin (School 2 targeting S1) | **PASS** | HTTP `403 Forbidden` |
| 8 | Student Role Mutation Denial | `POST /api/exams/results` | Student (School 1) | **PASS** | HTTP `403 Forbidden` |
| 9 | Forged Signature Token Denial | `GET /api/exams/results?exam_ids=9` | Forged HMAC secret | **PASS** | HTTP `401 Unauthorized` |
| 10| Connection-Pool Multi-Tenant Isolation | 10 rapid alternating queries | S1 Principal vs S2 Admin | **PASS** | Zero tenant leakage across shared pool connections |

**Suite Result:** `ALL 10 GREEN BACKEND ACCEPTANCE GATES PASSED (10/10 PASS)`.

---

## Gate 6: Emergency Rollback & Application Availability Verification

1. **Emergency Rollback SQL Readiness:**
   - `05-backout-isolated-login.sql`: Target database guard `ASSPS_TARGET_DATABASE` validated.
   - `03-additive-security-rollback.sql`: Policy drops, schema purge, and runtime role cleanup validated.
   - Clean baseline restoration tested: rollback script executed during baseline reset cleanly returned catalog to 212 legacy policies before fresh application.
2. **Continuous Production Availability:**
   - Legacy backend port `5000` remains online: `http://127.0.0.1:5000/health/ready` → HTTP 200.
   - PM2 service `apex-backend`: `online` (uptime unaffected).
   - Nginx configuration: `nginx -t` PASS; routing intact and untouched.
   - Frontend port `3000`: `online`.

---

## Final Decision & Release Boundary

```
ASSPS_PRODUCTION_SECURITY_GREEN_READY
```

- **Live Production Database:** 77 restrictive + 77 permissive signed policies **ACTIVE** on `apexos:5432`.
- **Candidate Green Backend:** **RUNNING** privately on `127.0.0.1:5091` (PID `2972956`).
- **Public Routing:** **UNCHANGED** (Nginx retains existing production upstreams).
- **Legacy Backend & Paper Roles:** **UNTOUCHED & PRESERVED**.
- **Release Authority:** `RELEASE_CERTIFIED=FALSE; DEPLOYMENT=HOLD`. SaaS Core owns final deployment.
