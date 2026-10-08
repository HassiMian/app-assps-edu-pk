#!/usr/bin/env node
'use strict'
/**
 * Provisional Physics IX conceptual answer QA: independently written explanatory
 * expectations do NOT constitute subject specialist review or school approval.
 */
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const SOURCE=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/physics9EnglishStarter2026.json')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_PHYSICS9_CONCEPTUAL_MCQ_REFERENCE_QA_20261008.json')
const PARENT_SHA='1a882970fc2548f50bc001691d6de990ce156690cfa252f3f5355d8d63a6dc16'
const sha=b=>crypto.createHash('sha256').update(b).digest('hex')
const normalize=s=>String(s??'').normalize('NFKC').toLowerCase().trim().replace(/[.،۔!?؟]+$/gu,'')
const FACTS=Object.freeze({
 'IX-PHY-2025-C01-M01':{expected:'metre',basis:'Length is an SI base quantity; its base unit is the metre.',caveat:null},
 'IX-PHY-2025-C01-M02':{expected:'Precision',basis:'Repeated readings close to one another indicate precision; accuracy concerns proximity to a reference value.',caveat:null},
 'IX-PHY-2025-C02-M01':{expected:'Velocity',basis:'Velocity has magnitude and direction, unlike time, temperature or scalar energy.',caveat:null},
 'IX-PHY-2025-C02-M02':{expected:'Velocity',basis:'Acceleration is the time derivative of velocity, including changes of direction.',caveat:null},
 'IX-PHY-2025-C03-M01':{expected:'Acceleration',basis:'For constant mass in classical mechanics the net force equals mass times acceleration.',caveat:'CLASSICAL_CONSTANT_MASS_SCOPE'},
 'IX-PHY-2025-C03-M02':{expected:'Velocity',basis:'Classical momentum is mass multiplied by velocity, a vector quantity.',caveat:'CLASSICAL_NONRELATIVISTIC_SCOPE'},
 'IX-PHY-2025-C04-M01':{expected:'Moment',basis:'A force acting at a perpendicular lever arm produces a turning moment about a pivot.',caveat:null},
 'IX-PHY-2025-C04-M02':{expected:'Anticlockwise moments',basis:'For coplanar static rotational equilibrium net moment is zero, so opposing moments balance.',caveat:'COPLANAR_STATIC_EQUILIBRIUM_SCOPE'},
 'IX-PHY-2025-C05-M01':{expected:'Displacement in the force direction',basis:'Work by a constant force equals the dot product of force and displacement.',caveat:'CONSTANT_FORCE_SCOPE'},
 'IX-PHY-2025-C05-M02':{expected:'Work',basis:'Power is the rate of energy transfer or work done per unit time.',caveat:null},
 'IX-PHY-2025-C06-M01':{expected:'Applied force',basis:'Hooke law relates spring extension linearly to applied force only within the proportional elastic range.',caveat:'SPRING_PROPORTIONAL_LIMIT_SCOPE'},
 'IX-PHY-2025-C06-M02':{expected:'Area',basis:'Pressure for a normal contact force is force per unit area.',caveat:'NORMAL_FORCE_ON_SURFACE_SCOPE'},
 'IX-PHY-2025-C07-M01':{expected:'Temperature measures thermal state while heat is energy transferred due to temperature difference',basis:'Temperature is a state measure while heat denotes thermal energy in transfer because of a temperature difference.',caveat:'THERMODYNAMIC_LANGUAGE_REVIEW'},
 'IX-PHY-2025-C07-M02':{expected:'Gain kinetic energy',basis:'During many temperature rises the average particle kinetic energy increases; at a phase change heat can instead increase potential energy.',caveat:'PHASE_CHANGE_EXCEPTION_REVIEW'},
 'IX-PHY-2025-C08-M01':{expected:'They repel',basis:'Like magnetic poles repel while unlike poles attract.',caveat:null},
 'IX-PHY-2025-C08-M02':{expected:'North to south',basis:'By convention outside a bar magnet field lines leave its north pole and enter its south pole.',caveat:null},
 'IX-PHY-2025-C09-M01':{expected:'Their interactions',basis:'Physics models interactions of matter, energy, space and time.',caveat:null},
 'IX-PHY-2025-C09-M02':{expected:'Testable',basis:'Scientific hypotheses must make testable predictions that can be checked against observations.',caveat:null}
})
function verifyQuestionAgainstReference(q,fact){
 const opts=q.content?.en?.options
 if(!Array.isArray(opts)||opts.length!==4||opts.map(o=>o.id).join('')!=='ABCD'||
    new Set(opts.map(o=>normalize(o.text))).size!==4)
   throw Error('PHYSICS9_MCQ_OPTIONS_INVALID:'+q.id)
 const matches=opts.filter(o=>normalize(o.text)===normalize(fact.expected))
 if(matches.length!==1)
   throw Error('PHYSICS9_EXPECTED_SCIENTIFIC_OPTION_MISSING_OR_AMBIGUOUS:'+q.id)
 const candidate=opts.find(o=>o.id===q.correctOptionId)
 if(!candidate||candidate.id!==matches[0].id||normalize(q.content.en.answer)!==normalize(fact.expected))
   throw Error('PHYSICS9_STORED_KEY_CONTRADICTS_REFERENCE:'+q.id)
 return {selectedOptionId:candidate.id,expectedAnswerSha256:sha(normalize(fact.expected))}
}
function analyze(sourceBytes){
 if(sha(sourceBytes)!==PARENT_SHA)throw Error('PHYSICS9_SOURCE_CONTENT_SHA_DRIFT')
 const data=JSON.parse(sourceBytes)
 if(data.publicationAllowed!==false||data.liveImportAllowed!==false||data.sourceRecordId!=='pectaa-catalog-011'||data.reviewStatus!=='UNREVIEWED_ORIGINAL_DRAFTS')
  throw Error('PHYSICS9_PARENT_AUDIENCE_OR_SOURCE_DRIFT')
 const mcqs=data.drafts.filter(q=>q.type==='mcq')
 if(mcqs.length!==18||Object.keys(FACTS).length!==18)throw Error('PHYSICS9_ORIGINAL_MCQ_COUNT_DRIFT')
 const rows=[]
 const seen=new Set()
 for(const q of mcqs){
  const fact=FACTS[q.id]
  if(!fact||seen.has(q.id))throw Error('PHYSICS9_GOLDEN_ID_MISSING_OR_DUPLICATE:'+q.id)
  seen.add(q.id)
  if(q.curriculum?.grade!==9||q.curriculum?.subjectId!=='physics'||q.medium!=='english'||q.review?.status!=='draft'||
     q.source?.catalogRecordId!=='pectaa-catalog-011'||q.source?.pdfSha256!==data.sourcePdfSha256)
   throw Error('PHYSICS9_SUBJECT_OR_SOURCE_IDENTITY_DRIFT:'+q.id)
  const checked=verifyQuestionAgainstReference(q,fact)
  rows.push({
    questionId:q.id,originalQuestionSha256:sha(JSON.stringify(q)),
    grade:9,subject:'physics',medium:'english',chapter:q.chapter?.number??null,
    expectedAnswerSha256:checked.expectedAnswerSha256,selectedOptionId:checked.selectedOptionId,
    expectedReferenceConsistentWithStoredKey:true,
    conceptualRationale:fact.basis,contextCaveat:fact.caveat,
    answerAccuracyHumanVerified:false,sourcePrintedPageHumanVerified:false,
    schoolAdoptedEditionCertified:false,independentReviewerId:null,
    approved:false,published:false
  })
 }
 if(seen.size!==Object.keys(FACTS).length)throw Error('PHYSICS9_GOLDEN_COVERAGE_GAP')
 return {
  schemaVersion:'assps-physics9-conceptual-mcq-reference-qa-v1',
  scope:'PROVISIONAL_EDITORIAL_SCIENTIFIC_REFERENCE_NOT_HUMAN_REVIEW',
  parentSourceFile:path.relative(ROOT,SOURCE),parentSourceSha256:sha(sourceBytes),
  originalQuestionCount:data.drafts.length,originalMcqCount:mcqs.length,uniqueQuestionsAdded:0,
  referenceOptionConsistent:rows.length,
  contextualQualifications:rows.filter(x=>x.contextCaveat).length,
  allStoredKeysOriginallyA:mcqs.every(q=>q.correctOptionId==='A'),
  independentHumanAnswerVerified:0,sourcePageVerified:0,schoolEditionAdoptionVerified:0,
  academicApproved:0,published:0,releaseEligible:false,liveImportAllowed:false,
  rows
 }
}
if(require.main===module){
 try{
  const report=analyze(fs.readFileSync(SOURCE))
  if(process.argv.includes('--write'))fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify({sourceSha256:report.parentSourceSha256,originalMcqCount:report.originalMcqCount,
   referenceOptionConsistent:report.referenceOptionConsistent,contextualQualifications:report.contextualQualifications,
   approved:0,published:0},null,2))
 }catch(e){console.error(e.message);process.exitCode=2}
}
module.exports={analyze,verifyQuestionAgainstReference,FACTS,SOURCE,OUT}
