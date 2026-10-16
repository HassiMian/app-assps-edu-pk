import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTsv,normalize,judgeStem,validateReceipt} from '../qbank/verify-grade10-health-tech-one-excluded-page-bilingual-ocr-20261016.mjs';
const IDS=['X-HS-TECH-C17-L01','X-HS-TECH-C17-M01','X-HS-TECH-C17-S01'];
function build(){
 return {
 schema:'ASSPS_C054_PAGE102_BILINGUAL_OCR_RESEARCH_ONLY_V1',
 grade:10,catalog:'pectaa-catalog-054',page:102,
 originalPDFSHA256:'f69e2553dc39f30fc2f76bda87934cd927c45a5b12e7c8e6305f6ccc6e3aa906',
 originalFrozenQuestionFileSHA256:'544e7b9b1dfc157e9b1199606bf5a84d52120534d993b1249f9064c403244a74',
 mediumNotEstablishedByOfficialCatalog:true,pdfPageCount:123,languagesTried:['eng','urd'],
 results:IDS.map(questionId=>({
  questionId,currentLiveQuestionRevisionSHA256:'a'.repeat(64),
  originalQuestionStemSHA256:'b'.repeat(64),
  languageDiagnostics:{eng:{tokenCount:0,meanConfidence:0,substantialExactStemResearchCandidate:false,reliability:'OCR_NOT_RELIABLE_FOR_EXACT_STEM'},urd:{tokenCount:0,meanConfidence:0,substantialExactStemResearchCandidate:false,reliability:'OCR_NOT_RELIABLE_FOR_EXACT_STEM'}},
  verifiedQuestionAnswerPage:false,teacherApproved:false,paperStudioVerifiedSelectable:false
 })),
 officialSchoolStreamAdoptionVerified:false,officialSchoolTextbookEditionVerified:false,
 independentlyVerifiedPrintedQuestionPage:false,authenticatedQualifiedReviewers:0,
 academicApprovedQuestions:0,publishedQuestions:0,productionDatabaseWrites:0,
 rawTextOrPDFImagesPersisted:false
 };
}
test('all three excluded original School 1 page claims are only research',()=>{
 assert.equal(validateReceipt(build()).results.length,3);
});
test('missing one source ID is invalid',()=>{
 const x=build();x.results.pop();
 assert.throws(()=>validateReceipt(x),/CANNOT_IMPERSONATE_ACADEMIC_APPROVAL/);
});
test('fake subject specialist approval denied',()=>{
 const x=build();x.results[0].teacherApproved=true;
 assert.throws(()=>validateReceipt(x),/CANNOT_IMPERSONATE_ACADEMIC_APPROVAL/);
});
test('fake printed page proof denied',()=>{
 const x=build();x.independentlyVerifiedPrintedQuestionPage=true;
 assert.throws(()=>validateReceipt(x),/CANNOT_IMPERSONATE_ACADEMIC_APPROVAL/);
});
test('wrong claimed immutable official pdf hash denied',()=>{
 const x=build();x.originalPDFSHA256='0'.repeat(64);
 assert.throws(()=>validateReceipt(x),/CANNOT_IMPERSONATE_ACADEMIC_APPROVAL/);
});
test('raw copyrighted textbook OCR text cannot be put in metadata receipt',()=>{
 const x=build();x.results[1].ocrText='copied textbook paragraph';
 assert.throws(()=>validateReceipt(x),/BILINGUAL_OCR_QUESTION_FIELDS_NOT_PRIVATE_METADATA_ONLY/);
});
test('nonzero database writes and Paper Studio publication refused',()=>{
 const x=build();x.productionDatabaseWrites=1;
 assert.throws(()=>validateReceipt(x),/CANNOT_IMPERSONATE_ACADEMIC_APPROVAL/);
 x.productionDatabaseWrites=0;x.results[0].paperStudioVerifiedSelectable=true;
 assert.throws(()=>validateReceipt(x),/CANNOT_IMPERSONATE_ACADEMIC_APPROVAL/);
});
test('duplicate claims cannot masquerade as three distinct questions',()=>{
 const x=build();x.results[1].questionId=x.results[0].questionId;
 assert.throws(()=>validateReceipt(x),/CANNOT_IMPERSONATE_ACADEMIC_APPROVAL/);
});
test('short multiple choice stem is never a proven source page',()=>{
 assert.equal(judgeStem('', 'Which is a core life skill?').substantialExactStemResearchCandidate,false);
});
test('language neutral normalization removes diacritics safely',()=>{
 assert.equal(normalize('تَجْرِبہ کی  مثال'),normalize('تجربہ کی مثال'));
});
test('tesseract tsv parser rejects header/negative/confidence garbage',()=>{
 const ts=['level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext',
 '5\t1\t1\t1\t1\t1\t0\t0\t1\t1\t96\tSchool',
 '5\t1\t1\t1\t1\t2\t0\t0\t1\t1\t-1\t',
 '5\t1\t1\t1\t1\t3\t0\t0\t1\t1\t90\tHealth'].join('\n');
 const x=parseTsv(ts);
 assert.equal(x.tokenCount,2);assert.equal(x.meanConfidence,93);
});
test('only two verified language diagnostic slots permitted for each distinct source id',()=>{
 const x=build();delete x.results[0].languageDiagnostics.urd;
 assert.throws(()=>validateReceipt(x),/BILINGUAL_OCR_QUESTION_FIELDS_NOT_PRIVATE_METADATA_ONLY/);
});
