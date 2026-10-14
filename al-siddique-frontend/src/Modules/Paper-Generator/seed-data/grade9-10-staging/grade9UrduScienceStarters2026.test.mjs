import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {validateQuestion,duplicateDiagnostics,selectApprovedQuestions} from './questionContract.mjs';
const read=n=>JSON.parse(fs.readFileSync(new URL(n,import.meta.url),'utf8'));
const specs=[
 ['mathematics9Urdu',13,39,'d01c27960d9870f7367a5c5b6788290886afa5b9cb43f1c67510399a91b79c11'],
 ['physics9Urdu',9,27,'b1ae1f1a23ce5d420daa24cfead8ac8711af89060b124700ad75b21f68a355d1'],
 ['biology9Urdu',11,33,'7f325fd04a1291949a39d4bb18e60d9d1daef4d18535f7b2189971c514a344dd'],
 ['chemistry9Urdu',13,39,'37864e636e1ec3c35e063c2e838d3d73b75909096759dd215a24e9e05e867fb7']
];
test('Grade IX Urdu science/math maps are hash locked with full chapter counts',()=>{for(const [p,c,,sha] of specs){const s=read(`./${p}SourceMap2026.json`);assert.equal(s.chapters.length,c,p);assert.equal(s.sourcePdfSha256,sha,p);assert.equal(s.authoring.exactUrduPageBoundariesPending,true,p);}});
test('Grade IX Urdu science/math starters contain 138 original chapter-aligned items',()=>{let total=0;for(const [p,c,n] of specs){const b=read(`./${p}Starter2026.json`);assert.equal(b.totals.chapters,c,p);assert.equal(b.totals.drafts,n,p);total+=n;}assert.equal(total,138);});
test('all Grade IX Urdu science/math items pass contract and remain provisional',()=>{for(const [p] of specs){const b=read(`./${p}Starter2026.json`),s=read(`./${p}SourceMap2026.json`);for(const q of b.drafts){const v=validateQuestion(q);assert.equal(v.valid,true,q.id+': '+v.errors.join('; '));assert.equal(q.review.status,'draft');assert.equal(q.medium,'urdu');assert.equal(q.source.exerciseRef,null);assert.deepEqual(q.boardEvidence,[]);}assert.equal(selectApprovedQuestions(b.drafts,{medium:'urdu'}).length,0);assert.deepEqual(duplicateDiagnostics(b.drafts),[]);assert.equal(s.authoring.copyTextbookPassages,false);assert.equal(s.authoring.copyExerciseStems,false);}});
