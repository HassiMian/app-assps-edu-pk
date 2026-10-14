const clone=v=>JSON.parse(JSON.stringify(v));
export function buildGrade9MatricTechPracticalBlueprint(patternDoc,subject){
 const s=(patternDoc?.subjects||[]).find(x=>x.subject===subject);if(!s)return{valid:false,errors:['Unknown Grade IX Matric-Tech practical pattern: '+subject]};
 const errors=[];const x=s.sections||{};const sections=[];
 for(const id of ['q1','q2']){const q=x[id];if(!q||q.marks!==12)errors.push(id+' practical section must carry 12 marks');else sections.push({id:id.toUpperCase(),type:'practical-choice',marks:q.marks,attempt:q.attempt,poolA:clone(q.poolA),poolB:clone(q.poolB),modelTaskSplit:clone(s.modelTaskSplit||null)});}
 if(x.practicalNotebook?.marks!==6)errors.push('Practical Notebook must carry 6 marks');else sections.push({id:'PRACTICAL_NOTEBOOK',type:'notebook',marks:6});
 if(x.vivaVoce?.marks!==5)errors.push('Viva Voce must carry 5 marks');else sections.push({id:'VIVA_VOCE',type:'viva',marks:5});
 if(sections.reduce((a,b)=>a+b.marks,0)!==s.totalMarks)errors.push('Practical blueprint total does not reconcile');
 return{valid:errors.length===0,errors,grade:9,curriculumTrack:'MATRIC_TECH',assessmentDimension:'PRACTICAL',subject,totalMarks:s.totalMarks,durationMinutes:s.durationMinutes,sections,authority:{notification:patternDoc.notification?.number,artifactSha256:patternDoc.artifact?.sha256,pairingPage:s.pairingPage},layoutPolicy:'ASSPS_PAPER_DOCUMENT_LAYOUT_UNCHANGED'};
}
