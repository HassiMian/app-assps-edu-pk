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
