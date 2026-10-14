import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const j=JSON.parse(readFileSync(new URL('./boardPaperFirstAuthoringPolicy.json',import.meta.url),'utf8'));
test('parent is exact full goal architecture checkpoint',()=>assert.equal(j.parentCommit,'dad7a2f07391220eccd32786328c33f4ada34edc'));
test('board pattern and book content separated from ASSPS editor layout',()=>{
 assert.match(j.coreSeparation.pastPaper,/STRUCTURE/);
 assert.match(j.coreSeparation.currentOfficialTextbook,/ORIGINAL_QUESTION_CONTENT/);
 assert.match(j.coreSeparation.asspsEditor,/EXISTING_PAPER_DOCUMENT/);
});
test('mandatory paper-first applies to all subjects including language',()=>{
 assert.equal(j.scope,'ALL_IN_SCOPE_SUBJECTS_ENGLISH_AND_URDU_PRIORITY');
 assert.match(j.rules.beforeEachPaperOrCorpus,/SCAN_AND_REGISTER/);
});
test('grade 9 new syllabus first actual 2026 prioritized',()=>assert.match(j.precedence[0],/2026_GRADE9_ACTUAL/));
test('older grade 10 used only for structure, never new book content',()=>{
 assert.equal(j.rules.doNotInferExact2027Grade10PatternFrom2026OldCohort,true);
 assert.equal(j.rules.olderGrade10PatternStructuralReferenceAllowed,true);
 for(const x of j.priorityAcquisitionQueue.filter(r=>r.grade===10))assert.match(x.contentUse,/NEVER_CONTENT/);
});
test('source-type rules block answer key from paper hierarchy',()=>{
 assert.match(j.documentTypeAuthority.ANSWER_KEY,/cannot establish subjective/);
 assert(j.sourceReferences.filter(s=>s.documentType==='ANSWER_KEY').every(s=>s.verifiedPatternHierarchy===false));
});
test('real official Multan Grade IX scanned keys carry full SHA and no fake paper approval',()=>{
 const e=j.sourceReferences.find(s=>s.id==='MULTAN-G9-2026-ENGLISH-OBJECTIVE-KEY-BUNDLE');
 const u=j.sourceReferences.find(s=>s.id==='MULTAN-G9-2026-URDU-OBJECTIVE-KEY-BUNDLE');
 assert.match(e.pdfSha256,/^[a-f0-9]{64}$/);assert.match(u.pdfSha256,/^[a-f0-9]{64}$/);
 assert.equal(e.pages,24);assert.equal(u.pages,25);
 assert(!e.verifiedPatternHierarchy&&!u.verifiedPatternHierarchy);
});
test('research queue enumerates both grades/subjects/groups/parts without pattern fabrication',()=>{
 assert.equal(j.priorityAcquisitionQueue.length,16);
 for(const grade of [9,10])for(const subject of ['English','Urdu'])for(const group of ['I','II'])for(const part of ['OBJECTIVE','SUBJECTIVE'])
 assert(j.priorityAcquisitionQueue.some(x=>x.grade===grade&&x.subject===subject&&x.group===group&&x.part===part));
 assert(j.priorityAcquisitionQueue.every(x=>x.allowPatternApproval===false));
});
test('verified hierarchy requires real page, marks and choice review',()=>{
 assert.equal(j.verifiedHierarchyEntries.length,2);
 assert(j.verifiedHierarchyEntries.every(x=>x.authorityState==='VERIFIED_MODEL'&&x.documentType==='OFFICIAL_MODEL'&&!x.actualAnnualPaperVerified));
 assert.equal(j.rules.exactCategoryHierarchyMustBeBackedByPageReference,true);
 assert.equal(j.rules.marksChoiceAndQuestionOrderRequireActualDocumentVerification,true);
});
test('no past-paper question text is copied or seeded, and editor remains existing format',()=>{
 assert.equal(j.rules.neverCopyPastPaperQuestionsOrPassages,true);
 assert.equal(j.rules.useASSPSExistingEditorNotBoardPageDesign,true);
 assert.equal(j.verifiedQuestionTextCopiedFromPapers,0);
 assert.equal(j.verifiedAcademicContentSeededByThisPolicy,0);
 assert.equal(j.productionWrites,0);assert.equal(j.releaseApproved,false);
});
