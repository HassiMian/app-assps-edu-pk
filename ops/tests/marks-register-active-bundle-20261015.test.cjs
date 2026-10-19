'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const os=require('node:os')
const path=require('node:path')
const {inspect}=require('../release/verify-marks-register-active-bundle-20261015.cjs')
const marker=['Print Marks','Print / Save PDF','marks_obtained','SCORED','PENDING','ABSENT','/api/exams/results'].join(' ')
const entry='assets/index-QA.js'
const js='assets/MarksRegister-QA.js'
const css='assets/MarksRegister-QA.css'
const baseEntry=['/examination/marks/review','/exams/marks/review','exams_marks',js,css].map(x=>'"'+x+'"').join(',')
function fixture(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'assps-marks-route-'))
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}))
  fs.mkdirSync(path.join(root,'assets'))
  const put=(key,data)=>fs.writeFileSync(path.join(root,key),data)
  put('index.html','<html><script src="/'+entry+'"></script></html>')
  put(entry,baseEntry)
  put(js,marker)
  put(css,'.mr-body{width:100%;color:#000;} '.repeat(30))
  return {root,put}
}
test('exact active marks import verifies print, zero/blank and scoped route contract',t=>{
  const f=fixture(t),out=inspect(f.root)
  assert.equal(out.decision,'PASS_ACTIVE_MARKS_REVIEW_PRINT_SOURCE_CONTRACT')
  assert.equal(out.schoolRecordsTouched,false)
})
test('stale good marks chunk cannot hide broken currently imported chunk',t=>{
  const f=fixture(t);f.put('assets/MarksRegister-ORPHAN.js',marker)
  f.put(js,'this is the active broken old module')
  assert.throws(()=>inspect(f.root),/MARKS_REVIEW_PRINT_CONTRACT_FAIL/)
})
test('missing permission marker blocks publication',t=>{
  const f=fixture(t);f.put(entry,baseEntry.replace('exams_marks','other_permission'))
  assert.throws(()=>inspect(f.root),/ENTRY_exams_marks/)
})
test('missing alias route blocks publication',t=>{
  const f=fixture(t);f.put(entry,baseEntry.replace('/exams/marks/review','/some-old-url'))
  assert.throws(()=>inspect(f.root),/ENTRY_\/exams\/marks\/review/)
})
test('missing score-state distinction blocks publication',t=>{
  const f=fixture(t);f.put(js,marker.replace('ABSENT','EMPTY'))
  assert.throws(()=>inspect(f.root),/MODULE_ABSENT/)
})
test('missing print control blocks publication',t=>{
  const f=fixture(t);f.put(js,marker.replace('Print / Save PDF','No print available'))
  assert.throws(()=>inspect(f.root),/MODULE_Print \/ Save PDF/)
})
test('duplicate active module imports fail closed',t=>{
  const f=fixture(t);f.put(entry,baseEntry+','+JSON.stringify(js))
  assert.throws(()=>inspect(f.root),/ACTIVE_MARKS_MODULE_NOT_UNIQUE/)
})
test('removed active marks JS fails closed despite orphan file',t=>{
  const f=fixture(t);fs.unlinkSync(path.join(f.root,js))
  assert.throws(()=>inspect(f.root),/ENOENT/)
})
test('missing CSS controls fail closed',t=>{
  const f=fixture(t);f.put(css,'.no-style{}')
  assert.throws(()=>inspect(f.root),/MARKS_CSS_STYLES/)
})
test('symlink active imported module rejected',t=>{
  const f=fixture(t),target=path.join(f.root,js)
  fs.unlinkSync(target);fs.symlinkSync(path.join(f.root,'index.html'),target)
  assert.throws(()=>inspect(f.root),/SYMLINK_ASSET_REJECTED/)
})
