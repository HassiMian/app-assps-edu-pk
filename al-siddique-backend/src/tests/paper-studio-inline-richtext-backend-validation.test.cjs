'use strict'
const {test} = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const {pathToFileURL} = require('node:url')
const {safeInlineHtml,validatePaperStudioInlineRichText} = require('../services/paperStudioInlineRichTextGuard')
const editor = pathToFileURL(path.resolve(__dirname,'../../../al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/core/PaperDocumentV2.js')).href
function doc(extension) {
 return {documentOrigin:'USER_AUTHORED', metadata:{subject:'Urdu',className:'7'},
  sections:[{id:'s1',heading:'Q1. Answer shortly.',marks:10,...extension}]}
}
test('backend heading validator matches canonical editor for allowed and rejected markup',async()=>{
 const {isSafeEditorInlineHtml} = await import(editor)
 const inputs=[
  'Q1.', '<b>Q1</b>', '<strong>Q1</strong>',
  '<span dir="rtl" style="font-size:16px;color:#123456">سوال نمبر ایک</span>',
  '<span style="font-family:\'Jameel Noori Nastaleeq\'; text-decoration:underline">الف</span>',
  '<sup>2</sup>', '<br>',
  '<iframe></iframe>', '<span onclick="x()">Q1</span>',
  '<span style="background-image:url(x)">Q1</span>',
  '<span data-unknown="1">Q1</span>', '<b>Q'.repeat(2000),
 ]
 for(const html of inputs) assert.equal(safeInlineHtml(html),isSafeEditorInlineHtml(html),html.slice(0,65))
})
test('valid rich headings preserve marks and source document bytes',()=>{
 const original=doc({editorInlineRichText:{headingSerial:'<b>Q1.</b>',headingInstruction:'<span dir="rtl" style="font-size:16px">سوال ایک</span>'}})
 const before=JSON.stringify(original)
 assert.equal(validatePaperStudioInlineRichText(original),null)
 assert.equal(JSON.stringify(original),before)
 assert.equal(original.sections[0].marks,10)
 assert.equal(validatePaperStudioInlineRichText(doc({})),null)
})
test('server denies unsafe or unauthorized optional heading fields',()=>{
 const samples=[
  {headingSerial:'<iframe></iframe>'},
  {headingSerial:'<span onfocus="x()">Q1</span>'},
  {headingInstruction:'<span style="background-image:url(x)">A</span>'},
  {headingSerial:'a'.repeat(8193)},
  {headingSerial:'Q1',foreignRecordId:'hidden'},
 ]
 for(const fields of samples) assert.ok(validatePaperStudioInlineRichText(doc({editorInlineRichText:fields})))
 assert.ok(validatePaperStudioInlineRichText(doc({editorInlineRichText:null})))
 assert.ok(validatePaperStudioInlineRichText(doc({editorInlineRichText:[]})))
 assert.ok(validatePaperStudioInlineRichText({documentOrigin:'OFFICIAL',sections:[{editorInlineRichText:{headingSerial:'Q1'}}]}))
 assert.ok(validatePaperStudioInlineRichText({documentOrigin:'USER_AUTHORED',sections:[null]}))
})
