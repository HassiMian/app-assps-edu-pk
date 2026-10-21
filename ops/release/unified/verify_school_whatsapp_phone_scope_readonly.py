#!/usr/bin/env python3
"""Read-only static check: Meta webhook HMAC and school phone scope are distinct.
Never executes the gateway, imports node modules, reads payloads or accesses DB.
"""
import json
from pathlib import Path

LIVE=Path('/var/www/apex-backend/src/routes/whatsappRoutes.js')
CANDIDATE=Path(__file__).resolve().parents[3]/'al-siddique-backend/src/routes/whatsappRoutes.js'
HELPER=Path(__file__).resolve().parents[3]/'al-siddique-backend/src/services/whatsapp/schoolWebhookChannelScope.cjs'

def analyze(route,helper):
    signature=route.find('validateSignature(rawBody, signature, appSecret)')
    scope=route.find('inspectSchoolWebhookChanges(payload, PHONE_ID)')
    denied=route.find('if (!schoolScope.ok)')
    stored=route.find('recordIdempotentEvent(msgId,')
    properly_ordered=signature>=0 and scope>signature and denied>scope and stored>denied
    handler_has_all_changes='for (const changes of schoolScope.values)' in route
    helper_rejects_invalid=("reason:'SCHOOL_PHONE_SCOPE_MISMATCH'" in helper
        and 'value.metadata?.phone_number_id' in helper
        and 'values:[]' in helper
        and 'SCHOOL_PHONE_SCOPE_NOT_CONFIGURED' in helper
        and '(Array.isArray(value.statuses)' in helper)
    return properly_ordered and handler_has_all_changes and helper_rejects_invalid

def inspect(live=LIVE,candidate=CANDIDATE,helper=HELPER):
    for path in (live,candidate,helper):
        if not path.is_file() or path.is_symlink():
            raise RuntimeError('School gateway phone-boundary source unavailable')
    live_text=live.read_text(encoding='utf-8')
    candidate_text=candidate.read_text(encoding='utf-8')
    helper_text=helper.read_text(encoding='utf-8')
    result={'pass':True,
            'live_school_phone_scope_static_pass':analyze(live_text,helper_text),
            'candidate_school_phone_scope_static_pass':analyze(candidate_text,helper_text),
            'whole_system_tenant_isolation_certified':False,
            'interpretation':'STATIC_SOURCE_ORDER_ONLY_NO_SIGNED_RUNTIME_PROVIDER_ACCEPTANCE'}
    result['live_school_phone_scope_hold']=not result['live_school_phone_scope_static_pass']
    return result

if __name__=='__main__':
    try:print(json.dumps(inspect(),indent=2,sort_keys=True))
    except (RuntimeError,OSError,UnicodeError) as e:
        print(json.dumps({'pass':False,'error_type':type(e).__name__}))
        raise SystemExit(3)
