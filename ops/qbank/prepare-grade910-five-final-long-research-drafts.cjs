#!/usr/bin/env node
'use strict'
// Non-operational Chemistry long-answer research notes and protected faculty-only gap.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const originals=require('./attest-grade910-all-original-candidate-revisions.cjs')
const routing=require('./attest-grade910-final-five-review-routing.cjs')
const ROOT=path.resolve(__dirname,'../..')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_FIVE_LAST_ORIGINAL_LONG_UNAPPROVED_ANSWER_DRAFTS_20261011.json')
const PREV=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_161_DISTINCT_UNAPPROVED_ANSWER_PROPOSALS_20261009.json')
const sha=value=>crypto.createHash('sha256').update(value).digest('hex')
const draftById=Object.freeze({
 'IX-CHEM-2025-C11-T4-01L':{
  explanation:'Alkanes are saturated hydrocarbons. Combustion is a reaction with oxygen that produces carbon dioxide and water in the complete case, and releases energy. A symbolic balanced example for methane is CH4 + 2 O2 -> CO2 + 2 H2O. Substitution is a different reaction class, where a hydrogen on an alkane framework can be replaced by another atom or group. Combustion generates oxidation products, while substitution yields a substituted organic derivative. This is a theoretical distinction and does not describe performing any reaction.',
  points:['Recognize alkanes as saturated hydrocarbons and identify two different reaction classes',
   'Explain carbon dioxide and water as products of complete combustion',
   'Give a correct balanced symbolic example for methane combustion',
   'Describe substitution conceptually as replacement of an alkane hydrogen',
   'Contrast combustion products with a substituted hydrocarbon derivative']},
 'IX-CHEM-2025-C11-T4-02L':{
  explanation:'An unsaturated hydrocarbon has a carbon-carbon double or triple bond, whereas an alkane contains only single carbon-carbon bonds. Adding hydrogen across an alkene double bond can produce a saturated hydrocarbon; the relationship can be represented by the balanced theoretical expression C2H4 + H2 -> C2H6. The broad name of the transformation is hydrogenation. Industrial chemical reactions of this family are commonly discussed in relation to catalysis, without the catalyst becoming a net product. The carbon skeleton is retained as unsaturation decreases. These are textbook concepts, not experimental directions.',
  points:['Differentiate unsaturated multiple bonding from alkane single-bond structures',
   'Identify the alkene-to-alkane hydrogen-addition reaction category',
   'Write the theoretical balanced ethene-to-ethane relationship',
   'Recognize the concept of catalysis without procedural details',
   'Relate reduction in bond unsaturation to saturated product classification']},
 'X-CHEM-C18-L01':{
  explanation:'A soluble salt dissolves appreciably in water, while an insoluble salt has low water solubility. A neutralization reaction between an acid and a suitable base can be discussed as one general conceptual source of dissolved salt and water. A soluble salt is associated with an aqueous phase, while the formation of an insoluble salt may be understood through precipitation of ions from solution. The separation principles differ: a dissolved substance is distinct from a precipitated solid. Choice of a salt classification must be justified by its actual solubility rather than its name. This is a comparison of chemical principles, not directions for carrying out laboratory preparations.',
  points:['Distinguish soluble from insoluble salts by aqueous solubility',
   'Recognize neutralization as a class of salt-forming reaction',
   'Identify the meaning of a dissolved salt in an aqueous phase',
   'Recognize precipitation as a class of insoluble-salt formation',
   'Differentiate a precipitated solid from a dissolved product conceptually']},
 'X-CHEM-C23-L01':{
  explanation:null,points:[],teacherHeld:true},
 'X-CHEM-C24-L01':{
  explanation:'Carboxylic acids contain the carboxyl (-COOH) functional group and show characteristic acid reactions. In a theoretical reaction with an appropriately reactive metal, an acid may form a salt while producing hydrogen gas. Acid-base neutralization yields a salt and water. Reactions with carbonates are recognized through the general products salt, water and carbon dioxide. Carboxylic acids are also discussed in organic chemistry as one reactant family involved in ester formation with alcohols. These are broad product classifications, not practical instructions for using chemicals.',
  points:['Identify the carboxyl functional group and typical acid behavior',
   'State conceptual salt and hydrogen formation with an appropriate metal',
   'Identify salt and water as neutralization products',
   'Identify salt, water and carbon dioxide as the carbonate reaction products',
   'Recognize ester formation as a broad organic reaction category']}
})
function build(){
 const inputs=originals.loadInputs(),frozen=originals.assertFrozen(inputs)
 const prior=JSON.parse(fs.readFileSync(PREV,'utf8'))
 const routes=routing.assertPinned(routing.loadInputs())
 if(prior.distinctOriginalIdsWithSeparateAnswerDrafts!==161||
  prior.originalRubricOnlyIdsWithoutNewAnswerDraft!==5||prior.academicallyApproved!==0||
  !Array.isArray(prior.remainingOriginalQuestionIds)||prior.remainingOriginalQuestionIds.length!==5||
  routes.totalOriginalReviewRequests!==5||routes.academicApproved!==0||routes.verifiedPublished!==0)
  throw Error('PREVIOUS_161_FACULTY_HANDOFF_DRIFT')
 const files=new Map(frozen.files.map(f=>[f.originalAuthoredFile,f]))
 const documents=new Map(inputs.documents.map(d=>[d.file,d.data]))
 const rows=[],seen=new Set()
 for(const route of routes.reviewerRoutes){
  const id=route.questionId
  if(!Object.hasOwn(draftById,id)||seen.has(id)||!prior.remainingOriginalQuestionIds.includes(id))
   throw Error('LAST_FIVE_ORIGINAL_ID_DRIFT')
  seen.add(id)
  const file=files.get(route.originalSourceFile),doc=documents.get(route.originalSourceFile)
  if(!file||!doc||file.originalFileSha256!==route.originalSourceFileSha256)
   throw Error('LAST_FIVE_SOURCE_FILE_SHA_DRIFT')
  const q=(doc.drafts||[]).find(x=>x.id===id)
  const rev=file.originalQuestionRevisions.find(x=>x.originalQuestionId===id)
  if(!q||!rev||rev.originalQuestionRevisionSha256!==route.originalQuestionRevisionSha256||
   q.type!=='long'||q.marks!==5||q.curriculum?.grade!==route.grade||
   q.curriculum?.subjectId!=='chemistry'||
   q.source?.catalogRecordId!==route.sourceCatalogId||
   q.source?.pdfSha256!==route.catalogPdfSha256Claim)
   throw Error('LAST_FIVE_FROZEN_SOURCE_REVISION_DRIFT')
  const d=draftById[id]
  if(d.teacherHeld){
   if(d.explanation!==null||d.points.length!==0)
    throw Error('QUALIFIED_TEACHER_HELD_SLOT_MUST_HAVE_NO_NEW_ANSWER_CONTENT')
  }else if(d.points.length!==5||new Set(d.points).size!==5||
   d.points.some(x=>x.length<30)||d.explanation.length<250)
    throw Error('INDEPENDENT_CONCEPTUAL_RESEARCH_INCOMPLETE')
  rows.push({originalQuestionId:id,grade:route.grade,subject:'Chemistry',
   originalMedium:'English',chapter:q.chapter?.number??null,topicId:q.topicId,
   originalQuestionRevisionSha256:rev.originalQuestionRevisionSha256,
   originalSourceFile:route.originalSourceFile,originalSourceFileSha256:file.originalFileSha256,
   sourceCatalogRecordId:route.sourceCatalogId,claimedSourcePdfSha256:route.catalogPdfSha256Claim,
   sourcePageClaimUnverified:q.source?.page??null,originalExerciseRef:q.source?.exerciseRef??null,
   proposedConceptualExplanation:d.explanation,proposedFiveMarkCriteria:d.points,
   proposedMarks:5,supplementalResearchAuthored:!d.teacherHeld,
   requiresQualifiedSubjectFacultyCompletion:!!d.teacherHeld,
   researchAnswerRevisionSha256:d.teacherHeld?null:sha(JSON.stringify({id,explanation:d.explanation,points:d.points})),
   realSchoolTextbookAdoptionVerified:false,printedExerciseProofVerified:false,
   independentScientificAnswerReviewed:false,academicApprovalAuthenticated:false,
   published:false,publisherSelectable:false,
   decision:'RESEARCH_HOLD_NO_PUBLISH'})
 }
 if(rows.length!==5||seen.size!==5||rows.filter(x=>x.supplementalResearchAuthored).length!==4)
  throw Error('LAST_FIVE_COVERAGE_COUNT_DRIFT')
 return {schemaVersion:'assps-grade910-last-five-original-editorial-research-v1',
  priorUnapprovedAnswerResearchOriginalIds:161,
  lastFiveOriginalIdsAddressedInReviewerDocket:5,
  newSupplementalConceptualDrafts:4,facultyHeldWithoutAnswerText:1,
  combinedOriginalIdsWithSomeSupplementalResearch:165,
  originalQuestionCandidatesPreserved:2581,originalRubricOnlyLongCandidatesPreserved:166,
  authenticatedIndependentApprovals:0,academicallyApproved:0,verifiedPublished:0,
  productionImportPermitted:false,publisherSelectable:false,
  caveat:'No chemical operating procedures. One original answer slot deliberately left for a qualified faculty reviewer. Conceptual research is not an approved answer key, book adoption, exercise page verification or a Paper Studio publication snapshot.',
  rows}
}
if(require.main===module){
 const j=build()
 if(process.argv.includes('--write'))fs.writeFileSync(OUT,JSON.stringify(j,null,2)+'\n')
 console.log(JSON.stringify({newDrafts:j.newSupplementalConceptualDrafts,held:j.facultyHeldWithoutAnswerText,combined:j.combinedOriginalIdsWithSomeSupplementalResearch,approved:j.academicallyApproved}))
}
module.exports={build,OUT}
