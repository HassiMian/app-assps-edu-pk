'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const {canManageGlobalAiQueue}=require('./globalAiQueueAuthority')
const src=fs.readFileSync('/root/secure-archive/assps-security-mission-20261101/paperRoute.candidate.js','utf8')
test('platform global queue is not under any school-scoped user role',()=>{
 for(const role of ['principal','admin','teacher','accountant','school_admin','student',null])
  assert.equal(canManageGlobalAiQueue({role}),false)
 assert.equal(canManageGlobalAiQueue({role:'super_admin'}),true)
 assert.equal(canManageGlobalAiQueue(null),false)
})
test('actual global pause and resume routes call the new authorization helper',()=>{
 assert.match(src,/function requireQueueAdmin\(req, res\)/)
 assert.match(src,/if \(canManageGlobalAiQueue\(req\.user\)\) return true/)
 assert.match(src,/GLOBAL_QUEUE_SUPER_ADMIN_ONLY/)
 assert.match(src,/router\.post\('\/jobs\/queue\/pause', protect, canUsePaperAi/)
 assert.match(src,/router\.post\('\/jobs\/queue\/resume', protect, canUsePaperAi/)
 assert.equal((src.match(/if \(!requireQueueAdmin\(req, res\)\) return/g)||[]).length,2)
})
test('school job scoping and events filtering remain in place',()=>{
 assert.match(src,/function canAccessJob\(req, job\)/)
 assert.match(src,/function scopedJobs\(req\)/)
 assert.match(src,/function scopedQueueStats\(req\)/)
 assert.match(src,/Number\(event\?\.meta\?\.school_id \|\| 0\) === Number\(currentSchoolId\(req\)\)/)
})
