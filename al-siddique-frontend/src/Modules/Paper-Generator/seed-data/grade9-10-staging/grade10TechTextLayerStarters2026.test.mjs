import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {validateQuestion,duplicateDiagnostics,selectApprovedQuestions} from './questionContract.mjs';
const read=n=>JSON.parse(fs.readFileSync(new URL('./'+n,import.meta.url),'utf8'));
const specs=[
 ['communicationSkills10Tech',9,27,'87dc27ebf31af0a91dbc77a56daa16d5ba7e239a489c3b0a749dd0a57e971e74'],
 ['healthSciences10Tech',9,27,'f69e2553dc39f30fc2f76bda87934cd927c45a5b12e7c8e6305f6ccc6e3aa906'],
 ['physicsTech10English',10,30,'36a947f36646f02192841709366272da567d923533629288c803f1b444f1cf74'],
 ['biologyTech10English',8,24,'170fe88aaa03b5714583d57fe922e3654f3faacc7840620f1a701f989bce9818']
];
test('Grade X text-layer Tech maps are hash/page anchored',()=>{for(const [p,c,,sha] of specs){const s=read(`${p}SourceMap2026.json`);assert.equal(s.chapters.length,c,p);assert.equal(s.sourcePdfSha256,sha,p);for(const ch of s.chapters)assert(Number.isInteger(ch.chapterStartPdfPage)&&ch.chapterStartPdfPage>0,p);assert.equal(s.authoring.copyExerciseStems,false);}});
test('Grade X text-layer Tech starters add 108 original items',()=>{let n=0;for(const [p,c,q] of specs){const b=read(`${p}Starter2026.json`);assert.equal(b.totals.chapters,c,p);assert.equal(b.totals.drafts,q,p);n+=q;}assert.equal(n,108);});
test('all Grade X text-layer Tech questions pass contract and stay provisional',()=>{for(const [p] of specs){const b=read(`${p}Starter2026.json`);for(const q of b.drafts){const v=validateQuestion(q);assert.equal(v.valid,true,q.id+': '+v.errors.join('; '));assert.equal(q.review.status,'draft');assert.equal(q.medium,'english');assert.equal(q.source.exerciseRef,null);assert.deepEqual(q.boardEvidence,[]);}assert.deepEqual(duplicateDiagnostics(b.drafts),[]);assert.equal(selectApprovedQuestions(b.drafts,{medium:'english'}).length,0);}});
