import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DocumentOrigin,
  validateCanonicalPaperDocument,
} from '../core/PaperDocumentV2.js'
import {
  createAssessmentRelease,
  createManualAssessmentDocument,
  mergeServerDocumentIntoLocalPaper,
  validateManualAssessmentForRelease,
} from '../../AssessmentStudio/core/manualAssessmentDocument.js'

const base = {
  paper: {
    clientDraftId:'manual-draft-test-1',
    userAuthored:true,
    assessmentType:'Weekly Assessment',
    scope:{label:'Chapter 3 — Photosynthesis',chapterId:null,learningScopeIds:[]},
    official_section:[
      {id:'q1',heading:'Q1. Answer briefly. (5)',content:'What is photosynthesis?',marks:5},
      {id:'q2',heading:'Q2. Give one example. (5)',content:'Name one product of photosynthesis.',marks:5},
    ],
  },
  config:{
    title:'Weekly Assessment',assessmentType:'Weekly Assessment',scopeLabel:'Chapter 3 — Photosynthesis',
    classLevel:'7',className:'7',subject:'Science',subjectName:'Science',language:'english',
    totalMarks:10,timeAllowed:'30 minutes',examDate:'2026-10-04',session:'2026-2027',
  },
  paperSettings:{schoolName:'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',address:'Sharif Chowk, Rayya Khas, Narowal'},
}

test('manual assessment emits canonical USER_AUTHORED PaperDocument without fake V13 identity',()=>{
 const doc=createManualAssessmentDocument(base)
 assert.equal(doc.documentOrigin,DocumentOrigin.USER_AUTHORED)
 assert.equal(doc.sourceIdentity,null)
 assert.equal(doc.sections.length,2)
 assert.equal(doc.sections[0].nodes[0].content,'What is photosynthesis?')
 assert.equal(doc.scoringPlan.maximumObtainableMarks,10)
 assert.equal(doc.scoringPlan.balanced,true)
 assert.equal(doc.assessment.creationMode,'MANUAL')
 assert.equal(doc.assessment.scope.label,'Chapter 3 — Photosynthesis')
 assert.deepEqual(validateCanonicalPaperDocument(doc),{valid:true,errors:[]})
 assert.deepEqual(validateManualAssessmentForRelease(doc),{valid:true,errors:[]})
})

test('manual finalization is blocked when explicit total and question marks disagree',()=>{
 const doc=createManualAssessmentDocument({...base,config:{...base.config,totalMarks:20}})
 const check=validateManualAssessmentForRelease(doc)
 assert.equal(check.valid,false)
 assert.ok(check.errors.some(x=>x.includes('Scoring plan must be balanced')))
})

test('assessment release is immutable snapshot with deterministic SHA-256 content hash',async()=>{
 const doc=createManualAssessmentDocument(base)
 const release=await createAssessmentRelease(doc)
 assert.equal(release.status,'FINALIZED')
 assert.equal(release.paperDocumentId,'manual-draft-test-1')
 assert.match(release.contentHash,/^[a-f0-9]{64}$/)
 assert.deepEqual(release.snapshot,doc)
 doc.sections[0].nodes[0].content='mutated after release'
 assert.equal(release.snapshot.sections[0].nodes[0].content,'What is photosynthesis?')
 const second=await createAssessmentRelease(release.snapshot)
 assert.equal(second.contentHash,release.contentHash)
})

test('manual semantic layouts map into canonical block types',()=>{
 const doc=createManualAssessmentDocument({
  ...base,
  paper:{...base.paper,official_section:[
   {id:'short1',heading:'Q1. Short. (2)',content:'Define force.',marks:2,layoutPreset:'short'},
   {id:'match1',heading:'Q2. Match. (4)',content:'Book | Kitab\nPen | Qalam',marks:4,layoutPreset:'matching'},
   {id:'table1',heading:'Q3. Complete table. (4)',content:'Noun | Plural\nBook | Books',marks:4,layoutPreset:'table',tablePurpose:'grammar_plural'},
  ]},
  config:{...base.config,totalMarks:10},
 })
 assert.equal(doc.sections[0].nodes[0].type,'short_question')
 assert.equal(doc.sections[1].nodes[0].type,'matching_columns')
 assert.equal(doc.sections[2].nodes[0].type,'grammar_table')
 assert.equal(doc.sections[2].nodes[0].tableSemantic,'grammar_plural')
 assert.equal(doc.sections[2].nodes[0].rows[1].rightText,'Books')
 assert.deepEqual(validateCanonicalPaperDocument(doc),{valid:true,errors:[]})
})

test('choice-aware scoring computes attempt-any maximum separately from available marks',()=>{
 const doc=createManualAssessmentDocument({
  ...base,
  paper:{...base.paper,official_section:[{
   id:'short-choice',
   heading:'Q1. Attempt any 10 questions.',
   content:'Twelve short questions',
   marks:24,
   attemptRule:'ATTEMPT_ANY',
   actualItemCount:12,
   attemptCount:10,
   marksPerItem:2,
  }]},
  config:{...base.config,totalMarks:20},
 })
 const section=doc.sections[0]
 assert.equal(section.attemptRule,'ATTEMPT_ANY')
 assert.equal(section.actualItemCount,12)
 assert.equal(section.attemptCount,10)
 assert.equal(section.operationalSectionTotal,20)
 assert.equal(section.listedPotentialItemMarksTotal,24)
 assert.equal(doc.scoringPlan.strategy,'CHOICE_AWARE')
 assert.equal(doc.scoringPlan.maximumObtainableMarks,20)
 assert.equal(doc.scoringPlan.availableItemMarksTotal,24)
 assert.equal(doc.scoringPlan.choiceGroups.length,1)
 assert.deepEqual(doc.scoringPlan.choiceGroups[0],{
  id:'choice-short-choice',
  sectionId:'manual-section-short-choice',
  mode:'ATTEMPT_ANY',
  availableItemCount:12,
  attemptCount:10,
  marksPerItem:2,
  maximumObtainableMarks:20,
  listedPotentialItemMarksTotal:24,
 })
 assert.equal(doc.scoringPlan.balanced,true)
 assert.deepEqual(validateManualAssessmentForRelease(doc),{valid:true,errors:[]})
})

test('choice-aware scoring models OR choice as one obtainable alternative',()=>{
 const doc=createManualAssessmentDocument({
  ...base,
  paper:{...base.paper,official_section:[{
   id:'long-or',
   heading:'Q1. Attempt either A or B.',
   content:'A) Explain photosynthesis. OR B) Explain respiration.',
   marks:10,
   attemptRule:'CHOICE_GROUP',
   actualItemCount:2,
   attemptCount:1,
   marksPerItem:5,
  }]},
  config:{...base.config,totalMarks:5},
 })
 assert.equal(doc.sections[0].attemptRule,'CHOICE_GROUP')
 assert.equal(doc.sections[0].operationalSectionTotal,5)
 assert.equal(doc.sections[0].listedPotentialItemMarksTotal,10)
 assert.equal(doc.scoringPlan.maximumObtainableMarks,5)
 assert.equal(doc.scoringPlan.availableItemMarksTotal,10)
 assert.equal(doc.scoringPlan.choiceGroups[0].mode,'OR')
 assert.equal(doc.scoringPlan.balanced,true)
})

test('invalid attempt rule fails closed instead of silently clamping counts',()=>{
 const doc=createManualAssessmentDocument({
  ...base,
  paper:{...base.paper,official_section:[{
   id:'bad-choice',
   heading:'Q1. Invalid choice.',
   content:'Three questions',
   marks:6,
   attemptRule:'ATTEMPT_ANY',
   actualItemCount:3,
   attemptCount:4,
   marksPerItem:2,
  }]},
  config:{...base.config,totalMarks:6},
 })
 assert.equal(doc.scoringPlan.balanced,false)
 assert.ok(doc.scoringPlan.errors.some(error=>error.includes('attempt count cannot exceed available item count')))
 const validation=validateManualAssessmentForRelease(doc)
 assert.equal(validation.valid,false)
 assert.ok(validation.errors.some(error=>error.includes('attempt count cannot exceed available item count')))
})

test('header total cannot override the scoring-plan maximum when totals conflict',()=>{
 const doc=createManualAssessmentDocument({
  ...base,
  paper:{...base.paper,official_section:[{
   id:'choice-header-conflict',
   heading:'Q1. Attempt any 2.',
   content:'Three items',
   marks:6,
   attemptRule:'ATTEMPT_ANY',
   actualItemCount:3,
   attemptCount:2,
   marksPerItem:2,
  }]},
  config:{...base.config,totalMarks:6},
 })
 assert.equal(doc.scoringPlan.maximumObtainableMarks,4)
 assert.equal(doc.authority.authoritativePaperTotal,4)
 assert.equal(doc.authority.originalTeacherHeaderTotal,6)
 assert.equal(doc.authority.flags.hasSourceHeaderConflict,true)
 assert.equal(doc.scoringPlan.balanced,false)
})


test('nested choice scoring supports required groups containing OR and attempt-any subgroups',()=>{
 const doc=createManualAssessmentDocument({
  ...base,
  paper:{...base.paper,official_section:[{
   id:'nested-choice',
   heading:'Q3. Complete both groups using the stated choices.',
   content:'Group A: choose one long question. Group B: attempt any two short questions.',
   marks:16,
   attemptRule:'ALL',
   choiceGroups:[
    {
     id:'long-or',
     mode:'OR',
     children:[
      {id:'long-a',maximumObtainableMarks:5,listedPotentialItemMarksTotal:5},
      {id:'long-b',maximumObtainableMarks:5,listedPotentialItemMarksTotal:5},
     ],
    },
    {
     id:'short-any',
     mode:'ATTEMPT_ANY',
     attemptCount:2,
     children:[
      {id:'short-1',maximumObtainableMarks:2,listedPotentialItemMarksTotal:2},
      {id:'short-2',maximumObtainableMarks:2,listedPotentialItemMarksTotal:2},
      {id:'short-3',maximumObtainableMarks:2,listedPotentialItemMarksTotal:2},
     ],
    },
   ],
  }]},
  config:{...base.config,totalMarks:9},
 })
 const section=doc.sections[0]
 assert.equal(section.operationalSectionTotal,9)
 assert.equal(section.listedPotentialItemMarksTotal,16)
 assert.equal(doc.scoringPlan.version,3)
 assert.equal(doc.scoringPlan.maximumObtainableMarks,9)
 assert.equal(doc.scoringPlan.availableItemMarksTotal,16)
 assert.equal(doc.scoringPlan.choiceGroups.length,1)
 assert.equal(doc.scoringPlan.choiceGroups[0].mode,'ALL')
 assert.equal(doc.scoringPlan.choiceGroups[0].children[0].mode,'OR')
 assert.equal(doc.scoringPlan.choiceGroups[0].children[0].maximumObtainableMarks,5)
 assert.equal(doc.scoringPlan.choiceGroups[0].children[1].mode,'ATTEMPT_ANY')
 assert.equal(doc.scoringPlan.choiceGroups[0].children[1].attemptCount,2)
 assert.equal(doc.scoringPlan.choiceGroups[0].children[1].maximumObtainableMarks,4)
 assert.equal(section.formula.children.length,2)
 assert.deepEqual(validateManualAssessmentForRelease(doc),{valid:true,errors:[]})

 const reopened=mergeServerDocumentIntoLocalPaper(base.paper,doc,{currentRevision:2,contentHash:'nested-hash'})
 assert.equal(reopened.config.totalMarks,9)
 assert.equal(reopened.official_section[0].nestedChoiceMode,'ALL')
 assert.equal(reopened.official_section[0].choiceGroups.length,2)
 assert.equal(reopened.official_section[0].choiceGroups[0].mode,'OR')
 assert.equal(reopened.official_section[0].choiceGroups[1].mode,'ATTEMPT_ANY')
})

test('nested choice scoring blocks impossible subgroup attempt counts',()=>{
 const doc=createManualAssessmentDocument({
  ...base,
  paper:{...base.paper,official_section:[{
   id:'invalid-nested-choice',
   heading:'Attempt any three of two alternatives.',
   content:'Invalid nested choice',
   attemptRule:'ALL',
   choiceGroups:[{
    id:'invalid-any',
    mode:'ATTEMPT_ANY',
    attemptCount:3,
    children:[
     {id:'a',maximumObtainableMarks:2,listedPotentialItemMarksTotal:2},
     {id:'b',maximumObtainableMarks:2,listedPotentialItemMarksTotal:2},
    ],
   }],
  }]},
  config:{...base.config,totalMarks:6},
 })
 assert.equal(doc.scoringPlan.balanced,false)
 assert.ok(doc.scoringPlan.errors.some(error=>error.includes('cannot exceed available alternatives')))
 const releaseCheck=validateManualAssessmentForRelease(doc)
 assert.equal(releaseCheck.valid,false)
 assert.ok(releaseCheck.errors.some(error=>error.includes('cannot exceed available alternatives')))
})

test('teacher inline serial and Urdu statement styling round-trips through server-authoritative canonical JSON',()=>{
 const before=JSON.parse(JSON.stringify(base))
 const styled={
  ...before,
  paper:{
   ...before.paper,
   official_section:[
    {
     ...before.paper.official_section[0],
     richText:{
      headingSerial:'<span style="font-weight: bold;">Q1.</span>',
      headingInstruction:'<span style="text-decoration: underline;">Answer briefly.</span> (5)',
     }
    },
    before.paper.official_section[1],
   ]
  }
 }
 const doc=createManualAssessmentDocument(styled)
 assert.equal(doc.documentOrigin,DocumentOrigin.USER_AUTHORED)
 assert.deepEqual(doc.sections[0].editorInlineRichText,styled.paper.official_section[0].richText)
 assert.equal(doc.sections[1].editorInlineRichText,undefined)
 assert.equal(doc.sections[0].heading,before.paper.official_section[0].heading)
 assert.equal(doc.scoringPlan.maximumObtainableMarks,10)
 assert.deepEqual(validateManualAssessmentForRelease(doc),{valid:true,errors:[]})
 const serverCopy=JSON.parse(JSON.stringify(doc))
 const reopened=mergeServerDocumentIntoLocalPaper({},serverCopy,{currentRevision:2,contentHash:'safe-style-hash'})
 assert.deepEqual(reopened.official_section[0].richText,styled.paper.official_section[0].richText)
 assert.equal(reopened.official_section[1].richText,undefined)
 assert.equal(reopened.official_section[0].marks,5)
 assert.equal(reopened.config.totalMarks,10)
 assert.equal(reopened.serverRevision,2)
 assert.equal(reopened.persistenceAuthority,'SERVER_REVISION_SOURCE_OF_TRUTH')
})

test('visual-only heading format refuses scripts, handlers, excessive payload and protected official sources',()=>{
 const doc=createManualAssessmentDocument(base)
 const mutated=JSON.parse(JSON.stringify(doc))
 mutated.sections[0].editorInlineRichText={headingSerial:'<img src=x onerror=alert(1)>'}
 assert.equal(validateCanonicalPaperDocument(mutated).valid,false)
 mutated.sections[0].editorInlineRichText={headingSerial:'<span onclick="a()">Q1</span>'}
 assert.equal(validateCanonicalPaperDocument(mutated).valid,false)
 mutated.sections[0].editorInlineRichText={headingSerial:'A'.repeat(8193)}
 assert.equal(validateCanonicalPaperDocument(mutated).valid,false)
 mutated.sections[0].editorInlineRichText={headingSerial:'Q1',otherQuestionId:'foreign'}
 assert.equal(validateCanonicalPaperDocument(mutated).valid,false)
 mutated.sections[0].editorInlineRichText={headingSerial:'Q1'}
 mutated.documentOrigin=DocumentOrigin.OFFICIAL
 assert.equal(validateCanonicalPaperDocument(mutated).valid,false)
 assert.equal(doc.sections[0].editorInlineRichText,undefined)
})

test('server-reopened forged rich text cannot be copied into teacher-visible formatting fields',()=>{
 const doc=createManualAssessmentDocument(base)
 const adversarial=JSON.parse(JSON.stringify(doc))
 adversarial.sections[0].editorInlineRichText={
  headingSerial:'<svg onload=alert(1)>Q1.</svg>',
  headingInstruction:'<span style="position:fixed;left:0">Spoof</span>'
 }
 const reopened=mergeServerDocumentIntoLocalPaper({},adversarial,{currentRevision:3})
 assert.equal(reopened.official_section[0].richText?.headingSerial,undefined)
 assert.equal(reopened.official_section[0].richText?.headingInstruction,undefined)
 assert.equal(reopened.official_section[0].heading,doc.sections[0].heading)
 assert.equal(reopened.official_section[0].marks,5)
 assert.equal(validateCanonicalPaperDocument(adversarial).valid,false)
})

test('legacy canonical papers without inline-format extension retain identical serialization and scoring',()=>{
 const doc=createManualAssessmentDocument(base)
 const before=JSON.stringify(doc.sections)
 assert.equal(doc.sections.every(s=>!Object.hasOwn(s,'editorInlineRichText')),true)
 const restored=mergeServerDocumentIntoLocalPaper({},JSON.parse(JSON.stringify(doc)))
 assert.equal(restored.official_section[0].richText,undefined)
 assert.equal(restored.official_section[0].heading,base.paper.official_section[0].heading)
 assert.equal(restored.official_section[0].marks,5)
 assert.equal(JSON.stringify(doc.sections),before)
 assert.deepEqual(validateManualAssessmentForRelease(doc),{valid:true,errors:[]})
})
