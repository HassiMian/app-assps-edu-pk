import test from 'node:test'
import process from 'node:process'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const source=fs.readFileSync(process.env.PAPER_DIARY_SOURCE_FILE||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../DailyDiaryWorkspace.jsx'),'utf8')
const start=source.indexOf('  const saveLessonPlan=async()=>{')
const end=source.indexOf('  // Explicit teacher action:',start)
assert.ok(start>=0&&end>start,'real production save handler must be extracted')
const handler=source.slice(start,end)

async function exercise({changeEditor=false,changeScope=false}={}){
 let finish
 const pending=new Promise(resolve=>{finish=resolve})
 const original={id:'plan-1',title:'Original'}
 const other={id:'plan-2',title:'Another'}
 const calls={editor:[],selection:[],library:[],status:[],busy:[]}
 const state={
  lessonDoc:original,classLevel:'8',section:'Blue',date:'2026-10-10',
  diaryScopeGeneration:{current:4},latestLessonDocRef:{current:original},
  setBusy:value=>calls.busy.push(value),
  toLessonPlanPersistencePayload:value=>value,
  updateLessonPlan:()=>pending,createLessonPlan:()=>pending,
  normalizeLessonPlanDocument:value=>value,
  setLessonDoc:value=>calls.editor.push(value),
  setLessonPlanId:value=>calls.selection.push(value),
  setLessonPlans:callback=>calls.library.push(callback([{id:'plan-1',title:'Old'},{id:'plan-3'}])),
  setStatus:value=>calls.status.push(value),
 }
 const save=vm.runInNewContext(`${handler}\nsaveLessonPlan`,state)
 const active=save()
 if(changeEditor)state.latestLessonDocRef.current=other
 if(changeScope)state.diaryScopeGeneration.current++
 finish({id:'plan-1',title:'Server saved'})
 await active
 return calls
}

test('saved lesson response updates unchanged editor and replaces matching saved-list row',async()=>{
 const r=await exercise()
 assert.equal(r.editor.length,1)
 assert.equal(r.selection[0],'plan-1')
 assert.equal(r.library[0].length,2)
 assert.equal(r.library[0][0].title,'Server saved')
 assert.equal(r.status.at(-1),'Lesson plan saved safely.')
})
test('late lesson save never overwrites a newly selected editor document',async()=>{
 const r=await exercise({changeEditor:true})
 assert.equal(r.editor.length,0)
 assert.equal(r.selection.length,0)
 assert.equal(r.library[0][0].title,'Server saved')
 assert.match(r.status.at(-1),/Current editor selection was not overwritten/)
})
test('late lesson save from old class/date scope never overwrites new scope',async()=>{
 const r=await exercise({changeScope:true})
 assert.equal(r.editor.length,0)
 assert.equal(r.selection.length,0)
 assert.equal(r.library.length,1)
 assert.match(r.status.at(-1),/Current editor selection was not overwritten/)
})
