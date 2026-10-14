const clone=v=>JSON.parse(JSON.stringify(v));
export function buildGrade9LanguageBlueprint(modelHierarchy,subject){
  const p=(modelHierarchy?.patterns||[]).find(x=>x.subject===subject);
  if(!p)return{valid:false,errors:['Unknown Grade IX language pattern: '+subject]};
  const errors=[];
  const sections=[];
  for(const s of p.sections||[]){
    if(!s.label||!Number.isFinite(s.sectionMarks))errors.push('Malformed section in '+subject);
    sections.push({
      id:s.label,
      paperPart:s.paperPart,
      type:s.taskFamily,
      taskSubtype:s.taskSubtype,
      marks:s.sectionMarks,
      attempt:s.attempt,
      offered:s.offered,
      marksPerAttempt:s.marksPerAttempt??s.marksPerItem??null,
      choiceRule:s.choiceRule??null,
      children:clone(s.children||[]),
      sourcePages:clone(s.sourcePages||[])
    });
  }
  const marks=sections.reduce((a,s)=>a+s.marks,0);
  if(marks!==p.totalMarks)errors.push('Language blueprint marks do not reconcile');
  const objective=sections.filter(s=>s.paperPart==='OBJECTIVE').reduce((a,s)=>a+s.marks,0);
  const subjective=sections.filter(s=>s.paperPart==='SUBJECTIVE').reduce((a,s)=>a+s.marks,0);
  if(objective!==p.objectiveMarks||subjective!==p.subjectiveMarks)errors.push('Objective/subjective split mismatch');
  return{valid:errors.length===0,errors,grade:9,subject,totalMarks:p.totalMarks,durationMinutes:p.totalDurationMinutes,
    authority:{state:p.authorityState,sourceDocumentId:p.sourceDocumentId},selectionBlueprint:sections,
    layoutPolicy:'ASSPS_PAPER_DOCUMENT_LAYOUT_UNCHANGED',
    sourcePolicy:{patternOnly:true,copyModelOrPastPaperStem:false,actualAnnualPaperArtifactStillRequired:true}}
}
