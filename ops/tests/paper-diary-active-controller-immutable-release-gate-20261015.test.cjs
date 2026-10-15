'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path')
const {inspect}=require('../release/verify-diary-controls-in-active-bundle-20261015.cjs')
// Candidate and production checks are explicitly scoped; never assume a mutable
// VPS live directory is part of a hermetic source-unit test run.
const CANDIDATE=process.env.ASSPS_DIARY_CANDIDATE_DIST
const LIVE=process.env.ASSPS_DIARY_LIVE_DIST
function sandbox(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'assps-diary-release-'))
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}))
 fs.mkdirSync(path.join(root,'assets'))
 const files={
  'index.html':'<html><script type="module" src="/assets/index-abc.js"></script></html>',
  'assets/index-abc.js':'const papers = "assets/PaperGenerator-abc.js";export const version = "source";',
  'assets/PaperGenerator-abc.js':'const diary = "assets/DailyDiaryWorkspace-abc.js";const css = "assets/DailyDiaryWorkspace-abc.css";export const paper=true;',
  'assets/DailyDiaryWorkspace-abc.js':'const controls="Subject Bold | Row Height | Diary Font Size | Footer Font Size | Logo Size | Print | Saved | subjectFontSize | rowHeightMm | logoSizeMm | footerFontSize";const app=true;',
  'assets/DailyDiaryWorkspace-abc.css':'.daily-diary-root { font-family: serif; padding: 12px; min-height: 200px; } .diary-card { border: 0; color: black; }'
 }
 for(const [f,b] of Object.entries(files))fs.writeFileSync(path.join(root,f),b)
 return{root,files,change(f,fn){fs.writeFileSync(path.join(root,f),fn(fs.readFileSync(path.join(root,f),'utf8')))}}
}
test('explicit staged release candidate preserves all active diary controllers',t=>{
 if(!CANDIDATE)return t.skip('set ASSPS_DIARY_CANDIDATE_DIST for immutable release-candidate check')
 const a=inspect(CANDIDATE)
 assert.equal(a.verifiedControllerSignals.length,11)
 assert.equal(a.activeEntryGraphVerified,true)
 assert.equal(a.deploymentPerformed,false)
 assert.match(a.activeDiaryModule,/^assets\/DailyDiaryWorkspace-[\w-]+\.js$/)
})
test('explicit live production root meets active diary controller contract',t=>{
 if(!LIVE)return t.skip('set ASSPS_DIARY_LIVE_DIST for independent live production gate')
 const a=inspect(LIVE)
 assert.equal(a.verifiedControllerSignals.length,11)
 assert.equal(a.activeEntryGraphVerified,true)
})
test('reject candidate which silently drops even one active subject/diary/print controller',t=>{
 const q=sandbox(t)
 assert.equal(inspect(q.root).verifiedControllerSignals.length,11)
 q.change('assets/DailyDiaryWorkspace-abc.js',s=>s.replace('subjectFontSize','oldSubjectSetting'))
 assert.throws(()=>inspect(q.root),/MISSING_CONTROLLERS_SUBJECT_FONT_SETTING/)
})
test('fail if current index script points to missing or old Paper route, even when new Diary chunk exists',t=>{
 const q=sandbox(t)
 q.change('index.html',s=>s.replace('index-abc.js','index-missing.js'))
 assert.throws(()=>inspect(q.root),/MISSING_OR_UNTRUSTED_ASSET/)
})
test('fail if the imported Paper route references stale/obsolete Diary even though correct file is present',t=>{
 const q=sandbox(t)
 q.change('assets/PaperGenerator-abc.js',s=>s.replace('DailyDiaryWorkspace-abc.js','DailyDiaryWorkspace-old.js'))
 assert.throws(()=>inspect(q.root),/MISSING_OR_UNTRUSTED_ASSET/)
})
test('fail on multiple Diary module imports to prevent nondeterministic active UI selection',t=>{
 const q=sandbox(t)
 q.change('assets/PaperGenerator-abc.js',s=>s+'const other="assets/DailyDiaryWorkspace-old.js";')
 assert.throws(()=>inspect(q.root),/ENTRYPOINT_DIARY_MODULE_MISSING_OR_AMBIGUOUS/)
})
test('fail if active CSS is absent, stale, or incompatible with Diary',t=>{
 const q=sandbox(t)
 q.change('assets/DailyDiaryWorkspace-abc.css',()=>'.not-diary {color: red;}')
 assert.throws(()=>inspect(q.root),/MISSING_OR_UNTRUSTED_ASSET|DIARY_CSS_MISSING_OR_WRONG/)
})
test('orphan Diary file with all controls is NOT proof active Diary bundle has controls',t=>{
 const q=sandbox(t)
 fs.copyFileSync(path.join(q.root,'assets/DailyDiaryWorkspace-abc.js'),path.join(q.root,'assets/DailyDiaryWorkspace-old.js'))
 q.change('assets/DailyDiaryWorkspace-abc.js',s=>s.replace('Diary Font Size','Diary Size Removed'))
 assert.throws(()=>inspect(q.root),/MISSING_CONTROLLERS_DIARY_FONT_SIZE/)
})
test('reject a symlink pretending to be the preserved Diary bundle',t=>{
 const q=sandbox(t)
 const f=path.join(q.root,'assets/DailyDiaryWorkspace-abc.js')
 fs.renameSync(f,f+'.old')
 fs.symlinkSync('DailyDiaryWorkspace-abc.js.old',f)
 assert.throws(()=>inspect(q.root),/MISSING_OR_UNTRUSTED_ASSET/)
})
