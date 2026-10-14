import fs from 'node:fs';
const load=n=>JSON.parse(fs.readFileSync(new URL(n,import.meta.url),'utf8'));
export const batch=load('./english9CompetencyOriginals2026.json');
const starter=load('./english9Starter2026.json');
export function buildDrafts(){
 return batch.items.map(item=>{
  const q=structuredClone(starter.drafts.find(x=>x.chapter.number===item.unit&&(x.type===item.type||x.type==='short')));
  if(!q)throw Error('Missing verified unit '+item.unit);
  q.id=item.id;q.type=item.type;q.topicId=item.skill;q.marks=item.marks;q.difficulty=item.type==='essay'?'difficult':'medium';
  q.source.page=3;q.source.anchor=item.skill;q.source.topicIndexEvidence='CURRENT_TEXTBOOK_SKILLS_TABLE';q.source.exerciseRef=null;
  q.content={en:{stem:item.stem,answer:item.answer}};
  if(item.options)q.content.en.options=item.options.map((text,i)=>({id:'ABCD'[i],text}));
  if(item.explanation)q.content.en.explanation=item.explanation;
  if(item.rubric)q.content.en.rubric=item.rubric;
  if(item.passage)q.content.en.passage=item.passage;
  q.authorId='ASSPS-ORIGINAL-COMPETENCY-DRAFT-20261008';
  q.review.notes=['Original independent practice; not copied from official exam or textbook.','Academic review and exercise placement pending.'];
  q.boardEvidence=[];
  return q;
 });
}
