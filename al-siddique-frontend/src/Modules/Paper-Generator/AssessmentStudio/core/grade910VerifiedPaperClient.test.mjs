import test from 'node:test'
import assert from 'node:assert/strict'
import {gradeOf,renderVerifiedBody,toVerifiedPaperSection} from './grade910VerifiedPaperClient.js'
import {createManualAssessmentDocument} from './manualAssessmentDocument.js'
const h='b'.repeat(64)
const row={academicallyVerified:true,paperStudioSelectable:true,
 originalQuestionId:'IX-BIO-Q07',revision:7,questionSha:h,answerSha:h,publicationGrantSha:h,
 grade:9,subject:'Biology',medium:'english',
 paperPayload:{originalQuestionId:'IX-BIO-Q07',questionRevision:7,
 finalQuestion:{text:'DNA stores what?',marks:2,options:[{label:'A',text:'Genetic information'},{label:'B',text:'Heat'}]},
 finalAnswer:{answer:'A'}}}
test('IX/X and class aliases mapped only for supported grade',()=>{
 assert.equal(gradeOf('9th'),9);assert.equal(gradeOf('IX'),9)
 assert.equal(gradeOf('10th'),10);assert.equal(gradeOf('X'),10)
 assert.equal(gradeOf('8th'),null)
})
test('verified question maps to exact native canonical section with marks and preserved provenance',()=>{
 const {section,ref}=toVerifiedPaperSection(row)
 assert.equal(section.content,'DNA stores what?\nA. Genetic information\nB. Heat')
 assert.equal(ref.sectionId,'verified-IX-BIO-Q07-rev-7')
 const paper={userAuthored:true,official_section:[section],grade910Verified:{
  grade:9,subject:'Biology',section:'Usman',refs:[ref]}}
 const doc=createManualAssessmentDocument({paper,config:{className:'9th',classLevel:'9th',subject:'Biology',subjectName:'Biology',totalMarks:2}})
 assert.equal(doc.sections[0].nodes[0].content,section.content)
 assert.equal(doc.sections[0].nodes[0].authoritativeNodeMarks,2)
 assert.deepEqual(doc.grade910Verified.refs,[ref])
 assert.equal(doc.grade910Verified.section,'Usman')
})
test('client refuses fake approval flag, missing answer digest, wrong version and fabricated marks',()=>{
 for(const bad of [
  {...row,academicallyVerified:false},
  {...row,answerSha:'wrong'},
  {...row,paperPayload:{...row.paperPayload,questionRevision:6}},
  {...row,paperPayload:{...row.paperPayload,finalQuestion:{text:'Fake',marks:0}}}
 ])assert.throws(()=>toVerifiedPaperSection(bad))
})
test('verified formatting is stable and does not include answer-key text',()=>{
 const s=renderVerifiedBody(row.paperPayload.finalQuestion)
 assert.equal(s.includes('answer:'),false)
 assert.equal(s,'DNA stores what?\nA. Genetic information\nB. Heat')
})
