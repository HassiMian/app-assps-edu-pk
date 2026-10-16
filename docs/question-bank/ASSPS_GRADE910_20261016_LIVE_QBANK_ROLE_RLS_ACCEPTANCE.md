# ASSPS Grade IX–X — Actual restricted-role Question Bank tenant isolation

**Verified 16 October 2026 (PKT).** The Academic Master performed an additive read-only database security check, without changing any role, RLS policy, tenant, question, result, paper or deployment. It is **not** an authenticated teacher/principal session, independent staff credentials test, or SaaS Core production security certification.

## Actual PostgreSQL evidence

The real `apexos` database's `public.question_bank` has RLS and FORCE RLS enabled; role `apex_app_runtime` has neither `SUPERUSER` nor `BYPASSRLS`. Each test ran under a SQL **READ ONLY transaction** with `SET LOCAL ROLE apex_app_runtime`; tenant context was session-local and rolled back without persisting:

| Restricted session | Rows visible | School 1 rows visible | School 5 rows visible |
|---|---:|---:|---:|
| No tenant context | 0 | 0 | 0 |
| School 1 context | 2,470 | 2,470 | **0** |
| School 5 context | 2,720 | **0** | 2,720 |

School 1's 2,470 total bank records include historical/other-grade rows. The earlier verified Grade IX–X subset is 2,411 provisional questions, not all 2,470. This role-level row-isolation result is meaningful, but cannot replace Core's genuine authenticated real-school staff workflows or independent peer-school denial and signed transport/rollback certification.

## Reproducible protected gate

`ops/qbank/audit-grade910-runtime-question-bank-rls-20261016.py` reads only aggregate counts and RLS-role metadata, denies any cross-tenant row exposure, insufficient tenant context denial, FORCE RLS deactivation or bypass-enabled application role. All output is 0600 root-private non-identifying counts at `/var/lib/assps-grade910-sourceclaims/tenant-rls-qbank-readonly.json`. The check has **8 negative and positive isolated tests** and is included in the existing Sunday 03:35 academic source-audit systemd workflow and CI. The single six-phase receipt exposes `questionBankCrossSchoolRlsDenied=true` while correctly stating `CoreProductionSecurityCertificationGranted=false`.

**Security and publication boundary:** No system login, signature, password, paper workspace, database mutation or real staff identity was simulated or forged. Questions remain unapproved until authentic session-specific adopted book evidence and per-revision independent qualified faculty review; no provisional bank promotion to Paper Studio.
