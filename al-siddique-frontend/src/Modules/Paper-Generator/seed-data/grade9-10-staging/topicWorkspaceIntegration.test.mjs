import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const liveBank=readFileSync(new URL('../../QuestionBank.jsx',import.meta.url),'utf8');
const researchUI=readFileSync(new URL('../../TopicWiseCurriculumWorkspace.jsx',import.meta.url),'utf8');
test('new workspace is explicitly routed as an isolated tab without replacing Questions',()=>{
 assert.match(liveBank,/IX\/X · Topic Workspace/);
 assert.match(liveBank,/tab === 'curriculum'/);
 assert.match(liveBank,/TopicWiseCurriculumWorkspace/);
 assert.match(liveBank,/id: 'questions'/);
});
test('pilot UI never calls live Question Bank writer or uncontrolled AI generation',()=>{
 for(const unsafe of [/usePaperStore\s*\(/,/bulkAddQuestions\s*\(/,/editQuestion\s*\(/,/store\.addQuestion\s*\(/,/generateWithGemini\s*\(/,/localStorage\./])
  assert.doesNotMatch(researchUI,unsafe);
 assert.match(researchUI,/publicationAllowed:false/);
 assert.match(researchUI,/Export review drafts/);
 assert.match(researchUI,/Draft \{type\}/);
});

test('persistent curriculum drafts use tenant-scoped storage wrapper and never raw localStorage',()=>{
 const store=readFileSync(new URL('../../topicDraftBrowserStore.js',import.meta.url),'utf8');
 assert.match(store,/getTenantStorageItem/);assert.match(store,/setTenantStorageItem/);
 assert.match(store,/expectedRevision/);assert.match(store,/rollbackTopicDraftLibrary/);
 assert.doesNotMatch(store,/window\.localStorage|localStorage\./);
 assert.doesNotMatch(researchUI,/setDrafts\(|setBlocks\(/);
 assert.match(researchUI,/library revision/);
 assert.match(researchUI,/tenant-scoped/);
});
test('draft browser storage key is isolated per curriculum before tenant scoping',()=>{
 const store=readFileSync(new URL('../../topicDraftBrowserStore.js',import.meta.url),'utf8');
 assert.match(store,/topicDraftBaseKey\(curriculumKey\)/);
 assert.match(store,/\$\{BASE_KEY\}__\$\{part\}/);
 assert.match(store,/keyPart/);
});
test('Urdu authoring is bound to the verified Urdu ledger and its own physical page',()=>{
 assert.match(researchUI,/biology9UrduEvidenceLedger/);
 assert.match(researchUI,/urduEvidencePage/);
 assert.match(researchUI,/Urdu source physical page/);
});
