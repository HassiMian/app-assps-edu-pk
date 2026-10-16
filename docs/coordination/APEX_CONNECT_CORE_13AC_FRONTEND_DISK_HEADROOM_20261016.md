# APEX Connect — Current Core font-guard reconciliation and frontend snapshot headroom (16 October 2026)

## Ownership and immutable checkpoints

Connect-only development, read-only production verification, and SaaS Core/Paper source coordination. Based on previously published, clean `fix/connect-admin-api-500-redaction-20261016@8c5aa35f027979e1b634d6844bd21e1c993caf49`. All new Connect source work is isolated in `integration/connect-core-font-guard-capacity-20261016`. No shared branches force-pushed and no production services restarted.

Latest owner-published integrated Core/Paper branch `integration/core-paper-font-guard-20261016@13ac2be49e8d0aa6939c82f510aa4bbc65caf2a7` was verified to match GitHub remote HEAD and to descend directly from reviewed Core/Paper `05a59127`. The font-related Paper implementation and CI are owned by the Paper Studio workstream and are not recreated here.

Independent *detached* Core source worktree `/root/workspace/connect-core-13ac-independent-20261016` had a genuine fresh `npm run build`: Vite 8.0.10, 2,574 modules, **exit 0**, built in 4.36 seconds. Independently computed compiled `al-siddique-frontend/dist/index.html` SHA256 `1097d23897e1bc507a111c4c202aba47a54960e27cf62f34234f95e32e0c26e3`, byte-equal to owner-published newer candidate and source family `05a59127`. No guess that identical compiled index implies same underlying commit: gate pins the exact new SHA and expected digest separately. The previous five explicit Core SHA/digest pairs remain intact; no broad descendant auto-approval.

## New read-only storage headroom guard

Previous high VPS disk occupancy (91%) had not been quantitatively represented in the Connect four-phase gate. New `ops/connect/verify_frontend_rollback_disk_budget_20261016.py` measures the four **existing compiled frontend snapshot directories** only: current accepted Next `.next-candidate`, current accepted SaaS Core static root, verified staged Next `.next`, and newest exact Core compiled `dist`.

The bounded probe uses `shutil.disk_usage('/')`, `du -s -B1` without shell expansion, and rejects nonexistent directories, mismatched filesystem devices, invalid/boolean amounts and subprocess failures. The required budget is **three copies of combined compiled artifacts plus an additional 3 GiB reserve**. It never purports to account for full PostgreSQL physical backups, off-host recovery, source/build-dependency footprints or provider quotas. It creates **no backup** and never deletes directories or modifies the production runtime.

Actual latest Core13ac preflight measured 4 artifacts, 198,553,600 total allocated snapshot bytes, 9,126,383,616 bytes free, 3,816,886,272 bytes budgeted, and 5,309,497,344 bytes budget margin. Decision `FRONTEND_SNAPSHOT_HEADROOM_PASS_NOT_RELEASE`, with `warning_high_utilization=true` for 91% disk use. The absence of off-host signed backup remains a genuine independent blocker.

Connect four-phase runner additionally records the bounded storage report and refuses an exit-0/pending-Core verdict if Phase4 capacity is HOLD, even if Phase3 is signed 13/13; it prevents a provisional `CORE_ONLY_PENDING` Phase4 state when this check is missing, tampered, false or unavailable; it **never turns HOLD into PASS**, cannot create independent signed receipts and always retains `public_release_authorized_by_this_tool=false`. Six new hermetic disk-budget tests and new adversarial Phase4 capacity tests PASS. The CI workflow includes both new paths and an offline unit-test step; remote GitHub Actions status is not claimed.

## Fresh four-phase signed Core verification (actual exit2)

Full read-only `ops/connect/run_four_phase_release_gate_20261016.py --core /root/workspace/connect-core-13ac-independent-20261016` executed against the genuine latest Core candidate and existing reviewed private Next technical stage. Actual process exit **2**:

- Phase1 public production source/health, protected original marks invariants, and six anonymous private API denial status checks **PASS**.
- Phase2 optimized Connect build provenance + joint Core frontend tech verification exit0, **13/15 PASS**. Two expected differences concern not-yet-deployed Lesson Planner and Early Years print in accepted live release.
- Phase3 official independent signed Core security **6/13, exit2/HOLD**. Missing actual reviewed ACL backup, signed independent current off-host recovery, restricted signed live production worker transport, exact reviewed adapter deployed into running backend, separately authenticated persistent worker, verified inherited/effective role grants, and independently signed real School2 plus unassigned-subject access denial.
- Phase4 Core-owned protected production cutover **HOLD**.
- Capacity check **PASS_NOT_RELEASE** with 91% usage warning, cannot override phase3.

Final, after all capacity and exit-code hardening, mode0600 aggregate-only receipt `/root/assps-release-evidence/connect-core-font-guard-capacity-20261016/four-phase-final.json` SHA256 `dc0672cfa95b3e16cda67b307037f47db3734e119c20b401b9ffada4650a58f5` and literal `four-phase-final.rc=2`. Earlier `four-phase.json` was a preliminary read-only run only. No staff credentials, student records or exam answer keys in proof.

## Acceptance and release boundary

Full Connect Python regression **221/221 PASS**; Node reviewed-stage negative-security **8/8 PASS**; local CI YAML parse PASS. Neither build success nor capacity snapshot pass supplies SaaS Core production authority, full-source attestation for different Next builds or a signed production login.

Previously vetted Connect nine-route admin exception protection and CSV formula/status/500 fixes remain portable source patches; they have **not** been deployed. Public active Next is still `apex-connect-green|3002|.next-candidate`, Build ID `ONDwxEIZlx5onDIKY7wYf`. The canonical results 1,763 rows including 213 real numeric zeros are protected read-only, never overwritten; Core/Paper own official papers and marks integrity.

Required next Core-only release path: independent signer provides genuine current backup and off-host restore evidence, reviewed authenticated worker transport/adapter and effective grants are deployed/certified, independent live teacher and peer-school denial checked, then reviewed rollback-ready Next + Core cutover and actual authenticated/Diary Save-Reopen-Print/physical Urdu print acceptance. No source overwrite, PostgreSQL DDL/DML, PM2/Nginx reload, signed evidence fabrication, teacher account impersonation, release promotion, deletion of backups, temporary PDF acceptance substitution or physical printing occurred here.

## Exit-code strictness and evidence precision

The final release runner now checks both signed Phase 3 **and** capacity-protected Phase 4 before it can return `PROTECTED_CORE_RELEASE_PENDING` / exit0. Even a genuine signed 13/13 Phase3 cannot produce that exit0 if the capacity report is missing, tampered, insufficient or lacks its explicit NOT_RELEASE semantics. New adversarial test verifies this, with **221/221 full Connect Python tests PASS**. This exit0 would still mean pending separate Core owner authorization and action, NEVER self-deployment. The actual latest Core13ac execution returns `HOLD_NO_PRODUCTION_CUTOVER` exit2 because signed Core 6/13, even though scoped frontend snapshot capacity passes.
