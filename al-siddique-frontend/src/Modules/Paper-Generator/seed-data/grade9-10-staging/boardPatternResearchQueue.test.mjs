import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const q=JSON.parse(readFileSync(new URL('./boardPatternResearchQueue.json',import.meta.url)));
test('nine-board research backlog is an evidence-free queue, not invented exam rules',()=>{
 assert.equal(q.boardCount,9);
 assert.equal(q.schoolCatalogTargets,25);
 assert.equal(q.rows.length,225);
 assert.equal(new Set(q.rows.map(r=>r.board)).size,9);
 assert.equal(new Set(q.rows.map(r=>r.catalogRecordId)).size,25);
 assert.ok(q.rows.every(r=>r.pattern===null&&r.examPaperUrl===null&&
  r.examPaperSha256===null&&r.boardAppearanceClaims.length===0&&r.verifiedBy===null));
});
