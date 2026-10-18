'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {evaluate}=require('../notices/verify-notice-audience-source-20261017.cjs')
const src=fs.readFileSync(path.resolve(__dirname,'../../al-siddique-backend/src/routes/noticesRoutes.js'),'utf8')
const original=evaluate(src)
test('manager-only read containment is source-guarded, NOT live teacher delivery',()=>{
 assert.equal(original.status,'SOURCE_GUARD_PRESENT_NOT_LIVE_CERTIFIED')
 assert.equal(original.source_audience_bound,true)
 assert.equal(original.blockers.length,0)
 assert.equal(original.production_release_authorized,false)
 assert.equal(original.school2_authenticated,false)
})
test('existing WIP scoped write invariants observed',()=>{
 for(const key of ['four_routes_present','signed_auth_on_all_routes','get_has_read_scope','get_school_sql_scoped','writes_require_managers_not_teachers','post_issuer_uses_session','update_preserves_original_issuer','delete_tenant_and_id_scoped'])assert.equal(original.source_checks[key],true,key)
})
const attacks=[
 ['no GET school scope',s=>s.replace('WHERE school_id = $1 ORDER BY created_at DESC LIMIT 50','ORDER BY created_at DESC LIMIT 50'),'get_school_sql_scoped'],
 ['unauthenticated GET',s=>s.replace("router.get('/', protect,","router.get('/',"),'signed_auth_on_all_routes'],
 ['no service read scope',s=>s.replace("requireScopeForServiceOnly('school.notices.read')","(req,res,next)=>next()"),'get_has_read_scope'],
 ['teacher may manage notices',s=>s.replace("'principal')","'principal', 'teacher')"),'writes_require_managers_not_teachers'],
 ['client sets issuer',s=>s.replace("String(req.user?.name || req.user?.email || '').trim()","notice.issuedBy || String(req.user?.name || req.user?.email || '').trim()"),'post_issuer_uses_session'],
 ['original issuer modified',s=>s.replace('SET title = $1,','SET issued_by = $0, title = $1,'),'update_preserves_original_issuer'],
 ['tenant bypass in delete',s=>s.replace('DELETE FROM notices WHERE id = $1 AND school_id = $2','DELETE FROM notices WHERE id = $1'),'delete_tenant_and_id_scoped']
]
for(const [title,fn,key] of attacks)test('reject '+title,()=>{
 const changed=fn(src);assert.notEqual(changed,src)
 const check=evaluate(changed);assert.equal(check.source_checks[key],false)
 assert.ok(check.blockers.includes(key))
 assert.equal(check.production_release_authorized,false)
})
test('recipient words alone cannot replace manager authorization',()=>{
 const changed=src.replace("requireRoles('super_admin', 'admin', 'school_admin', 'principal'), async", "async")
   .replace('// Temporary security containment:', '// recipient_type teacher_ids req.user Temporary security containment:')
 assert.notEqual(changed,src)
 assert.equal(evaluate(changed).source_audience_bound,false)
})
test('service scope alone never grants notice audience access',()=>{
 assert.equal(original.source_checks.get_has_read_scope,true)
 assert.equal(original.source_audience_bound,true)
})
test('removing manager-only GET containment fails closed',()=>{
 const changed=src.replace("requireRoles('super_admin', 'admin', 'school_admin', 'principal'), async", "async")
 assert.notEqual(changed,src)
 assert.equal(evaluate(changed).status,'HOLD_NOTICE_READ_AUDIENCE')
})
