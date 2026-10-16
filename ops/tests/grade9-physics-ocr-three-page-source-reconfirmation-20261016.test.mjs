import test from 'node:test';
import assert from 'node:assert/strict';
import {phraseOccurrences,validateReceipt} from '../qbank/verify-grade9-physics-single-ocr-stem-adjacent-pages-20261016.mjs';
const stem='Differentiate between base and derived physical quantities.';
function receipt(){
 return {
  schema:'ASSPS_GRADE9_PHYSICS_THREE_PDF_PAGES_UNAPPROVED_OCR_SECOND_PASS_V1',
  candidateQuestionId:'IX-PHY-2025-C01-S01',
  sourceCatalogId:'pectaa-catalog-011',
  immutablePDFSHA256:'a77c9b5fd12e35de2a08390c2b93d10a59fa94fb4603e3349908e75c6b189794',
  originalFrozenResearchFileSHA256:'1a882970fc2548f50bc001691d6de990ce156690cfa252f3f5355d8d63a6dc16',
  exactCurrentLiveQuestionRevisionSHA256:'a'.repeat(64),
  originalStemSHA256:'b'.repeat(64),
  sourcePDFPhysicalPages:204,claimedPDFPhysicalPage:5,
  independentPagesChecked:3,checkedPhysicalPDFPages:[4,5,6],
  pageEvidence:[4,5,6].map((physicalPDFPage,i)=>({
   physicalPDFPage,ocrRecognizedWords:254,ocrAverageConfidence:90.9,
   exactNormalizedPhraseOccurrences:i===1?1:0,
   reliability:'READABLE_OCR_RESEARCH_ONLY',rawPageTextPersisted:false
  })),
  claimedPageStrictExactMatchResearchEvidence:true,
  sourceSchoolAdoptedEditionVerified:false,
  curriculumAcademicSessionApplicabilityVerified:false,
  officialBookPrintedExercisePageVerified:false,
  independentPhysicsTeacherAuthenticated:false,
  academicQuestionAnswerApproved:false,
  paperStudioVerifiedSelectable:false,
  rawCopyrightedPageTextPersisted:false,
  productionDatabaseWrites:0
 };
}
test('exact three-page research ledger accepted without approval',()=>{
 const r=validateReceipt(receipt());
 assert.equal(r.pageEvidence[1].exactNormalizedPhraseOccurrences,1);
 assert.equal(r.officialBookPrintedExercisePageVerified,false);
});
test('punctuation/case robust exact phrase, not topic-only synonym',()=>{
 assert.equal(phraseOccurrences('DIFFERENTIATE between base and derived physical quantities!',stem),1);
 assert.equal(phraseOccurrences('Describe how fundamental and composite quantities differ.',stem),0);
});
test('OCR-only exact phrase matching respects full word boundaries',()=>{
 assert.equal(phraseOccurrences('unDifferentiate between base and derived physical quantities',stem),0);
 assert.equal(phraseOccurrences('Differentiate between base and derived physical quantitiesPlus',stem),0);
});
test('repeated exact phrase counted accurately',()=>{
 assert.equal(phraseOccurrences(stem+' '+stem,stem),2);
});
test('too short or ambiguous stem cannot obtain exact evidence',()=>{
 assert.throws(()=>phraseOccurrences('A base quantity','base'),/INSUFFICIENT_PHRASE/);
});
test('page 5 status agrees with independent findings',()=>{
 const r=receipt();r.claimedPageStrictExactMatchResearchEvidence=false;
 assert.throws(()=>validateReceipt(r),/STATUS_INCONSISTENT/);
});
test('wrong original PDF fingerprint denied',()=>{
 const r=receipt();r.immutablePDFSHA256='0'.repeat(64);
 assert.throws(()=>validateReceipt(r),/CANNOT_BECOME_ACADEMIC_APPROVAL/);
});
test('book adoption cannot be changed by OCR score',()=>{
 const r=receipt();r.sourceSchoolAdoptedEditionVerified=true;
 assert.throws(()=>validateReceipt(r),/CANNOT_BECOME_ACADEMIC_APPROVAL/);
});
test('teacher review cannot arise from one OCR phrase',()=>{
 const r=receipt();r.independentPhysicsTeacherAuthenticated=true;
 assert.throws(()=>validateReceipt(r),/CANNOT_BECOME_ACADEMIC_APPROVAL/);
});
test('copyrighted OCR text never stored',()=>{
 const r=receipt();r.rawOCRText='copied scientific book excerpt';
 assert.throws(()=>validateReceipt(r),/PRIVATE_RECEIPT_MUST_HAVE_EXACT_FIELDS/);
});
test('page evidence cannot include textbook words',()=>{
 const r=receipt();r.pageEvidence[1].questionStemText=stem;
 assert.throws(()=>validateReceipt(r),/NO_RAW_TEXT_AND_ONLY_PAGE_METADATA/);
});
test('duplicate physical pages rejected',()=>{
 const r=receipt();r.pageEvidence[2].physicalPDFPage=5;
 assert.throws(()=>validateReceipt(r),/DUPLICATE_PAGE/);
});
test('cannot publish Paper Studio verified question from research',()=>{
 const r=receipt();r.paperStudioVerifiedSelectable=true;
 assert.throws(()=>validateReceipt(r),/CANNOT_BECOME_ACADEMIC_APPROVAL/);
});
test('cannot mark printed exercise question page verified',()=>{
 const r=receipt();r.officialBookPrintedExercisePageVerified=true;
 assert.throws(()=>validateReceipt(r),/CANNOT_BECOME_ACADEMIC_APPROVAL/);
});
test('static audit receipt contains no raw textbook source',()=>{
 const out=JSON.stringify(receipt());
 assert.equal(out.includes(stem),false);
 assert.equal(out.includes('rawOCRText'),false);
});
