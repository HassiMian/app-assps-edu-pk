import test from 'node:test'
import assert from 'node:assert/strict'
import { BASIC_PAPER_CLASS_LEVELS, createBlankPaperDraft, canDuplicatePaperInWorkspace, createDuplicatePaperDraft } from '../../paperCreationDraft.js'
import { createQuickQuestionRecord } from '../../quickQuestionRecord.js'
import { resolvePaperRoute } from '../../resolvePaperRoute.js'

test('Blank Paper requires only class and subject; has no synthetic question, bank or saved ID',()=>{
 const blank=createBlankPaperDraft({classLevel:'flyer',subjectName:'Urdu',language:'urdu',targetMarks:50,name:'Flyer Original Test'})
 assert.equal(blank.id,undefined)
 assert.equal(blank.userAuthored,true)
 assert.equal(blank.creationMethod,'blank')
 assert.equal(blank.config.totalMarks,50)
 assert.equal(blank.config.language,'urdu')
 assert.deepEqual(blank.official_section,[])
 assert.equal(blank.selectedQuestions.official_section.questions.length,0)
 assert.equal(resolvePaperRoute({...blank,id:'paper_new'},null),'build')
 assert.ok(BASIC_PAPER_CLASS_LEVELS.some(([code])=>code==='starter'))
 assert.ok(BASIC_PAPER_CLASS_LEVELS.some(([code])=>code==='mover'))
 assert.ok(BASIC_PAPER_CLASS_LEVELS.some(([code])=>code==='flyer'))
})
test('Empty target total stays unassigned, and missing class/subject or invalid total rejected',()=>{
 const draft=createBlankPaperDraft({classLevel:'8',subjectName:'Science',targetMarks:''})
 assert.equal(draft.config.totalMarks,0)
 assert.throws(()=>createBlankPaperDraft({classLevel:'',subjectName:'Science'}),/Class and subject/)
 assert.throws(()=>createBlankPaperDraft({classLevel:'8',subjectName:' '}),/Class and subject/)
 assert.throws(()=>createBlankPaperDraft({classLevel:'8',subjectName:'Science',targetMarks:-10}),/Total marks/)
})
test('Duplicate preserves source and deep copies questions while removing persisted identity',()=>{
 const source={id:'recovery-first-term-2026-class-8-urdu',name:'Class 8 Urdu',documentFormat:'pts-native-v13',recoverySourceManaged:true,config:{classLevel:'8',totalMarks:70},official_section:[{id:'q1',heading:'Question 1',content:'source',marks:5}],selectedQuestions:{official_section:{questions:[{text:'source'}],marks:5}},createdAt:'2026-10-01'}
 const before=JSON.stringify(source)
 assert.equal(canDuplicatePaperInWorkspace(source),true)
 const copy=createDuplicatePaperDraft(source)
 assert.equal(JSON.stringify(source),before)
 assert.equal(copy.id,undefined)
 assert.equal(copy.createdAt,undefined)
 assert.equal(copy.duplicateOf,source.id)
 assert.equal(copy.sourcePaperId,source.id)
 assert.equal(copy.userAuthored,true)
 assert.equal(copy.printReadiness,'DRAFT')
 copy.official_section[0].content='my change'
 copy.selectedQuestions.official_section.questions[0].text='my change'
 assert.equal(source.official_section[0].content,'source')
 assert.equal(source.selectedQuestions.official_section.questions[0].text,'source')
})
test('Specialist Early Years and board sources cannot be incorrectly duplicated into generic workspace',()=>{
 for(const source of [
  {id:'ey-flyer-urdu-2026',corpusId:'early-years-first-term-2026',classStage:'flyer'},
  {id:'paper_board',structureMode:'board_pattern'},
  {id:'paper_flyer',config:{classLevel:'flyer'},selectedQuestions:{}}
 ]){
  assert.equal(canDuplicatePaperInWorkspace(source),false)
  assert.throws(()=>createDuplicatePaperDraft(source),/specialist editor/)
 }
})
test('Quick Add preserves manually supplied Urdu and dual translations without inventing answers',()=>{
 const base={subjectId:'subj_1',type:'short',marks:2,chapter:''}
 const en=createQuickQuestionRecord({...base,medium:'english',text:'What is a cell?'})
 assert.deepEqual([en.text,en.textUrdu,en.answer],['What is a cell?','',''])
 const ur=createQuickQuestionRecord({...base,medium:'urdu',text:'خلیہ کیا ہے؟'})
 assert.deepEqual([ur.text,ur.textUrdu],['','خلیہ کیا ہے؟'])
 const dual=createQuickQuestionRecord({...base,medium:'dual',text:'Define cell',textUrdu:'خلیہ کی تعریف کریں۔',marks:3})
 assert.deepEqual([dual.text,dual.textUrdu,dual.marks],['Define cell','خلیہ کی تعریف کریں۔',3])
 assert.throws(()=>createQuickQuestionRecord({...base,medium:'dual',text:'Define cell'}),/separate Urdu/)
 assert.throws(()=>createQuickQuestionRecord({...base,medium:'urdu',text:'   '}),/question text/)
 assert.throws(()=>createQuickQuestionRecord({...base,medium:'urdu',text:'test',marks:0}),/Marks/)
 assert.throws(()=>createQuickQuestionRecord({...base,type:'mcq',text:'test'}),/Advanced Add/)
})
