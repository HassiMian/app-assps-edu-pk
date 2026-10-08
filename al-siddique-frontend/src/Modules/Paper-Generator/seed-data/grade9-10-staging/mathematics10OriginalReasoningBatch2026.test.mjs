import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateQuestion,duplicateDiagnostics,selectApprovedQuestions} from './questionContract.mjs';
const read=n=>JSON.parse(fs.readFileSync(new URL('./'+n,import.meta.url),'utf8'));
const batch=read('mathematics10OriginalReasoningBatch2026.json');
const baseline=read('mathematics10Starter2026.json');
const source=read('mathematics10SourceMap2026.json');
const combined=[...baseline.drafts,...batch.drafts];
test('Math X reasoning batch covers each official chapter with three original practice items',()=>{
 assert.equal(batch.drafts.length,36);
 for(const ch of source.chapters){
  const group=batch.drafts.filter(q=>q.chapter.number===ch.number);
  assert.equal(group.length,3,'Chapter '+ch.number);
  assert.ok(group.some(q=>q.type==='mcq'));
  assert.ok(group.some(q=>q.type==='short'));
  assert.ok(group.some(q=>q.type==='numerical'||q.type==='long'));
 }
 assert.equal(new Set(combined.map(q=>q.id)).size,combined.length);
});
test('draft-only Math X evidence remains scoped to official TOC',()=>{
 assert.equal(batch.publicationAllowed,false);
 assert.equal(batch.liveImportAllowed,false);
 assert.equal(batch.sourcePdfSha256,source.sourcePdfSha256);
 for(const q of batch.drafts){
  const check=validateQuestion(q);
  assert.equal(check.valid,true,q.id+': '+check.errors.join('; '));
  const ch=source.chapters.find(x=>x.number===q.chapter.number);
  assert.equal(q.source.page,ch.tocPdfPage);
  assert.equal(q.source.anchor,ch.title);
  assert.equal(q.review.status,'draft');
 }
});
