import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('./',import.meta.url);
const goal=JSON.parse(readFileSync(new URL('./grade9-10FullQuestionBankGoal.json',base),'utf8'));
const manifest=JSON.parse(readFileSync(new URL('./officialSourceManifest.json',base),'utf8'));
const board=JSON.parse(readFileSync(new URL('./boardPatternAuthorityRegistry.json',base),'utf8'));
const q=readFileSync(new URL('./questionContract.mjs',base),'utf8');
const release=readFileSync(new URL('./releaseAudit.mjs',base),'utf8');

test('goal binds exact Urdu-v2 parent and starts fail closed',()=>{
  assert.equal(goal.parentCommit,'b0def3d95647f33dc10d137a6298ca7bcae6a4dc');
  assert.equal(goal.goalComplete,false);
  assert.equal(goal.approvedQuestionCount,0);
  assert.equal(goal.productionWrites,0);
});

test('goal includes every current official manifest record exactly once',()=>{
  const actual=goal.manifestRecordIds;
  const expected=manifest.entries.map(e=>e.recordId);
  assert.equal(actual.length,expected.length);
  assert.equal(new Set(actual).size,actual.length);
  assert.deepEqual([...actual].sort(),[...expected].sort());
});

test('current subject registry covers both grades and IX-X supplements',()=>{
  assert(goal.subjects.some(s=>s.grade===9&&s.subject==='English'));
  assert(goal.subjects.some(s=>s.grade===10&&s.subject==='Pakistan Studies'));
  assert(goal.subjects.some(s=>s.grade===0&&s.subject==='English Grammar and Composition'));
  assert(goal.subjects.some(s=>s.grade===0&&s.subject==='Urdu Quaid-e-Insha'));
});

test('all nine Punjab boards are explicit',()=>{
  const expected=['Lahore','Gujranwala','Faisalabad','Rawalpindi','Sargodha','Multan','Sahiwal','Bahawalpur','Dera Ghazi Khan'];
  assert.deepEqual(goal.authorities.boardSet,expected);
  assert.deepEqual(board.boards,expected);
});

test('full textbook remains default and ALP/KLP never delete bank coverage',()=>{
  assert.equal(goal.scopePolicy.fullTextbookDefault,true);
  assert.equal(goal.scopePolicy.alpOptionalFilterOnly,true);
  assert.equal(goal.scopePolicy.klpOptionalFilterOnly,true);
  assert.equal(goal.scopePolicy.smartSyllabusMayNeverDeleteSourceCoverage,true);
  assert.equal(goal.scopePolicy.boardPatternControlsAssessmentShapeNotSourceCoverage,true);
});

test('grade 9 statewide model/pairing authority is official PECTAA',()=>{
  const src=board.sources.find(s=>s.id==='PECTAA-G9-2026-REVISED-ALP-PAIRING-MODEL');
  assert(src);
  assert.equal(src.authority,'PECTAA');
  assert.equal(src.verificationState,'OFFICIAL_NOTIFICATION_VERIFIED');
  assert(src.useFor.includes('pairing-scheme'));
  assert(src.mustNotUseFor.includes('deleting-full-book-question-bank-coverage'));
});

test('grade 10 new-edition pattern is explicitly not guessed',()=>{
  assert.equal(board.grade10NewEditionPattern.state,'PENDING_OFFICIAL_MODEL_PAPER_OR_PAIRING_PUBLICATION');
  assert.match(board.grade10NewEditionPattern.rule,/Do not infer/i);
});

test('language subjects require grammar corpus and dual-medium rule is scoped',()=>{
  const en=goal.subjects.find(s=>s.grade===9&&s.subject==='English');
  const ur=goal.subjects.find(s=>s.grade===9&&s.subject==='Urdu');
  assert(en.requiredArtifacts.includes('grammarAndCompositionCorpus'));
  assert(ur.requiredArtifacts.includes('grammarAndCompositionCorpus'));
  assert.equal(goal.languageRules.dualMediumParityRequiredForScienceMathPakistanStudiesGeneralScienceWhereBothOfficialMediaExist,true);
});

test('existing question/release contracts remain architecture dependencies',()=>{
  assert.match(q,/stable question ID/);
  assert.match(q,/MCQ requires four uniquely keyed/);
  assert.match(release,/One identity must include both reviewed languages/);
  assert.equal(goal.questionArchitecture.baseContract,'questionContract.mjs');
  assert.equal(goal.questionArchitecture.releaseAudit,'releaseAudit.mjs');
});

test('unrepresented catalog families remain blockers to universal completion',()=>{
  assert(goal.catalogExpansionRequired.some(x=>/Humanities\/Arts/.test(x)));
  assert.equal(goal.completionGate.allInScopeSubjectsComplete,false);
  assert.equal(goal.completionGate.verifiedGitHubRemoteCommit,false);
});

test('Grade IX Matric-Tech goal scope preserves every distinct official subject identity',()=>{
  const tech=goal.subjects.filter(s=>s.grade===9&&s.curriculumTrack==='MATRIC_TECH');
  assert.equal(tech.length,11);
  assert(tech.some(s=>s.subject==='Computer-Tech'));
  assert(tech.some(s=>s.subject==='Computer Science & Entrepreneurship-Tech'));
  assert(tech.every(s=>s.completionState==='NOT_COMPLETE'&&s.identityRule));
  const practical=tech.filter(s=>['Agriculture Sciences-Tech','Health Sciences-Tech','Fashion Designing-Tech','Information & Communication Technologies-Tech'].includes(s.subject));
  assert.equal(practical.length,4);
  assert(practical.every(s=>s.requiredArtifacts.includes('practicalPatternMapping')&&s.requiredArtifacts.includes('practicalInventoryCoverage')));
});

test('Grade X Matric-Tech source scope is explicit while new-edition exam pattern remains pending',()=>{
 const tech=goal.subjects.filter(s=>s.grade===10&&s.curriculumTrack==='MATRIC_TECH');
 assert.equal(tech.length,12);assert(tech.every(s=>s.completionState==='NOT_COMPLETE'&&s.identityRule));
 assert(tech.some(s=>s.subject==='Computer-Tech'));assert(tech.some(s=>s.subject==='Computer Science-Tech'));assert(tech.some(s=>s.subject==='Computer (Matric-Tech catalog identity)'));
 assert.equal(board.grade10NewEditionPattern.state,'PENDING_OFFICIAL_MODEL_PAPER_OR_PAIRING_PUBLICATION');
});
