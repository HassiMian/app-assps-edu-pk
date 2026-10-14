import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDrafts} from './english9CompetencyOriginals2026.mjs';
test('original English IX draft batch has 44 items',()=>assert.equal(buildDrafts().length,44));
import fs from 'node:fs';
import {validateQuestion,duplicateDiagnostics,selectApprovedQuestions} from './questionContract.mjs';
const load=n=>JSON.parse(fs.readFileSync(new URL(n,import.meta.url),'utf8'));
const map=load('./english9SourceMap2026.json');const old=load('./english9Starter2026.json');const raw=load('./english9CompetencyOriginals2026.json');const qs=buildDrafts();
test('all units and types covered',()=>{assert.deepEqual(new Set(qs.map(x=>x.chapter.number)),new Set(map.units.map(x=>x.number)));assert.equal(qs.filter(x=>x.type==='mcq').length,24);assert.equal(qs.filter(x=>x.type==='grammar').length,10);assert.equal(qs.filter(x=>x.type==='essay').length,4);assert.equal(qs.filter(x=>x.type==='comprehension').length,4);assert.equal(qs.filter(x=>x.type==='translation').length,2);});
