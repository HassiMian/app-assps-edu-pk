# ASSPS SAAS CORE & PRODUCTION — MASTER CHAT HANDOFF

Mission: Own canonical school SaaS and release engineering: students, admissions, attendance, academics, staff roles/permissions, fees, ledger, tenant database and RLS, infrastructure, migrations, authenticated teacher workflows and release/rollback coordination.

Read `CHAT_CONSOLIDATION_AND_AGENT_GOVERNANCE_20261008.md`, `Resume SaaS Audit`, `Resume ASSPS Checkpoint` and relevant platform-only Sprint notes. Do not overwrite separate Paper Studio / Grade IX–X / Connect R&D branches. Core makes final deploy decisions and never treats chat-claimed tests as live validation.

At 2026-10-08 13:08 UTC observed: remote canonical release anchor `68a158e`; deployed frontend `9fe7b56`; deployed backend `16ab8f3`. Release metadata is component-specific and may advance. Production directories `/var/www/apex-os` and `/var/www/apex-backend` are runtime artifacts rather than canonical git worktrees; reconcile current source before deploy.

Before release: clean repo, ancestry/remote reconciliation, no unexpected diff, versioned migrations, protected paper template checks, RLS with non-BYPASS runtime role, tenant isolation, teacher/student/fees data tests, frontend build and browser, ops production safety, scoped authenticated smoke, database and artifact rollback proof. No live destructive fixes or synthetic writes without explicit guarded opt-in.

Keep platform incidents, fee/attendance fixes, performance and monitoring separate from Paper Studio feature decisions; integrate product release candidates only after their gates pass. Preserve backups and unmerged work.

Output every cycle: current production frontend/backend SHA independently, health, pending integration candidates with owner, release gate matrix, recovery path, smoke and rollback verification.
