import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {validateQuestion,duplicateDiagnostics,selectApprovedQuestions} from './questionContract.mjs';
const read=n=>JSON.parse(fs.readFileSync(new URL(n,import.meta.url),'utf8'));
for(const medium of ['English','Urdu']){
 const s=read(`./compEntTech9${medium}SourceMap2026.json`),b=read(`./compEntTech9${medium}Starter2026.json`);
 test(`${medium} Computer Entrepreneurship Tech IX source map has ten rendered-TOC units`,()=>{assert.equal(s.units.length,10);assert.equal(b.totals.drafts,30);assert.equal(s.authoring.securityTopicsRestrictedToBenignDefensiveUse,true)});
 test(`${medium} Computer Entrepreneurship Tech IX items pass contract and stay provisional`,()=>{for(const q of b.drafts){const v=validateQuestion(q);assert.equal(v.valid,true,q.id+': '+v.errors.join('; '));assert.equal(q.review.status,'draft');assert.equal(q.source.exerciseRef,null);assert.deepEqual(q.boardEvidence,[])}assert.deepEqual(duplicateDiagnostics(b.drafts),[]);assert.equal(selectApprovedQuestions(b.drafts,{medium:medium.toLowerCase()}).length,0)});
}
