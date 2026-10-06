const clone=v=>JSON.parse(JSON.stringify(v));
const sum=o=>Object.values(o||{}).reduce((a,b)=>a+Number(b||0),0);
const section=(id,type,marks,extra={})=>({id,type,marks,...extra});

export function buildGrade9CoreBlueprint(patternDoc,subject){
  const src=(patternDoc?.subjects||[]).find(x=>x.subject===subject);
  if(!src) return {valid:false,errors:['Unknown Grade IX subject pattern: '+subject]};
  const errors=[];
  const sections=[];
  const objective=src.objective||{};
  if(sum(objective.chapterCounts)!==objective.mcqs) errors.push('Objective chapter distribution does not reconcile');
  if(objective.marks!==objective.mcqs) errors.push('Objective marks must equal one-mark MCQ count');
  sections.push(section('Q1','mcq',objective.marks,{attempt:objective.mcqs,offered:objective.mcqs,marksEach:1,chapterCounts:clone(objective.chapterCounts)}));
  const subj=src.subjective||{};
  for(const q of subj.shortQuestions||[]){
    if(sum(q.chapterCounts)!==q.offered) errors.push('Q'+q.question+' short-question chapter distribution does not reconcile');
    sections.push(section('Q'+q.question,'short',q.attempt*q.marksEach,{attempt:q.attempt,offered:q.offered,marksEach:q.marksEach,chapterCounts:clone(q.chapterCounts)}));
  }
  if(subj.longQuestions){
    const l=subj.longQuestions;
    const rules=l.questions||l.questionChapterBands||l.questionChapterRules||{};
    for(const [q,rule] of Object.entries(rules)){
      sections.push(section('Q'+q,'long',l.marksEach,{attempt:1,offered:1,marksEach:l.marksEach,partMarks:clone(l.partMarks||null),chapterRule:clone(rule)}));
    }
    sections.push(section('LONG_CHOICE','choice-control',l.attempt*l.marksEach,{attempt:l.attempt,offered:l.offered,marksEach:l.marksEach,questionIds:Object.keys(rules).map(q=>'Q'+q)}));
  }
  for(const key of ['longPartII','longPartIII']) if(subj[key]){
    const l=subj[key];
    for(const [q,rule] of Object.entries(l.questions||{})){
      sections.push(section('Q'+q,'long',l.marksEach,{attempt:1,offered:1,marksEach:l.marksEach,partMarks:clone(l.partMarks||null),chapterRule:clone(rule),choiceGroup:key}));
    }
    sections.push(section(key.toUpperCase()+'_CHOICE','choice-control',l.attempt*l.marksEach,{attempt:l.attempt,offered:l.offered,marksEach:l.marksEach,questionIds:Object.keys(l.questions||{}).map(q=>'Q'+q),choiceGroup:key}));
  }
  const scored=sections.filter(s=>s.type!=='long').filter(s=>s.type!=='choice-control').reduce((a,s)=>a+s.marks,0)
    +sections.filter(s=>s.type==='choice-control').reduce((a,s)=>a+s.marks,0);
  if(scored!==src.totalMarks) errors.push('Blueprint marks do not reconcile to subject total');
  return {valid:errors.length===0,errors,grade:9,subject,totalMarks:src.totalMarks,durationMinutes:src.durationMinutes,
    authority:{name:patternDoc.authority,notification:patternDoc.notification?.number,artifactSha256:patternDoc.artifact?.sha256},
    selectionBlueprint:sections,
    layoutPolicy:'ASSPS_PAPER_DOCUMENT_LAYOUT_UNCHANGED',
    sourcePolicy:{patternOnly:true,copyModelOrPastPaperStem:false,fullBookDefault:patternDoc.rules?.fullBookQuestionBankDefault===true}}
}
