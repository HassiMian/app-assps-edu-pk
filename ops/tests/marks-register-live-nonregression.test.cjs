'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path')
const {inspect}=require('../release/verify-marks-register-ui-20261015.cjs')
const actual=process.env.ASSPS_MARKS_REGISTER_DIST
test('actual active Grade Diary plus Marks Register frontend feature present',()=>{
 assert.ok(actual,'ASSPS_MARKS_REGISTER_DIST must explicitly identify candidate artifact')
 const r=inspect(actual)
 assert.equal(r.status,'PASS')
 assert.ok(r.activeModule.startsWith('MarksRegister-'))
})
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'assps-marks-ui-'))
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}))
 fs.mkdirSync(path.join(dir,'assets'))
 const files={
 'index.html':'<html><script type="module" src="/assets/index-test1234.js"></script></html>',
 'assets/index-test1234.js':'"assets/MarksRegister-abcdefgh.js" + "assets/MarksRegister-abcdefgh.css"',
 'assets/MarksRegister-abcdefgh.js':'Saved Marks Register Print Marks Sheet /api/exams/results ABSENT Edit student_id exam_ids',
 'assets/MarksRegister-abcdefgh.css':'.mr-page .mr-tablewrap{}'
 }
 for(const [f,x] of Object.entries(files))fs.writeFileSync(path.join(dir,f),x)
 return {dir,files,change:(f,fn)=>fs.writeFileSync(path.join(dir,f),fn(fs.readFileSync(path.join(dir,f),'utf8')))}
}
test('valid reachable artifact passes',t=>{assert.equal(inspect(fixture(t).dir).status,'PASS')})
test('orphan feature does not pass an active old index',t=>{
 const q=fixture(t)
 q.change('assets/index-test1234.js',()=>'"assets/LegacyMarks-abcdefgh.js"')
 assert.throws(()=>inspect(q.dir),/MARKS_REGISTER_NOT_REACHABLE/)
})
test('missing edit/link or actual saved record must fail',t=>{
 const q=fixture(t)
 q.change('assets/MarksRegister-abcdefgh.js',s=>s.replace('Edit','AuditRoute'))
 assert.throws(()=>inspect(q.dir),/MISSING_FEATURES_Edit/)
})
test('missing CSS never satisfies compiled route contract',t=>{
 const q=fixture(t)
 fs.rmSync(path.join(q.dir,'assets/MarksRegister-abcdefgh.css'))
 assert.throws(()=>inspect(q.dir),/MISSING_OR_UNTRUSTED_ASSET/)
})
