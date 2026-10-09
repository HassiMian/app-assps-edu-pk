#!/usr/bin/env node
'use strict'
// Independent conceptual English model-answer CANDIDATES; no approval or paper change.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {rubricOnlyLongAnswer}=require('../../al-siddique-backend/src/services/grade910ModelAnswerPolicy')
const ROOT=path.resolve(__dirname,'../..')
const SRC=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/physics9EnglishStarter2026.json')
const REG=path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')
const OUT=path.join(ROOT,'docs/question-bank')
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const ORIGINAL_SHA='1a882970fc2548f50bc001691d6de990ce156690cfa252f3f5355d8d63a6dc16'
const ANSWERS=Object.freeze({
'IX-PHY-2025-C01-L01':{
 answer:'The least count of a measuring instrument is the smallest scale interval or change that it can reliably distinguish. An instrument with a finer scale may resolve a smaller difference, but its actual accuracy also depends on calibration and how it is used. A ruler is suitable for the length of a notebook, while a more finely graduated instrument may be needed for a smaller dimension. A scale should be viewed straight on to limit parallax error, and repeated measurements can reveal random variation. The recorded result should include a unit and a justified number of digits; an instrument cannot support unlimited precision.',
 points:['Define instrument least count','Differentiate resolution from accuracy','Choose instrument suitable to dimension','Explain proper scale reading and parallax','Include units and defensible significant figures']},
'IX-PHY-2025-C02-L01':{
 answer:'A distance–time graph shows how total distance travelled changes with time. Its gradient gives speed over the interval, while a horizontal segment indicates that no further distance is being covered. A steeper rising segment represents greater speed. A velocity–time graph also shows direction, because its velocity values can be positive or negative relative to a chosen axis. The gradient of a velocity–time graph gives acceleration, while the signed area between the graph and time axis gives displacement. Comparing gradients and shapes helps distinguish motion with constant speed or velocity from motion where velocity is changing.',
 points:['Distance-time gradient is speed','Horizontal distance-time line indicates rest','Velocity-time gradient is acceleration','Signed velocity-time area gives displacement','Interpret uniform versus nonuniform motion']},
'IX-PHY-2025-C03-L01':{
 answer:'Newton’s first law states that an object remains at rest or moves with constant velocity unless a resultant external force changes its motion. A book resting on a desk illustrates balanced forces and no acceleration. The second law relates the net force to the rate of change of momentum, and for constant mass is written F = ma: a lightly loaded trolley generally accelerates more than a heavier trolley when the same resultant force acts. The third law says interacting bodies exert equal and opposite forces on each other, such as a person pushing the ground backward while walking and the ground pushing the person forward. Action–reaction forces act on different objects and therefore do not cancel as forces on one body.',
 points:['First law, inertia and no resultant force','Valid first-law example','Second law and force/acceleration relationship','Valid second-law example','Third law, different bodies and valid example']},
'IX-PHY-2025-C04-L01':{
 answer:'A rigid body is in translational equilibrium when the vector sum of all external forces acting on it is zero; consequently its centre of mass has no acceleration. Rotational equilibrium also requires the sum of external moments or torques about any point to be zero. For forces acting in one plane, clockwise moments must balance anticlockwise moments about a chosen pivot. A book resting steadily on a level shelf has its downward weight balanced by an upward support force, and the moments are also balanced. Both force balance and torque balance are needed for complete equilibrium; either condition alone is insufficient.',
 points:['Resultant external force is zero','No translational acceleration','Resultant moment/torque is zero','Clockwise and anticlockwise moments balance','Illustrate both conditions in one rigid body']},
'IX-PHY-2025-C05-L01':{
 answer:'A falling object loses gravitational potential energy as its height above a chosen reference decreases. If air resistance is negligible, the object speeds up and its kinetic energy increases by the same amount as its potential energy decreases. In this ideal case the total mechanical energy remains constant, even though its form changes. When air resistance is significant, some of the falling object’s mechanical energy is transferred to the surrounding air and other forms such as thermal energy. The conservation of energy principle still holds when these transfers to the wider system are included. Energy is transferred or transformed, not created from nothing.',
 points:['Gravitational potential energy decreases','Kinetic energy increases as object falls','Ideal mechanical energy conservation','Air resistance transfers energy to surroundings','Total energy conserved in broader system']},
'IX-PHY-2025-C06-L01':{
 answer:'Pressure is force per unit area, so the average pressure caused by a perpendicular force can be written P = F/A. In an enclosed nearly incompressible liquid, a pressure change applied at one region is transmitted throughout the liquid; this is the principle expressed by Pascal’s law. In the idealized hydraulic model, equal pressure changes across pistons of different areas can correspond to different forces because F = PA. The greater force at a larger piston does not mean energy is created: that piston moves through a correspondingly smaller distance in an ideal arrangement. Hydraulic brakes and lifting systems make use of transmitted fluid pressure, subject to practical losses and safety constraints.',
 points:['Pressure defined as force divided by area','Pascal’s law for confined fluids','Same transmitted pressure change','Different areas give different forces','Hydraulic applications and energy conservation']},
'IX-PHY-2025-C07-L01':{
 answer:'Particles in solids are closely arranged and generally vibrate around relatively fixed positions because intermolecular interactions resist changes in arrangement. Particles in liquids also remain close but can move past one another, allowing the liquid to flow. Gas particles are usually much farther apart and move throughout the available space, making gases comparatively easy to compress. Increasing temperature generally increases average particle kinetic energy and can lead to expansion. During melting or boiling of a pure substance, energy helps change intermolecular arrangements and the temperature may remain steady while the phase change takes place.',
 points:['Solid particle organization and vibration','Liquid mobility and flow','Gas separation, free motion and compressibility','Heating increases average kinetic energy','Expansion and phase-change energy']},
'IX-PHY-2025-C08-L01':{
 answer:'A magnetic field can be represented by field lines that show its local direction and relative strength. Outside a bar magnet, the direction is conventionally shown from the north pole toward the south pole, with curved patterns continuing around the magnet. Field lines are closer together in regions where the field is stronger, commonly near the poles. An electromagnet produces a magnetic field associated with electric current in a coil rather than relying only on permanent magnetization. In a basic conceptual model, field strength depends on the coil current, number of turns and magnetic properties of its core. These relationships are scientific principles, not instructions for building or operating electrical apparatus.',
 points:['Magnetic field-line direction','Curved pattern around magnet poles','Spacing represents relative field strength','Current and coil-turn dependence of electromagnetism','Influence of a suitable magnetic core']},
'IX-PHY-2025-C08-L02':{
 answer:'A permanent magnet retains useful magnetization without an external electrical supply, while an electromagnet produces a controllable field associated with an electric current. Many permanent magnets use materials that resist losing their magnetization; electromagnets often involve coils and a magnetic core whose field can change as operating conditions change. Permanent magnets can be found in refrigerator-door seals and magnetic compass needles. Electromagnets are used in many relays and industrial lifting systems, where controlled magnetic action is useful. The two types differ especially in whether their field can readily be switched or adjusted, not in whether both create magnetic forces.',
 points:['Permanent magnet retains a field without power','Electromagnetic field depends on current and is controllable','Mention relevant magnetic material/core distinctions','Give two valid permanent-magnet applications','Give two valid electromagnet applications']},
'IX-PHY-2025-C09-L01':{
 answer:'Science develops explanations about the natural world by collecting evidence, testing ideas and comparing predictions with observations. Technology applies scientific understanding and practical design to solve problems and make useful devices. The relationship works in both directions: scientific discoveries can enable new tools, while improved technology makes new measurements and experiments possible. For example, better optical instruments helped scientists observe cells in increasing detail, generating new biological questions. Practical applications can also expose limits in an explanation and motivate new research. Science and technology therefore develop through continuous feedback rather than following a one-way path.',
 points:['Science builds evidence-based explanations','Technology applies knowledge to problems','Scientific discoveries enable technological innovation','New instruments enable further science','A specific two-way example']},
'IX-PHY-2025-C09-L02':{
 answer:'A sound scientific investigation begins with a clearly defined question about something observable or measurable. A testable hypothesis provides a provisional explanation from which specific predictions can be derived. Researchers choose a method that controls relevant variables where feasible and records measurements systematically, with attention to fair comparisons and uncertainty. Results are organized and analysed to determine whether they support or challenge the original prediction. The conclusion should describe the evidence and important limitations rather than claiming more than the data show. Explaining the method and reporting results allows others to check or repeat the investigation.',
 points:['Clear research question','Testable hypothesis and predictions','Controlled method and systematic measurements','Analysis and appropriately limited conclusion','Communication and reproducibility']}
})
function build({bytes,source,registry}){
 if(!Buffer.isBuffer(bytes)||sha(bytes)!==ORIGINAL_SHA)throw Error('PHY9_SOURCE_SNAPSHOT_CHANGED')
 let stored
 try{stored=JSON.parse(bytes)}catch(_){throw Error('PHY9_SOURCE_SNAPSHOT_CHANGED')}
 if(JSON.stringify(stored)!==JSON.stringify(source))throw Error('PHY9_SOURCE_SNAPSHOT_CHANGED')
 if(!Array.isArray(source?.drafts)||source.drafts.length!==54||
    source.publicationAllowed!==false||source.liveImportAllowed!==false)
  throw Error('PHY9_UNEXPECTED_SOURCE_STATUS')
 const src=registry?.entries?.find(x=>x.recordId===source.sourceRecordId)
 if(!src||Number(src.grade)!==9||String(src.subject).toLowerCase()!=='physics'||
    String(src.medium).toLowerCase()!=='english'||src.pdfSha256!==source.sourcePdfSha256)
  throw Error('PHY9_SOURCE_CATALOG_DRIFT')
 const longs=source.drafts.filter(q=>q.type==='long')
 if(longs.length!==11||Object.keys(ANSWERS).length!==11)
  throw Error('PHY9_EXPECTED_11_LONG_QUESTIONS')
 const seen=new Set()
 const items=longs.map(q=>{
  if(!q.id||seen.has(q.id)||!ANSWERS[q.id])throw Error('PHY9_ID_COVERAGE_OR_DUPLICATE')
  seen.add(q.id)
  if(q.marks!==5||q.source?.catalogRecordId!==src.recordId||
     q.source?.pdfSha256!==src.pdfSha256||
     !rubricOnlyLongAnswer(q.type,q.content?.en?.answer))
   throw Error('PHY9_ORIGINAL_NOT_RUBRIC_ONLY:'+q.id)
  const p=ANSWERS[q.id]
  if(typeof p.answer!=='string'||p.answer.length<180||
     rubricOnlyLongAnswer('long',p.answer)||
     !Array.isArray(p.points)||p.points.length!==5||
     new Set(p.points).size!==5||
     p.points.some(v=>typeof v!=='string'||v.length<13))
   throw Error('PHY9_ANSWER_PROPOSAL_INCOMPLETE:'+q.id)
  return {
   questionId:q.id,chapterNo:q.chapter?.number,topicId:q.topicId,marks:5,
   originalQuestionSha256:sha(JSON.stringify(q)),originalAnswerSha256:sha(q.content.en.answer),
   originalSourceFileSha256:ORIGINAL_SHA,canonicalSourceRecordId:src.recordId,
   declaredPdfSourceSha256:src.pdfSha256,originalQuestionAnswerUnmodified:true,
   proposedEnglishModelAnswer:p.answer,proposedSeparateMarkingPoints:p.points,
   teacherScientificAnswerVerified:false,schoolEditionAndPhysicalPageVerified:false,
   independentEnglishUrduEquivalenceReviewed:false,independentReviewerId:null,
   approvedQuestionRevisionId:null,academicallyApproved:false,published:false,
   status:'AUTHOR_DRAFT_AWAITING_INDEPENDENT_PHYSICS_IX_REVIEW'
  }
 })
 return {
  schemaVersion:'assps-physics9-eleven-original-long-answer-proposals-v1',
  scope:'NEW_RESEARCH_ANSWER_PROPOSALS_NOT_APPROVED_OR_SELECTABLE',
  originalSourceFile:'physics9EnglishStarter2026.json',
  originalSourceFileSha256:ORIGINAL_SHA,canonicalSourceRecordId:src.recordId,
  declaredCatalogPdfSha256:src.pdfSha256,originalResearchQuestionCount:source.drafts.length,
  originalLongRubricOnlyCount:longs.length,newSeparateAnswerDrafts:items.length,
  newSeparateMarkingCriteria:items.length*5,
  qualifiedScientificHumanReviewed:0,schoolTextbookPrintedPageVerified:0,
  academicApproved:0,academicallyPublished:0,
  caveats:[
   'Independent English explanatory drafts are NOT teacher verified or official textbook answer keys.',
   'Catalog PDF identity does not establish actual ASSPS textbook adoption or verified printed/PDF page.',
   'Original question and grading-only answer fields remain unchanged.',
  ],items
 }
}
function markdown(d){
 return [
  '# ASSPS Grade IX Physics — 11 original explanatory long-answer draft proposals','',
  '**Independently authored English research candidates only. No independent subject review or source certification.**','',
  `Original source: ${d.originalResearchQuestionCount} provisional questions, ${d.originalLongRubricOnlyCount} rubric-only long answers. New independent drafts: ${d.newSeparateAnswerDrafts}, plus ${d.newSeparateMarkingCriteria} separate marking-point proposals. Exact original file SHA-256: \`${d.originalSourceFileSha256}\`.`,'',
  ...d.items.flatMap(x=>[
   `### ${x.questionId} — Chapter ${x.chapterNo}, ${x.topicId}`,'',
   x.proposedEnglishModelAnswer,'',
   '**Separate proposed marking points:** '+x.proposedSeparateMarkingPoints.join(' · '),''
  ]),
  '## Mandatory independent faculty assessment','',
  '1. Verify ASSPS-approved Physics IX textbook title, printed edition, actual academic session, board examination year and medium.',
  '2. Match every original question to authentic printed textbook chapter/exercise and physical PDF page, with independent source reviewer evidence.',
  '3. Qualified Physics faculty checks these eleven explanations and five-point mark schemes for answer correctness and question-specific completeness.',
  '4. Seek independent Urdu equivalence where relevant, revise with a new immutable question revision and separate academic review.',
  '5. Paper Studio verified Question Bank remains EMPTY until real approval and SaaS Core tenant/RLS production certification.',
  '', '**Independent verified 0 · academically approved 0 · published 0 · production HOLD.**',''
 ].join('\n')
}
function main(){
 const bytes=fs.readFileSync(SRC),source=JSON.parse(bytes)
 const registry=JSON.parse(fs.readFileSync(REG))
 const d=build({bytes,source,registry})
 fs.writeFileSync(path.join(OUT,'ASSPS_PHYSICS9_ELEVEN_LONG_MODEL_ANSWER_DRAFTS_20261009.json'),JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(path.join(OUT,'ASSPS_PHYSICS9_ELEVEN_LONG_MODEL_ANSWER_DRAFTS_20261009.md'),markdown(d))
 console.log(JSON.stringify({originalQuestions:d.originalResearchQuestionCount,originalLong:d.originalLongRubricOnlyCount,authored:d.newSeparateAnswerDrafts,criteria:d.newSeparateMarkingCriteria,approved:d.academicApproved}))
}
if(require.main===module)main()
module.exports={build,markdown,ANSWERS,ORIGINAL_SHA}
