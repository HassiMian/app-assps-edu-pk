#!/usr/bin/env python3
"""Fail-closed release review of existing clone-only SQL and rollback contracts.
Never executes SQL or modifies production. An audit is not deployment approval.
"""
from pathlib import Path
import re,sys
ROOT=Path(__file__).resolve().parents[2]
clone=(ROOT/'al-siddique-backend/ops/rls/phase7-clone-signed-tenant.sql').read_text()
rollback=(ROOT/'al-siddique-backend/src/migrations/20261008_app_runtime_rls_v1_down.sql').read_text()
checks={
 'clone_has_explicit_nonproduction_guard': "current_database() <> 'assps_core_signed_p7_20261008'" in clone and '55432' in clone,
 'clone_has_hmac_validation': 'valid_signed_context()' in clone and 'hmac(' in clone,
 'clone_guard_is_hardcoded_legacy_role': bool(re.search(r'FOR ALL TO apex_app_runtime',clone)),
 'rollback_drops_shared_runtime_role': bool(re.search(r'DROP ROLE apex_app_runtime',rollback)),
 'rollback_drop_owned_shared_runtime': 'DROP OWNED BY apex_app_runtime' in rollback,
 'production_specific_migration_missing': not (ROOT/'ops/release/production-signed-bluegreen-up-20261011.sql').exists(),
 'production_specific_rollback_missing': not (ROOT/'ops/release/production-signed-bluegreen-down-20261011.sql').exists(),
}
for k,v in checks.items():print(k.upper()+'='+('YES' if v else 'NO'))
if not all(checks.values()):
 print('BASELINE_CHANGED_MANUAL_REVIEW_REQUIRED')
 sys.exit(2)
print('PRODUCTION_SQL_AUTOPROMOTION=REFUSED CLONE_ONLY_DDL_AND_SHARED_ROLE_DESTRUCTIVE_ROLLBACK')
print('PRODUCTION_RELEASE_CERTIFIED=FALSE')
