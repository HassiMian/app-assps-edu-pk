# ASSPS Core × Paper Studio — Verified Cross-Agent Source Boundary

**Date:** 12 October 2026 · **Authority:** SaaS Core for production/source integration, Paper Studio for Paper-owned development · **Coordination:** GitHub Issue #4.

## Reconciled source references

- Canonical Core release remains remote `release/firstterm-core-security-unified-20261011` at `00da1e296c3116086a1d1e98c272eb0534e4ee8e`.
- Active isolated Core hardening/testing source `fix/core-rls-clone-candidate-and-ops-20261012` was `e3030c1c519ec79ccc0f688bccc6a676a646b8f9` when Paper integration verification started.
- Independently owned Paper integration branch `test/paper-core-rls77-forwardport-20261012` remotely HEAD `921acf05e523665e132fe2f0cc4a398724789903`. Its source includes a **content-equivalent** cherry-pick `4b9687d9` of Core-only commit `e3030c1c`, but not the identical SHA in ancestry. This is not a divergent code conflict.
- Cross-stream comparison `git diff --name-only e3030c1c 921acf05` yielded **36 paths, all within Paper-owned UI, Paper Studio QA or Paper Studio coordination docs**. Core backend auth/RLS/routes, SaaS Core deployment and infrastructure code remain unchanged within that integration candidate.
- The source boundary explicitly rejects any drift in Core-owned files, an unclean Core worktree, unverified remote HEAD, lost canonical Core ancestry, or unexpected mixed-owner paths. Read-only verifier `verify-paper-core-forwardport-boundary-20261012.py` and eight pure negative/positive tests added.

## Three mission gates and remaining approval truth

1. **Security / source authority:** Full signed runtime RLS clone read/CRUD policy testing still passes after `e3030c1c`: dual-runtime signed `USING`/`WITH CHECK` **77/77**, SQL CRUD privileges **75/75** Core protected tables excluding two Paper relations. This remains *isolated clone catalog-only*, not genuine signed teacher/principal HTTP proof.
2. **Academics / teacher marks:** Paper Studio independently reports a newer fully run 16/16 source-level QA candidate. SaaS Core did not redo or alter Paper Studio's protected code. Existing scoped First Term Marks green5091 remains operational; genuine school authorized Exam9 Marks Save→Reload and scored Result Cards remain pending.
3. **Reliability / release:** Current VPS and production backend are not overwritten. Root ~90–91% disk used; provider expansion and genuine credentialed route acceptance outstanding; live production `apexos_user` still `BYPASSRLS`, app runtime signed guards absent. Current frontend/backend remain independently pinned to prior artifact SHAs. Production full-backend decision **HOLD**, no deployment.

## Operational safety

This is a **source integration contract**, not a backdoor merge or production certification. Neither Paper Studio nor Grade IX–X nor APEX Connect dirty/active worktrees were edited. The remote Paper branch must be independently reviewed under its owner before inclusion in a joint release candidate. The verifier must not be modified to tolerate Core-owned path drift or dirty source to manufacture success.

**No production RLS/DB writes, migrations, scheduled tasks, service restarts, firewall edits, PM2 deployment or institutional marks changes.**
