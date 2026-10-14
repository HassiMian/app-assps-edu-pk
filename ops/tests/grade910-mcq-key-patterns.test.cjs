'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {inspectMcqs}=require('../qbank/audit-mcq-key-patterns.cjs');
const file=path.resolve(__dirname,'../../docs/question-bank/ASSPS_BIO9_CH1_ORIGINAL_PRACTICE_DRAFT_20261008.json');
const rows=JSON.parse(fs.readFileSync(file,'utf8')).questions;
const mk=(letters)=>[...letters].map((key,i)=>({
 localId:'SYN-'+i,type:'mcq',options:['Alpha','Beta','Gamma','Delta'],correctOption:key
}));
test('Biology IX original pilot exposes a perfectly repeated A-B-C-D pattern despite balanced key counts',()=>{
 const out=inspectMcqs(rows);
 assert.equal(out.mcqs,12);
 assert.deepEqual(out.correctKeyDistribution,{A:3,B:3,C:3,D:3});
 assert.ok(out.findings.some(f=>f.type==='PREDICTABLE_MCQ_KEY_SEQUENCE'&&f.period===4&&f.length===12));
 assert.equal(out.academicApprovalGranted,false);
 assert.equal(out.automaticOptionRebalance,false);
});
test('irregular, structurally valid key sequences do not yield a false periodic alarm',()=>{
 const out=inspectMcqs(mk('ABACDBDCACBD'));
 assert.equal(out.findings.length,0);
});
test('duplicate/missing MCQ options and invalid key are quarantined without automatically changing answers',()=>{
 const flawed=mk('ABCD');
 flawed[1].options=['Alpha','Alpha','Gamma','Delta'];
 flawed[2].correctOption='E';
 const out=inspectMcqs(flawed);
 assert.deepEqual(out.findings.filter(f=>f.type==='MCQ_STRUCTURE_REQUIRES_REVIEW').map(f=>f.questionId),['SYN-1','SYN-2']);
 assert.equal(out.automaticOptionRebalance,false);
});
test('unrelated short and long question types do not change MCQ sequence findings',()=>{
 const out=inspectMcqs([...mk('ABCDABCDABCD'),{type:'short',localId:'SHORT',questionText:'Explain.'}]);
 assert.equal(out.mcqs,12);
 assert.ok(out.findings.some(f=>f.period===4&&f.length===12));
});
