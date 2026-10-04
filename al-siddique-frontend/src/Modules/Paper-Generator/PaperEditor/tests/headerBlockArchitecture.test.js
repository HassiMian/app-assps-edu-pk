import test from 'node:test'
import assert from 'node:assert/strict'
import { createEditorWorkingDocument } from '../editorV2/createEditorWorkingDocument.js'
import { EditorWorkingStore } from '../editorV2/editorWorkingStore.js'
const canonical={id:'header-architecture',metadata:{language:'english',direction:'ltr',subject:'Science',className:'One',examType:'First Term',session:'2026'},presentation:{},authority:{authoritativePaperTotal:50},sections:[],sourceIdentity:{}}
test('header is first-class editable/template data with scoped styles',()=>{
 const doc=createEditorWorkingDocument(canonical); assert.deepEqual(doc.presentation.headerFieldStyles,{})
 const store=new EditorWorkingStore(canonical)
 assert.equal(store.setMetadataField('subject','General Science'),true)
 assert.equal(store.setHeaderFieldStyle('subject',{fontWeight:'bold',textAlign:'center'}),true)
 assert.deepEqual(store.getHeaderFieldStyle('subject'),{fontWeight:'bold',textAlign:'center'})
 store.addCustomHeaderField('Campus','Rayya Khas')
 const template=store.exportHeaderTemplate(); assert.equal(template.templateVersion,1); assert.equal(template.metadata.fields.subject,'General Science'); assert.equal(template.metadata.customFields[0].label,'Campus')
 const other=new EditorWorkingStore(canonical); assert.equal(other.applyHeaderTemplate(template),true); assert.equal(other.getWorkingDocument().metadata.subject,'General Science'); assert.equal(other.getWorkingDocument().metadata.customFields[0].value,'Rayya Khas'); assert.deepEqual(other.getHeaderFieldStyle('subject'),{fontWeight:'bold',textAlign:'center'})
 const draft=other.exportCompactDraft({forceV2:true}); assert.deepEqual(draft.presentationPatch.headerFieldStyles.subject,{fontWeight:'bold',textAlign:'center'})
})
test('header style sanitizer rejects unsupported CSS',()=>{const store=new EditorWorkingStore(canonical);store.setHeaderFieldStyle('subject',{fontWeight:'bold',position:'fixed',fontSize:'999pt'});assert.deepEqual(store.getHeaderFieldStyle('subject'),{fontWeight:'bold'})})
