#!/usr/bin/env python3
"""Read-only comprehensive signed Core guard on unified ACL+owner QA candidate.

Only PG55432. Authenticated LOGIN and production release are separate gates.
"""
import importlib.util
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parent
module_file=ROOT/'verify-safe-core-recovery-candidate-20261012.py'
spec=importlib.util.spec_from_file_location('signed_candidate_core_check',module_file)
signed=importlib.util.module_from_spec(spec)
spec.loader.exec_module(signed)
TARGET='assps_core_unified_security_recovery_20261013'
acl_spec=importlib.util.spec_from_file_location('acl_recovery_source',
    ROOT/'verify-private-global-owner-acl-replay-20261013.py')
acl=importlib.util.module_from_spec(acl_spec)
acl_spec.loader.exec_module(acl)

def main():
    signed.DB=TARGET
    try:
        facts=signed.inspect()
        result=signed.evaluate(facts)
        # In the unified database Core signature policy grants intentionally
        # extend core_security schema usage. All OTHER ACL families and every
        # object owner must remain identical to the faithfully replayed source.
        source_owners=acl.snapshot(acl.SOURCE)
        combined_owners=acl.snapshot(('55432',TARGET))
        object_acl_equal=all(source_owners['acl_digests'][family]==
                combined_owners['acl_digests'][family]
                for family in ('relation_acl','function_acl','default_acl'))
        exact_owners=source_owners['ownership_counts']==combined_owners['ownership_counts']
        safe_owner=(combined_owners['database_owner']=='apexos_user' and
             combined_owners['global_owner_roles']==[
                'apex_paper_owner|0|0|0','apexos_user|0|0|0'])
        public_schema_guard=signed.query("SELECT has_schema_privilege('public','core_security','USAGE')::int")==['0']
        facts.update(recovered_relation_function_default_acls_equal=object_acl_equal,
                     recovered_owner_counts_equal=exact_owners,
                     safe_nologin_global_owners=safe_owner,
                     core_security_public_usage_denied=public_schema_guard)
        if result['status']=='PASS_ISOLATED_HARDENED_CANDIDATE_ONLY' and all((
              object_acl_equal,exact_owners,safe_owner,public_schema_guard)):
            result['status']='PASS_UNIFIED_QA_SIGNED_CORE_AND_OWNER_ACL_ONLY'
        else:
            result['status']='HOLD'
            result.setdefault('issues',[]).append('unified_owner_acl_or_signed_security_mismatch')
    except (OSError,ValueError,RuntimeError,KeyError,IndexError) as ex:
        facts={}
        result={'status':'HOLD','issues':['signed_catalog_error:'+type(ex).__name__]}
    print(json.dumps({'target':TARGET,'facts':facts,**result,
         'authenticated_login_accepted':False,
         'live_production_release_certified':False},sort_keys=True))
    return 0 if result['status']=='PASS_UNIFIED_QA_SIGNED_CORE_AND_OWNER_ACL_ONLY' else 2
if __name__=='__main__':sys.exit(main())
