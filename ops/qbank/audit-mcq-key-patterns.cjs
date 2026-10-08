#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../..');
const DEFAULT_FILE = path.join(ROOT,'docs/question-bank/ASSPS_BIO9_CH1_ORIGINAL_PRACTICE_DRAFT_20261008.json');
const label = value => String(value ?? '').trim().toUpperCase();
function inspectMcqs(questions) {
  const mcqs = questions.filter(q => q.type === 'mcq');
  const findings = [];
  for(const q of mcqs){
    const opts = Array.isArray(q.options) ? q.options.map(s => String(s).trim()) : [];
    if(opts.length !== 4 || opts.some(s => !s) || new Set(opts.map(s=>s.toLowerCase())).size !== 4 || !'ABCD'.includes(label(q.correctOption)) || label(q.correctOption).length !== 1){
      findings.push({type:'MCQ_STRUCTURE_REQUIRES_REVIEW', questionId:q.localId || q.id});
    }
  }
  const keys = mcqs.map(q => label(q.correctOption));
  for(let period=1;period<=4;period++) {
    let best={start:0,length:0,period};
    for(let start=0;start<keys.length;start++){
      let end=start+period;
      while(end<keys.length && keys[end]===keys[end-period] && /^[A-D]$/.test(keys[end])) end++;
      if(end-start>=8 && end-start>best.length && period<end-start)
        best={start,length:end-start,period};
    }
    if(best.length>=8 && !findings.some(f=>f.type==='PREDICTABLE_MCQ_KEY_SEQUENCE' && f.startIndex===best.start && f.length>=best.length)){
      findings.push({type:'PREDICTABLE_MCQ_KEY_SEQUENCE',startIndex:best.start,length:best.length,period,
        firstQuestionId:mcqs[best.start].localId || mcqs[best.start].id,
        lastQuestionId:mcqs[best.start+best.length-1].localId || mcqs[best.start+best.length-1].id,
        note:'Editorial concern only; reordering options changes the question revision hash and requires re-review.'});
    }
  }
  return {mcqs:mcqs.length, correctKeyDistribution:Object.fromEntries('ABCD'.split('').map(k=>[k,keys.filter(x=>x===k).length])),findings,
    academicApprovalGranted:false,automaticOptionRebalance:false};
}
if(require.main===module){
  const file=path.resolve(process.argv[2]||DEFAULT_FILE);
  const doc=JSON.parse(fs.readFileSync(file,'utf8'));
  console.log(JSON.stringify({scope:'EDITORIAL_TRIAGE_NOT_SOURCE_VERIFICATION',file:path.basename(file),...inspectMcqs(doc.questions||doc.drafts||[])},null,2));
}
module.exports={inspectMcqs};
