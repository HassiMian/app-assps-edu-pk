import test from 'node:test'
import assert from 'node:assert/strict'
import { getAllEarlyYearsPapers,validateEarlyYearsCorpus } from '../earlyYears/data/earlyYearsSourceStore.js'
import { tenantStorageKey } from '../../../../services/tenantStorage.js'
import { USER_EARLY_YEARS_KEY, ACTIVITY_TYPES, createUserEarlyYearsPaper, addUserActivity, parseActivityContent,
 updateUserActivity, displayActivityContent, validateUserEarlyYearsPaper, listUserEarlyYearsPapers,
 saveUserEarlyYearsPaper, duplicateUserEarlyYearsPaper, deleteUserEarlyYearsPaper } from '../earlyYears/earlyYearsUserPapers.js'
const mem=new Map()
globalThis.window={localStorage:{
 getItem:k=>mem.has(k)?mem.get(k):null,
 setItem:(k,v)=>mem.set(k,String(v)),
 removeItem:k=>mem.delete(k)
}}
window.localStorage.setItem('al_siddique_user',JSON.stringify({tenant_id:'assps-phase2-test'}))
const src=JSON.stringify(getAllEarlyYearsPapers())
const setup=()=>createUserEarlyYearsPaper({classStage:'starter',subject:'English',name:'My Practice',title:'New Worksheet'})
test('nine original sources are preserved and separate',()=>{
 assert.equal(getAllEarlyYearsPapers().length,9)
 assert.equal(validateEarlyYearsCorpus().valid,true)
 assert.equal(ACTIVITY_TYPES.length,10)
 assert.equal(setup().id,null)
 assert.equal(setup().questions.length,0)
})
test('activity builder uses existing renderer content shapes',()=>{
 assert.deepEqual(parseActivityContent('TraceGlyphGrid','A, B, C').glyphs,['A','B','C'])
 assert.deepEqual(parseActivityContent('CircleChoiceGrid','A, B\nC, D').letterGrid,[['A','B'],['C','D']])
 const art=parseActivityContent('PictureColoringBlock','apple, mango')
 assert.deepEqual(art.items.map(i=>i.sketchId),['sketch.apple.v1','sketch.mango.v1'])
 assert.throws(()=>parseActivityContent('PictureColoringBlock','unlisted picture'),/Unknown picture/)
 assert.equal(parseActivityContent('UrduAlphabetWritingArea','',{lineCount:4}).lineCount,4)
 assert.equal(parseActivityContent('BeforeAfterGrid','2,4').items.length,2)
})
test('activity IDs, explicit marks, numbering and source immutability',()=>{
 const old=setup()
 const one=addUserActivity(old,'TraceGlyphGrid',{text:'A B C',marks:3,instruction:'Trace'})
 assert.equal(old.questions.length,0)
 assert.equal(one.questions.length,1)
 assert.equal(one.questions[0].label,'Q1')
 assert.equal(one.questions[0].marks,3)
 const two=addUserActivity(one,'AlphabetWritingArea',{marks:4,lineCount:4})
 assert.notEqual(two.questions[0].id,two.questions[1].id)
 assert.equal(two.questions[1].questionNumber,2)
 const changed=updateUserActivity(two,two.questions[1].id,{instruction:'Write neatly',marks:5})
 assert.equal(two.questions[1].marks,4)
 assert.equal(changed.questions[1].marks,5)
 assert.equal(displayActivityContent(changed.questions[0]),'A, B, C')
})
test('unmarked and mismatched papers are drafts, never silently corrected',()=>{
 const zero=addUserActivity(setup(),'TraceGlyphGrid',{text:'A,B'})
 assert.ok(validateUserEarlyYearsPaper(zero).issues.some(x=>x.includes('enter valid marks')))
 const marked=updateUserActivity(zero,zero.questions[0].id,{marks:5})
 assert.equal(validateUserEarlyYearsPaper(marked).valid,true)
 const conflict={...marked,headerSource:{...marked.headerSource,totalMarks:10}}
 assert.equal(validateUserEarlyYearsPaper(conflict).valid,false)
 assert.equal(conflict.questions[0].marks,5)
 assert.equal(validateUserEarlyYearsPaper(conflict).questionMarks,5)
})
test('new save, repeat save same ID, optimistic conflict, independent duplicate',()=>{
 const key=tenantStorageKey(USER_EARLY_YEARS_KEY)
 mem.delete(key)
 const draft=addUserActivity(setup(),'TraceGlyphGrid',{text:'A,B',marks:5})
 const saved=saveUserEarlyYearsPaper(draft)
 assert.ok(saved.id.startsWith('eyu-'))
 assert.equal(saved.revision,1)
 assert.equal(saved.status,'DRAFT')
 assert.equal(listUserEarlyYearsPapers().length,1)
 const again=saveUserEarlyYearsPaper({...saved,name:'Renamed'})
 assert.equal(again.id,saved.id)
 assert.equal(again.revision,2)
 assert.equal(listUserEarlyYearsPapers().length,1)
 assert.throws(()=>saveUserEarlyYearsPaper(saved),/Another version/)
 const duplicate=duplicateUserEarlyYearsPaper(again)
 assert.equal(duplicate.id,null)
 assert.notEqual(duplicate.questions[0].id,again.questions[0].id)
 const second=saveUserEarlyYearsPaper(duplicate)
 assert.notEqual(second.id,again.id)
 assert.equal(listUserEarlyYearsPapers().length,2)
 assert.equal(listUserEarlyYearsPapers().find(p=>p.id===again.id).name,'Renamed')
 assert.throws(()=>deleteUserEarlyYearsPaper(again.id,1),/changed/)
 assert.equal(deleteUserEarlyYearsPaper(second.id,second.revision),true)
 assert.equal(listUserEarlyYearsPapers().length,1)
 assert.equal(JSON.stringify(getAllEarlyYearsPapers()),src)
})
test('failed storage writes do not report save success',()=>{
 const storage=window.localStorage
 window.localStorage={...storage,setItem:()=>{throw new Error('quota')} }
 try {assert.throws(()=>saveUserEarlyYearsPaper(setup()),/quota/)}
 finally {window.localStorage=storage}
})
test('corrupted user library refuses destructive replacement',()=>{
 const key=tenantStorageKey(USER_EARLY_YEARS_KEY)
 const old=mem.get(key)
 mem.set(key,'{bad-json')
 assert.throws(()=>saveUserEarlyYearsPaper(setup()))
 assert.equal(mem.get(key),'{bad-json')
 mem.set(key,old)
})
