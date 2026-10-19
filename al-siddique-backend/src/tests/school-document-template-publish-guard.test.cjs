'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {
  PRESET_FIELD_NAMES,unresolvedPresetFields,cleanNotice
}=require('../services/documents/schoolDocumentContract')
const root=path.resolve(__dirname,'../../../')
const view=fs.readFileSync(path.join(root,'al-siddique-frontend/src/Modules/documents/SchoolDocumentStudio.jsx'),'utf8')
const route=fs.readFileSync(path.join(__dirname,'../routes/schoolDocumentStudioRoutes.js'),'utf8')

test('all real notice templates bracket placeholders are covered by the publication guard',()=>{
 const section=view.split('const PRESETS=[')[1]?.split(']\nconst LAYOUTS')[0]
 assert.ok(section,'actual ready-to-edit presets must exist')
 const found=[...new Set([...section.matchAll(/\[([^\[\]\r\n]{1,60})\]/g)]
   .map(x=>x[1].toLowerCase().replace(/\s+/g,' ').trim()))].sort()
 assert.deepEqual([...PRESET_FIELD_NAMES].sort(),found)
})
for(const field of PRESET_FIELD_NAMES) {
 test('publication guard detects real preset placeholder '+field,()=>{
  assert.deepEqual(unresolvedPresetFields({message:'The details are ['+field+'].'}),[field])
 })
}
test('multiple placeholders are deduplicated, deterministically sorted and case-normalized',()=>{
 assert.deepEqual(unresolvedPresetFields({message:'[DATE] and [Reason] and [date]',action_required:'[ Month ]',note:'[reason]'}),['date','month','reason'])
})
test('completed real publication body has no outstanding preset fields',()=>{
 assert.deepEqual(unresolvedPresetFields({message:'School closes on Monday, 19 October 2026 for maintenance. Reopens Tuesday.',action_required:'Please update diaries.',note:'Approved by Principal.'}),[])
})
test('safe Urdu and ordinary academic bracket notation do not become false positives',()=>{
 assert.deepEqual(unresolvedPresetFields({message:'محترم والدین: اسکول پیر کو بند رہے گا۔ [A] Grade One. 【سبق】'}),[])
})
test('invalid persisted JSON or unexpected document content fail closed',()=>{
 assert.deepEqual(unresolvedPresetFields('{'),['invalid_document_content'])
 assert.deepEqual(unresolvedPresetFields(null),['invalid_document_content'])
 assert.deepEqual(unresolvedPresetFields([]),['invalid_document_content'])
 assert.deepEqual(unresolvedPresetFields('"just a string"'),['invalid_document_content'])
})
test('JSONB serialization and restore retains checks',()=>{
 assert.deepEqual(unresolvedPresetFields(JSON.stringify({message:'Fees due on [due date].'})),['due date'])
})
test('draft notice body with placeholders can still be saved for editing',()=>{
 const payload={document_kind:'notice',title:'School Closure Draft',language:'english',audience_kind:'parents',layout_key:'prism',audience_classes:[],content:{message:'The school closes on [date] for [reason].',issue_date:'2026-10-17'}}
 const result=cleanNotice(payload)
 assert.deepEqual(result.errors,[])
 assert.deepEqual(unresolvedPresetFields(result.value.content),['date','reason'])
})
test('server publication checks the locked matching content and rolls back on unresolved text',()=>{
 assert.match(route,/SELECT id,created_by,approved_by,content FROM school_documents/)
 const portion=route.split("if(to==='published'){")[1]?.split('const sourceGate')[0]
 assert.ok(portion)
 assert.match(portion,/unresolvedPresetFields\(before\.rows\[0\]\.content\)/)
 assert.match(portion,/await client\.query\('ROLLBACK'\)/)
 assert.match(portion,/UNRESOLVED_NOTICE_TEMPLATE_FIELDS/)
 assert.match(route,/if\(to==='approved' && before\.rows\[0\]\.created_by===actor\(req\)\)/)
 assert.match(route,/APPROVAL_REQUIRED/)
 assert.match(route,/OFFICIAL_SOURCE_REATTESTATION_REQUIRED/)
})
