'use strict';
const assert=require('node:assert/strict');
const {preflight}=require('./verify-current-scoped-worker-node-readonly-20261015.cjs');
const good={
 ASSPS_SCOPED_WORKER_READONLY_ACCEPTANCE:'yes',DB_SIGNED_TENANT_RLS_ENABLED:'true',
 DB_AI_WORKER_HOST:'127.0.0.1',DB_AI_WORKER_PORT:'5432',
 DB_AI_WORKER_NAME:'apexos',DB_AI_WORKER_USER:'assps_ai_worker_login',
 DB_AI_WORKER_ROLE:'assps_core_ai_worker',DB_AI_WORKER_PASSWORD:'x'.repeat(50),
 DB_USER:'assps_core_green_login',
};
let n=0;function t(name,fn){fn();n++;console.log('PASS '+name)}
t('live database cannot be touched without opt-in',()=>assert(preflight({...good,ASSPS_SCOPED_WORKER_READONLY_ACCEPTANCE:''}).includes('explicit_opt_in_missing')));
t('production default worker cannot run without signed Green',()=>assert(preflight({...good,DB_SIGNED_TENANT_RLS_ENABLED:'false'}).includes('signed_green_off')));
t('nonlocal target rejected',()=>assert(preflight({...good,DB_AI_WORKER_HOST:'172.16.0.9'}).includes('local_worker_target_required')));
t('alternate port rejected',()=>assert(preflight({...good,DB_AI_WORKER_PORT:'55475'}).includes('local_worker_target_required')));
t('postgres/root identity rejected',()=>assert(preflight({...good,DB_AI_WORKER_USER:'postgres'}).includes('restricted_worker_identity_required')));
t('worker role escalation rejected',()=>assert(preflight({...good,DB_AI_WORKER_ROLE:'postgres'}).includes('restricted_worker_identity_required')));
t('missing protected worker password rejected',()=>assert(preflight({...good,DB_AI_WORKER_PASSWORD:''}).includes('restricted_worker_identity_required')));
t('worker must differ from Green principal',()=>assert(preflight({...good,DB_USER:'assps_ai_worker_login'}).includes('restricted_worker_identity_required')));
t('unapproved adapter digest rejected',()=>assert(preflight(good,()=>true,()=>'0'.repeat(64)).includes('adapter_hash_mismatch')));
t('current reviewed adapter/sources/lesson route exactly match',()=>assert.deepEqual(preflight(good),[]));
console.log('CURRENT_WORKER_REAL_NODE_READONLY_SOURCE_NEGATIVES '+n+'/'+n+' PASS');
