'use strict'
/** Source-only notices audit. Never certifies staff identities or production release. */
const fs = require('node:fs')
const path = require('node:path')
function block(source, method, route) {
  const needle="router."+method+"('"+route+"',"
  const start=source.indexOf(needle)
  if (start<0 || source.indexOf(needle,start+1)>=0) return ''
  const text=source.slice(start+needle.length)
  const end=text.search(/\nrouter\.(?:get|post|put|delete)\(/)
  return end>=0?text.slice(0,end):text
}
function evaluate(source) {
 const get=block(source,'get','/')
 const post=block(source,'post','/')
 const put=block(source,'put','/:id')
 const del=block(source,'delete','/:id')
 const roles=source.match(/const canManageNotices\s*=\s*requireRoles\(([^)\n]+)\)/)
 const allowed=roles?[...roles[1].matchAll(/['"]([^'"]+)['"]/g)].map(x=>x[1]):[]
 const all=[get,post,put,del]
 const checks={
  four_routes_present:all.every(Boolean),
  signed_auth_on_all_routes:all.every(s=>/\bprotect\b/.test(s)),
  get_has_read_scope:get.includes("requireScopeForServiceOnly('school.notices.read')"),
  get_school_sql_scoped:/SELECT\s+\*\s+FROM\s+notices\s+WHERE\s+school_id\s*=\s*\$1/i.test(get),
  writes_require_managers_not_teachers:!allowed.includes('teacher') && ['principal','admin','school_admin'].every(x=>allowed.includes(x)) && [post,put,del].every(s=>s.includes('canManageNotices')),
  post_issuer_uses_session:post.includes('req.user?.name') && !/\bnotice\.issuedBy\b/.test(post),
  update_preserves_original_issuer:/UPDATE\s+notices/i.test(put) && !/issued_by\s*=/.test(put) && /WHERE\s+id\s*=\s*\$\d+\s+AND\s+school_id\s*=\s*\$\d+/i.test(put),
  delete_tenant_and_id_scoped:/DELETE\s+FROM\s+notices\s+WHERE\s+id\s*=\s*\$1\s+AND\s+school_id\s*=\s*\$2/i.test(del)
 }
 const managerOnly=/\brequireRoles\([^)]*['"]principal['"][^)]*\)/.test(get) && !/\brequireRoles\([^)]*['"]teacher['"]/.test(get)
 const teacherDenied=/\brole\s*===?\s*['"]teacher['"][\s\S]{0,180}\b(?:403|forbidden|deny)/i.test(get)
 const audienceBound=managerOnly || (teacherDenied && /recipient_type/.test(get) && /teacher_ids/.test(get) && /req\.user/.test(get))
 const blockers=Object.entries(checks).filter(([,pass])=>!pass).map(([name])=>name)
 if(!audienceBound)blockers.push('UNVERIFIED_TEACHER_NOTICE_AUDIENCE')
 return {schema:'ASSPS_NOTICES_SOURCE_AUDIT_V1',source_checks:checks,source_audience_bound:audienceBound, status:blockers.length?'HOLD_NOTICE_READ_AUDIENCE':'SOURCE_GUARD_PRESENT_NOT_LIVE_CERTIFIED',production_release_authorized:false,school2_authenticated:false,blockers}
}
if(require.main===module) {
 const file=process.argv[2]||path.resolve(__dirname,'../../al-siddique-backend/src/routes/noticesRoutes.js')
 const r=evaluate(fs.readFileSync(file,'utf8'))
 console.log(JSON.stringify(r,null,2))
 if(r.blockers.length)process.exitCode=2
}
module.exports={evaluate}
