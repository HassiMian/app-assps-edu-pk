import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DocumentOrigin,
  validateCanonicalPaperDocument,
} from '../core/PaperDocumentV2.js'
import {
  createAssessmentRelease,
  createManualAssessmentDocument,
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
