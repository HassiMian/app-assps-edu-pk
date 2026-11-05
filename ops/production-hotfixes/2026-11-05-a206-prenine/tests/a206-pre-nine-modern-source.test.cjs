'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const path=require('node:path')
const {execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../../../..')
const mark='al-siddique-frontend/src/Modules/attendance/MarkAttendance.jsx'
const view='al-siddique-frontend/src/Modules/attendance/AttendanceModule.jsx'
const school='al-siddique-frontend/src/services/useAcademicStore.js'
const read=(f)=>fs.readFileSync(path.join(root,f),'utf8')
const original=f=>execFileSync('git',['show','75c01ba4:'+f],{cwd:root,encoding:'utf8'})
function helpers(s,begin,end,fields){
 const i=s.indexOf(begin),j=s.indexOf(end,i)
 assert.ok(i>=0 && j>i,'helper snippet missing')
 const context={module:{exports:{}}}
 vm.runInNewContext(s.slice(i,j)+`\nmodule.exports={${fields.join(',')}}`,context,{timeout:1200})
 return context.module.exports
}
function markHelpers(s){return helpers(s,'function attendanceClassLabel','function Panel',['attendanceClassLabel','attendanceApiClass','attendanceSectionsForClass'])}
function viewHelpers(s){return helpers(s,'function attendanceSectionsForClass','const card',['attendanceSectionsForClass'])}
function academic(s){
 const m={module:{exports:{}}}
 const js=s.replace(/^import[^\n]+\n/gm,'').replace(/^export /gm,'')
 vm.runInNewContext(js+'\nmodule.exports={normalizeClassLevel,classLevelLabel,classLevelsMatch};',m,{timeout:1200})
 return m.module.exports
}
test('modern canonical academic source has separate Pre Nine and Nine class identities',()=>{
 const a=academic(read(school))
 assert.equal(a.normalizeClassLevel('Pre Nine'),'pre-nine')
 assert.equal(a.normalizeClassLevel('Nine'),'9')
 assert.equal(a.classLevelLabel('pre-nine'),'Pre Nine')
 assert.equal(a.classLevelsMatch('pre-nine','9'),false)
})
test('modern academic store itself remains byte-for-byte unchanged from source base',()=>{
 assert.equal(read(school),original(school))
})
test('existing modern MarkAttendance source reproduces wrong Pre Nine alias',()=>{
 const s=original(mark)
 assert.match(s,/'Pre Nine': 'Nine'/)
 assert.match(s,/return value === 'Pre Nine' \? 'Nine' : value/)
})
test('candidate MarkAttendance class/API filters retain exact class identity',()=>{
 const a=markHelpers(read(mark))
 assert.equal(a.attendanceClassLabel('Pre Nine'),'Pre Nine')
 assert.equal(a.attendanceApiClass('Pre Nine'),'Pre Nine')
 assert.equal(a.attendanceClassLabel('Nine'),'Nine')
 assert.equal(a.attendanceApiClass('Nine'),'Nine')
 assert.equal(a.attendanceApiClass('Five'),'Five')
})
test('candidate MarkAttendance does not leak Nine sections into Pre Nine',()=>{
 const a=markHelpers(read(mark))
 const sections=x=>x==='Pre Nine'?['Blue']:x==='Nine'?['Fatima','Usman']:[]
 assert.deepEqual(Array.from(a.attendanceSectionsForClass('Pre Nine',sections)),['Blue'])
 assert.deepEqual(Array.from(a.attendanceSectionsForClass('Nine',sections)),['Fatima','Usman'])
 assert.deepEqual(Array.from(a.attendanceSectionsForClass('missing',sections)),[])
})
test('existing AttendanceModule source previously leaked Nine sections from Pre Nine',()=>{
 const a=viewHelpers(original(view))
 assert.deepEqual(Array.from(a.attendanceSectionsForClass('Nine',x=>x==='Pre Nine'?['Blue']:[])),['Blue'])
})
test('candidate AttendanceModule keeps Nine and Pre Nine section choice independent',()=>{
 const a=viewHelpers(read(view))
 const sections=x=>x==='Pre Nine'?['Blue']:x==='Nine'?['Fatima','Usman']:[]
 assert.deepEqual(Array.from(a.attendanceSectionsForClass('Pre Nine',sections)),['Blue'])
 assert.deepEqual(Array.from(a.attendanceSectionsForClass('Nine',sections)),['Fatima','Usman'])
 assert.deepEqual(Array.from(a.attendanceSectionsForClass('not configured',sections)),[])
})
test('candidate retains anti-stale attendance load and transactional save guards',()=>{
 const source=read(mark)
 assert.match(source,/loadedScopeRef\.current/)
 assert.match(source,/\/api\/attendance\/mark/)
 assert.match(source,/if \(!selectedClass \|\| !selectedSection\)/)
})
test('review patch affects only MarkAttendance and AttendanceModule, not source academic store',()=>{
 const changed=execFileSync('git',['diff','--name-only','75c01ba4'],{cwd:root,encoding:'utf8'}).trim().split('\n')
 assert.deepEqual(changed.filter(f=>f.endsWith('.jsx')||f.endsWith('useAcademicStore.js')).sort(),[mark,view].sort())
})
