const clone=v=>JSON.parse(JSON.stringify(v));
const sum=o=>Object.values(o||{}).reduce((a,b)=>a+Number(b||0),0);
export function buildGrade9MatricTechBlueprint(patternDoc,subject){
 const src=(patternDoc?.subjects||[]).find(x=>x.subject===subject);
 if(!src)return{valid:false,errors:['Unknown Grade IX Matric-Tech pattern: '+subject]};
 const errors=[];const sections=[];const o=src.objective||{};
 if(o.chapterCounts&&sum(o.chapterCounts)!==o.mcqs)errors.push('Objective chapter distribution does not reconcile');
 if(!o.chapterCounts&&!o.chapterRule&&!o.distributionState)errors.push('Objective distribution evidence missing');
 if(o.marks!==o.mcqs)errors.push('Objective marks must equal MCQ count');
 sections.push({id:'Q1',type:'mcq',marks:o.marks,attempt:o.mcqs,offered:o.mcqs,marksEach:1,chapterCounts:clone(o.chapterCounts||null),chapterRule:o.chapterRule||null,distributionState:o.distributionState||null});
 for(const q of src.shortQuestions||[]){
  if(q.chapterCounts&&sum(q.chapterCounts)!==q.offered)errors.push('Q'+q.question+' short distribution does not reconcile');
  if(!q.chapterCounts&&!q.distributionState)errors.push('Q'+q.question+' short distribution evidence missing');
  sections.push({id:'Q'+q.question,type:'short',marks:q.attempt*q.marksEach,attempt:q.attempt,offered:q.offered,marksEach:q.marksEach,chapterCounts:clone(q.chapterCounts||null),distributionState:q.distributionState||null});
 }
 const l=src.longQuestions||{};
 const qNums=l.questionNumbers||[];
 if(qNums.length!==l.offered)errors.push('Long-question offered count does not match numbered questions');
 for(const q of qNums){
  const rule=(l.questionChapterChoices||l.questionChapterBands||{})[String(q)]??null;
  sections.push({id:'Q'+q,type:'long',marks:l.marksEach,attempt:1,offered:1,marksEach:l.marksEach,partMarks:clone(l.partMarks||null),chapterRule:clone(rule),distributionState:l.distributionState||null});
 }
 sections.push({id:'LONG_CHOICE',type:'choice-control',marks:l.attempt*l.marksEach,attempt:l.attempt,offered:l.offered,marksEach:l.marksEach,questionIds:qNums.map(q=>'Q'+q)});
 const scored=sections.filter(x=>!['long','choice-control'].includes(x.type)).reduce((a,x)=>a+x.marks,0)+sections.filter(x=>x.type==='choice-control').reduce((a,x)=>a+x.marks,0);
 if(scored!==src.totalMarks)errors.push('Blueprint marks do not reconcile to subject total');
 return{valid:errors.length===0,errors,grade:9,curriculumTrack:'MATRIC_TECH',subject,totalMarks:src.totalMarks,durationMinutes:src.durationMinutes,authority:{name:patternDoc.authority,artifactSha256:patternDoc.artifact?.sha256,instructionPage:src.instructionPage},selectionBlueprint:sections,layoutPolicy:'ASSPS_PAPER_DOCUMENT_LAYOUT_UNCHANGED',sourcePolicy:{patternOnly:true,copyModelOrPastPaperStem:false,actualAnnualPaperStillRequiredForOccurrenceClaims:true,unclearDistributionsRemainUnencoded:true}};
}
