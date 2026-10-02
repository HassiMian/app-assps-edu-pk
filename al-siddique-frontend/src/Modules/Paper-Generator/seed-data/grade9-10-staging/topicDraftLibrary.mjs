// Pure tenant-library contract for IX/X curriculum drafts. No browser/global storage here.
export const TOPIC_DRAFT_LIBRARY_VERSION='assps-topic-draft-library-v1';
export const MAX_TOPIC_DRAFT_HISTORY=20;
const clone=v=>JSON.parse(JSON.stringify(v));
const has=v=>typeof v==='string'&&v.trim().length>0;
const same=(a,b)=>String(a||'')===String(b||'');
export function createTopicDraftLibrary({curriculumKey,sourcePdfSha256,now='1970-01-01T00:00:00.000Z'}){
 if(!has(curriculumKey)||!has(sourcePdfSha256))throw new Error('Curriculum key and source PDF checksum are required.');
 return {schemaVersion:TOPIC_DRAFT_LIBRARY_VERSION,curriculumKey,sourcePdfSha256,revision:0,
  createdAt:now,updatedAt:now,drafts:[],blocks:[],history:[]};
}
export function inspectTopicDraftLibrary(value,{curriculumKey,sourcePdfSha256}={}){
 const errors=[];
 if(!value||typeof value!=='object')return {valid:false,errors:['Draft library is not an object.']};
 if(value.schemaVersion!==TOPIC_DRAFT_LIBRARY_VERSION)errors.push('Unsupported draft library schema.');
 if(!Number.isInteger(value.revision)||value.revision<0)errors.push('Invalid draft library revision.');
 if(!Array.isArray(value.drafts)||!Array.isArray(value.blocks)||!Array.isArray(value.history))
  errors.push('Draft library arrays are missing.');
 if(curriculumKey&&!same(value.curriculumKey,curriculumKey))errors.push('Curriculum identity mismatch.');
 if(sourcePdfSha256&&!same(value.sourcePdfSha256,sourcePdfSha256))errors.push('Source textbook checksum mismatch.');
 const ids=new Set();
 for(const [i,q] of (Array.isArray(value.drafts)?value.drafts:[]).entries()){
  if(!has(q?.id)){errors.push('Draft '+i+' missing ID.');continue}
  if(ids.has(q.id))errors.push('Duplicate draft ID: '+q.id);ids.add(q.id);
  if(q?.review?.status!=='draft')errors.push('Persistent staging accepts draft review status only: '+q.id);
  if(q?.source?.pdfSha256!==value.sourcePdfSha256)errors.push('Draft source checksum mismatch: '+q.id);
 }
 return {valid:errors.length===0,errors};
}
function validateBlocks(blocks,knownIds){
 const errors=[],seen=new Set();
 for(const [i,b] of blocks.entries()){
  if(!has(b?.id))errors.push('Block '+(i+1)+' missing ID.');
  if(!has(b?.type))errors.push('Block '+(i+1)+' missing type.');
  if(!Array.isArray(b?.questionIds)||!b.questionIds.length)errors.push('Block '+(i+1)+' is empty.');
  for(const id of b?.questionIds||[]){
   if(!knownIds.has(id))errors.push('Block '+(i+1)+' references unknown question '+id);
   if(seen.has(id))errors.push('Question appears in multiple blocks: '+id);
   seen.add(id);
  }
  if(!Number.isInteger(b?.attemptAny)||b.attemptAny<1||b.attemptAny>(b.questionIds?.length||0))
   errors.push('Block '+(i+1)+' has invalid attempt count.');
 }
 return errors;
}
export function advanceTopicDraftLibrary(current,{expectedRevision,drafts,blocks,knownExternalIds=[],
 now='1970-01-01T00:00:00.000Z'}={}){
 const initial=inspectTopicDraftLibrary(current);
 if(!initial.valid)return {ok:false,code:'INVALID_LIBRARY',errors:initial.errors};
 if(current.revision!==expectedRevision)return {ok:false,code:'REVISION_CONFLICT',
  errors:['Expected revision '+expectedRevision+' but current revision is '+current.revision+'.']};
 const candidate={...clone(current),drafts:clone(drafts||[]),blocks:clone(blocks||[])};
 const checked=inspectTopicDraftLibrary(candidate,{curriculumKey:current.curriculumKey,sourcePdfSha256:current.sourcePdfSha256});
 const known=new Set([...candidate.drafts.map(q=>q.id),...knownExternalIds]);
 const blockErrors=validateBlocks(candidate.blocks,known);
 if(!checked.valid||blockErrors.length)return {ok:false,code:'INVALID_UPDATE',errors:[...checked.errors,...blockErrors]};
 const snapshot={revision:current.revision,updatedAt:current.updatedAt,drafts:clone(current.drafts),blocks:clone(current.blocks)};
 const history=[...(current.history||[]),snapshot].slice(-MAX_TOPIC_DRAFT_HISTORY);
 return {ok:true,library:{...candidate,revision:current.revision+1,updatedAt:now,history}};
}
export function restoreTopicDraftRevision(current,{expectedRevision,targetRevision,knownExternalIds=[],now='1970-01-01T00:00:00.000Z'}={}){
 if(current.revision!==expectedRevision)return {ok:false,code:'REVISION_CONFLICT',
  errors:['Expected revision '+expectedRevision+' but current revision is '+current.revision+'.']};
 const snapshot=(current.history||[]).find(h=>h.revision===targetRevision);
 if(!snapshot)return {ok:false,code:'REVISION_NOT_FOUND',errors:['Revision '+targetRevision+' is not in retained history.']};
 return advanceTopicDraftLibrary(current,{expectedRevision,drafts:snapshot.drafts,blocks:snapshot.blocks,knownExternalIds,now});
}
