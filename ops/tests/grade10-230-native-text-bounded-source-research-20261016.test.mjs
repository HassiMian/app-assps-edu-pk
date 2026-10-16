import test from 'node:test';
import assert from 'node:assert/strict';
import {norm,exactPhrase,classify,validateReceipt} from '../qbank/verify-grade10-230-short-native-source-page-window-20261016.mjs';
const COUNTS={
 'pectaa-recovered-chemistry10-en-2026':65,
 'pectaa-catalog-017':60,'pectaa-catalog-057':30,'pectaa-catalog-049':27,
 'pectaa-catalog-054':24,'pectaa-catalog-062':24};
function receipt(){
 const rows=[];
 for(const [id,count] of Object.entries(COUNTS)){
  for(let i=0;i<count;i++){
   const short=rows.length<106;
   rows.push({
     questionId:'X-TEST-NATIVE-CLAIM-'+String(rows.length).padStart(4,'0'),
     grade:10,sourceCatalogId:id,originalClaimedPhysicalPDFPage:2,
     currentLiveRevisionSHA256:'a'.repeat(64),frozenOriginalStemSHA256:'b'.repeat(64),
     reason:short?'SHORT_STEM_NEEDS_EXERCISE_REVIEW':'TEXT_LAYER_READABLE_NO_EXACT_STEM',
     fullStemSafeForExactPhrase:!short,
     checkedPhysicalPages:[1,2,3],
     claimedPhysicalPageExactPhraseOccurrences:0,neighboringPhysicalPageExactPhraseOccurrences:0,
     claimedPDFPhysicalPageNativeTextReadable:true,
     evidenceDisposition:short?'SHORT_OR_AMBIGUOUS_STEM_NOT_PROVEN':
       'READABLE_NATIVE_TEXT_NO_EXACT_STEM_IN_BOUNDED_WINDOW',
     authenticASSPSBookAdoptionProven:false,academicallyVerifiedPrintedExercisePage:false,
     academicReviewerAuthenticated:false,paperStudioSelectable:false
   });
  }
 }
 return {schema:'ASSPS_GRADE10_230_SHORT_NATIVE_SOURCE_PAGE_BOUNDED_V1',
   scopedExistingClaims:230,originalNativeTextNotVerifiedClaims:124,
   originalShortAmbiguousClaims:106,numberOfOriginalSourcePDFs:6,
   numberOfOriginalSourcePhysicalClaimPages:49,examinedWindowRadiusInPhysicalPDFPages:1,
   pdfs:Object.keys(COUNTS).map(id=>({sourceCatalogId:id,
     sourcePDFSHA256:'a'.repeat(64),physicalPDFPages:150,
     originalOfficialCatalogMedium:'English',uniquePhysicalPagesNativeTextChecked:3,
     pagesWithInsufficientNativeText:0})),
   rows,dispositionCounts:{SHORT_OR_AMBIGUOUS_STEM_NOT_PROVEN:106,
     READABLE_NATIVE_TEXT_NO_EXACT_STEM_IN_BOUNDED_WINDOW:124},
   asspsAdoptedBookEditionVerified:false,independentlyVerifiedExactExercisePageClaims:0,
   qualifiedSubjectOrUrduAcademicReviews:0,academicallyApprovedQuestions:0,
   paperStudioVerifiedSelectableQuestions:0,productionDatabaseWrites:0,
   originalQuestionsAndTextbookExtractsPersisted:false};
}
test('230 original claims remain research-only despite 6 readable sources',()=>{
 let x=validateReceipt(receipt());
 assert.equal(x.rows.length,230);
 assert.equal(x.independentlyVerifiedExactExercisePageClaims,0);
});
test('full phrase requires sufficient context and word boundaries',()=>{
 const p='Explain the mathematical role of the quadratic discriminant.';
 assert.deepEqual(exactPhrase(p,p),{eligible:true,matches:1});
 assert.equal(exactPhrase('unExplain the mathematical role of the quadratic discriminantExtra',p).matches,0);
 assert.equal(exactPhrase('What is it?','What is it?').eligible,false);
});
test('short ambiguous original stems cannot be evidence',()=>{
 assert.equal(classify(3,1,false),'SHORT_OR_AMBIGUOUS_STEM_NOT_PROVEN');
 assert.equal(classify(0,0,true),'READABLE_NATIVE_TEXT_NO_EXACT_STEM_IN_BOUNDED_WINDOW');
});
test('research-only phrases on claimed PDF page cannot be approved',()=>{
 assert.equal(classify(1,0,true),'EXACT_NATIVE_TEXT_ON_CLAIMED_PHYSICAL_PAGE_RESEARCH_ONLY');
 assert.equal(classify(0,1,true),'ONLY_ADJACENT_PHYSICAL_PAGE_TEXT_RESEARCH_ONLY');
});
test('no unauthorized production writes',()=>{
 const x=receipt();x.productionDatabaseWrites=1;
 assert.throws(()=>validateReceipt(x),/MUST_REMAIN_UNAPPROVED/);
});
test('teacher/Urdu independent review cannot be inferred',()=>{
 const x=receipt();x.qualifiedSubjectOrUrduAcademicReviews=1;
 assert.throws(()=>validateReceipt(x),/MUST_REMAIN_UNAPPROVED/);
});
test('no imported verified papers',()=>{
 const x=receipt();x.paperStudioVerifiedSelectableQuestions=1;
 assert.throws(()=>validateReceipt(x),/MUST_REMAIN_UNAPPROVED/);
});
test('altered source-book groups not silently trusted',()=>{
 const x=receipt();x.rows[0].sourceCatalogId='wrong';
 assert.throws(()=>validateReceipt(x),/MUST_REMAIN_UNAPPROVED|SOURCE_CATALOG_COUNTS_CHANGED/);
});
test('duplicate original question IDs not tolerated',()=>{
 const x=receipt();x.rows[0].questionId=x.rows[1].questionId;
 assert.throws(()=>validateReceipt(x),/MUST_REMAIN_UNAPPROVED/);
});
test('106 short source questions never become exercise evidence',()=>{
 const x=receipt();x.rows[0].evidenceDisposition='EXACT_NATIVE_TEXT_ON_CLAIMED_PHYSICAL_PAGE_RESEARCH_ONLY';
 assert.throws(()=>validateReceipt(x),/SHORT_106_CANNOT_BECOME_VERIFIED_EXERCISE/);
});
test('source query proof must not include raw book text',()=>{
 const x=receipt();x.rows[0].rawPageText='copyrighted PDF original prose';
 assert.throws(()=>validateReceipt(x),/MUST_REMAIN_UNAPPROVED/);
});
test('no success if one of 230 row receipts is dropped',()=>{
 const x=receipt();x.rows.pop();
 assert.throws(()=>validateReceipt(x),/MUST_REMAIN_UNAPPROVED/);
});
test('no success if 6-source counts drift even with total intact',()=>{
 const x=receipt();x.rows[0].sourceCatalogId='pectaa-catalog-062';
 assert.throws(()=>validateReceipt(x),/SOURCE_CATALOG_COUNTS_CHANGED/);
});
test('no approved printed exercises from verified native PDF text',()=>{
 const x=receipt();x.independentlyVerifiedExactExercisePageClaims=1;
 assert.throws(()=>validateReceipt(x),/MUST_REMAIN_UNAPPROVED/);
});
