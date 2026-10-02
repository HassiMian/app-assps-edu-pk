// Phase 3R: new-authoring PaperDocument. Separate from historical V13 migration.
// No server write, printer, canonical v13 claim or publication authorization.
import {phase3QPreview} from './curriculumPreparationPhase3Q.js';
export const NEW_AUTHORING_FORMAT='assps-new-authoring-paper';
export const NEW_AUTHORING_MODEL='PaperDocumentNewAuthoring';
export const NEW_AUTHORING_VERSION=1;
const HANDOFF='assps-phase3p-source-preserving-paper-handoff-v1';
const has=x=>typeof x==='string'&&x.trim().length>0;
const clone=x=>JSON.parse(JSON.stringify(x));
const refuse=x=>{throw Error('Phase3R refused: '+x);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const langs={en:'english',ur:'urdu'};
const identityKeys=['authority','grade','subjectId','textbookId','edition','syllabusVersion'];
const draftIdValid=id=>has(id)&&/^[a-z0-9][a-z0-9_.:-]{2,127}$/i.test(id);
const sourceOptions=(record,medium)=>Array.isArray(record?.content?.[medium]?.options)
 ?record.content[medium].options.map(o=>({label:o.id,text:o.text})):[];
const studentOptions=options=>Array.isArray(options)?options.map(o=>({label:o.label,text:o.text})):[];
const baselineChanged=(item,record,medium)=>
 item.working.stem!==record?.content?.[medium]?.stem||
 !same(studentOptions(item.working.options),item.kind==='mcq'?sourceOptions(record,medium):[]);
function computeSection(section){
 const items=section.items,any=section.attemptAny;
 if(!Array.isArray(items)||!items.length||!Number.isInteger(any)||any<1||any>items.length)
  refuse('invalid section items/attempt rule');
 const marks=items.map(q=>q.working.marks);
 if(marks.some(m=>!Number.isSafeInteger(m)||m<1||m>100))
  refuse('each authored item needs valid 1–100 marks');
 const uniform=marks.every(m=>m===marks[0]);
 if(any<items.length&&!uniform)refuse('Attempt Any with mixed marks is ambiguous; separate blocks first');
 return {...section,selectedCount:items.length,attemptAny:any,
  instruction:any===items.length?'Attempt all':'Attempt any '+any,
  marksPerQuestion:uniform?marks[0]:null,
  listedPotentialMarks:marks.reduce((n,m)=>n+m,0),
  totalMarks:any===items.length?marks.reduce((n,m)=>n+m,0):any*marks[0]};
}
const computeTotals=doc=>{const sections=doc.sections.map(computeSection);
 return {...doc,sections,totalMarks:sections.reduce((n,s)=>n+s.totalMarks,0)};};
const evidenceFor=(ledgerItem,sourceIdentity)=>{
 const a=ledgerItem?.academicRecord,hashes=sourceIdentity?.sourceChecksums||{};
 return a?.review?.status==='approved'&&a.id===ledgerItem.questionId&&
 identityKeys.every(k=>a.curriculum?.[k]===sourceIdentity.curriculumIdentity?.[k])&&
 a.source?.languages?.en?.pdfSha256===hashes.en&&
 a.source?.languages?.ur?.pdfSha256===hashes.ur&&
 ['en','ur'].every(lang=>has(a.content?.[lang]?.stem)&&has(a.content?.[lang]?.answer));
};
const sourceEntry=(doc,sectionId,id)=>doc.sourceLedger.find(l=>l.blockId===sectionId&&l.questionId===id);
function validatedSource(handoff,draftId){
 const c=handoff?.composition;
 if(!draftIdValid(draftId)||handoff?.schema!==HANDOFF||
    handoff.status!=='UNSAVED_PREVIEW_AWAITING_NEW_AUTHORING_PAPERDOCUMENT_ADAPTER'||
    handoff.canonicalV13MigrationClaim!==false||handoff.liveEditorMounted!==false||
    handoff.printApproved!==false||handoff.legacyBankWriteAllowed!==false||
    c?.schema!=='assps-phase3o-topic-paper-selection'||c.status!=='UNSAVED_COMPOSITION_ONLY'||
    !['en','ur'].includes(c.medium)||!Array.isArray(c.blocks)||!c.blocks.length||
    !Array.isArray(handoff.sourceLedger)||!handoff.curriculumIdentity||
    !['full','alp'].includes(handoff.selection?.syllabusMode)||
    (handoff.selection.syllabusMode==='alp'&&!Number.isInteger(handoff.selection.examYear))||
    !['en','ur'].every(k=>has(handoff.sourceBookIds?.[k])&&
      /^[0-9a-f]{64}$/i.test(handoff.sourceChecksums?.[k]||'')))
  refuse('explicit draft ID and complete unsaved lossless Phase3P handoff required');
 const seen=new Set(),ledgerKeys=new Set(),total=[];
 const id={curriculumIdentity:handoff.curriculumIdentity,sourceChecksums:handoff.sourceChecksums};
 for(const entry of handoff.sourceLedger){
  const key=entry?.blockId+'::'+entry?.questionId;
  if(ledgerKeys.has(key)||!evidenceFor(entry,id))refuse('duplicated or unapproved source ledger');
  ledgerKeys.add(key);
 }
 for(const block of c.blocks){
  if(!has(block.id)||!Array.isArray(block.questions)||!block.questions.length||
     !Number.isInteger(block.attemptAny)||block.attemptAny<1||
     block.attemptAny>block.questions.length)refuse('invalid composed block');
  for(const q of block.questions){
   const key=block.id+'::'+q.questionId;
   if(seen.has(q.questionId)||!ledgerKeys.has(key))refuse('missing/duplicate original question');
   seen.add(q.questionId);
   const entry=handoff.sourceLedger.find(l=>l.blockId===block.id&&l.questionId===q.questionId);
   const record=entry.academicRecord,medium=c.medium;
   if(entry.chapterId!==q.chapterId||entry.topicId!==q.topicId||
      record.chapter?.id!==q.chapterId||record.topicId!==q.topicId||
      block.type!==q.type||record.type!==q.type||record.marks!==q.marks||
      record.content[medium].stem!==q.text||
      (q.type==='mcq'&&(!same(studentOptions(q.options),sourceOptions(record,medium))||
       !['A','B','C','D'].includes(record.correctOptionId))))
    refuse('composition changed after source-preserving academic handoff');
   total.push(q);
  }
 }
 if(total.length!==handoff.sourceLedger.length)refuse('orphaned academic ledger records');
 return c;
}
export function createNewAuthoringPaperDocument({handoff,draftId,metadata={}}={}){
 const c=validatedSource(handoff,draftId),medium=c.medium;
 const sections=c.blocks.map((b,i)=>({
  id:b.id,order:i+1,kind:b.type,medium,attemptAny:b.attemptAny,
  items:b.questions.map(q=>({
   id:'authored::'+b.id+'::'+q.questionId,sourceQuestionId:q.questionId,
   chapterId:q.chapterId,topicId:q.topicId,kind:q.type,
   working:{stem:q.text,marks:q.marks,options:studentOptions(q.options),
    responseLines:0,direction:medium==='ur'?'rtl':'ltr'},
   provenance:{academicTextMutated:false,answerKeyStatus:'SOURCE_VERIFIED',
    marksMutated:false,sourceRecordId:q.questionId,sourceBlockId:b.id}
  }))
 }));
 const document={
  format:NEW_AUTHORING_FORMAT,documentModel:NEW_AUTHORING_MODEL,
  schemaVersion:NEW_AUTHORING_VERSION,id:draftId,status:'UNSAVED_LOCAL_DRAFT',
  metadata:{title:has(metadata.title)?metadata.title:'New Examination Paper',
   classLevel:handoff.curriculumIdentity.grade,subject:handoff.curriculumIdentity.subjectId,
   examType:metadata.examType??null,session:metadata.session??null,
   examDate:metadata.examDate??null,durationMinutes:metadata.durationMinutes??null,
   language:langs[medium],direction:medium==='ur'?'rtl':'ltr'},
  sourceIdentity:{kind:'NEW_AUTHORING_APPROVED_CURRICULUM',draftId,
   sourcePaperId:null,sourceDatasetGeneration:null,
   curriculumIdentity:clone(handoff.curriculumIdentity),
   sourceBookIds:clone(handoff.sourceBookIds),
   sourceChecksums:clone(handoff.sourceChecksums),
   selection:clone(handoff.selection),
   approvedSnapshotRevision:handoff.snapshotRevision??null,
   authorizationState:'UNVERIFIED_CLIENT_ONLY'},
  institutionBranding:null,sections,sourceLedger:clone(handoff.sourceLedger),
  totalMarks:0,legacyPaperUpdated:false,legacyBankWriteAllowed:false,
  canonicalV13MigrationClaim:false,serverPublicationApproved:false,printApproved:false
 };
 const prepared=computeTotals(document),result=validateNewAuthoringPaperDocument(prepared);
 if(!result.valid)refuse('new authoring validation failed: '+result.errors.join('; '));
 if(prepared.totalMarks!==c.totalMarks)refuse('calculated marks diverge from original composition');
 return prepared;
}
export function validateNewAuthoringPaperDocument(doc){
 const errors=[];
 if(!doc||doc.format!==NEW_AUTHORING_FORMAT||doc.documentModel!==NEW_AUTHORING_MODEL||
    doc.schemaVersion!==NEW_AUTHORING_VERSION)return {valid:false,errors:['invalid new-authoring discriminator']};
 if(!draftIdValid(doc.id)||doc.status!=='UNSAVED_LOCAL_DRAFT')
  errors.push('valid unsaved new-authoring draft identity required');
 const sid=doc.sourceIdentity,medium=doc.metadata?.language==='urdu'?'ur':
  doc.metadata?.language==='english'?'en':null;
 if(sid?.kind!=='NEW_AUTHORING_APPROVED_CURRICULUM'||sid.draftId!==doc.id||
    sid.sourcePaperId!==null||sid.sourceDatasetGeneration!==null||
    sid.authorizationState!=='UNVERIFIED_CLIENT_ONLY')
  errors.push('new-authoring source identity cannot claim a migrated V13 or server approval');
 if(!medium||doc.metadata?.direction!==(medium==='ur'?'rtl':'ltr'))
  errors.push('explicit EN/UR metadata direction required');
 if(doc.metadata?.classLevel!==sid?.curriculumIdentity?.grade||
    doc.metadata?.subject!==sid?.curriculumIdentity?.subjectId||!has(doc.metadata?.title))
  errors.push('class/subject binding and title must be preserved');
 for(const key of ['examType','session','examDate'])
  if(doc.metadata?.[key]!==null&&doc.metadata?.[key]!==undefined&&
     typeof doc.metadata[key]!=='string')errors.push('invalid metadata '+key);
 if(doc.metadata?.durationMinutes!==null&&doc.metadata?.durationMinutes!==undefined&&
    (!Number.isSafeInteger(doc.metadata.durationMinutes)||doc.metadata.durationMinutes<1))
  errors.push('durationMinutes must be positive integer or null');
 if(!['full','alp'].includes(sid?.selection?.syllabusMode)||
    (sid?.selection?.syllabusMode==='alp'&&!Number.isInteger(sid.selection.examYear)))
  errors.push('explicit full or evidenced ALP selection required');
 for(const k of ['en','ur'])if(!/^[a-f0-9]{64}$/i.test(sid?.sourceChecksums?.[k]||'')||
     !has(sid?.sourceBookIds?.[k]))errors.push('missing '+k+' verified book binding');
 if(doc.legacyPaperUpdated!==false||doc.legacyBankWriteAllowed!==false||
    doc.canonicalV13MigrationClaim!==false||doc.serverPublicationApproved!==false||
    doc.printApproved!==false||doc.institutionBranding!==null)
  errors.push('unsaved client paper must not advertise production, branding or publication authority');
 if(!Array.isArray(doc.sections)||!doc.sections.length||
    !Array.isArray(doc.sourceLedger))return {valid:false,errors:[...errors,'sections and source ledger required']};
 const usedSection=new Set(),usedQuestion=new Set(),usedLedger=new Set();
 for(const l of doc.sourceLedger){
  const key=l?.blockId+'::'+l?.questionId;
  if(usedLedger.has(key)||!evidenceFor(l,sid||{}))errors.push('duplicate/unapproved source ledger: '+key);
  usedLedger.add(key);
 }
 let total=0;
 for(let si=0;si<doc.sections.length;si++){
  const sec=doc.sections[si];
  if(!has(sec?.id)||usedSection.has(sec.id)||sec.order!==si+1||
     !Array.isArray(sec.items)||sec.items.length<1){
   errors.push('invalid/duplicate section '+si);continue;
  }
  usedSection.add(sec.id);
  if(!Number.isInteger(sec.attemptAny)||sec.attemptAny<1||sec.attemptAny>sec.items.length){
   errors.push('invalid attempt rule '+sec.id);continue;
  }
  for(const item of sec.items){
   if(!has(item?.sourceQuestionId)||usedQuestion.has(item.sourceQuestionId)||
      item.id!=='authored::'+sec.id+'::'+item.sourceQuestionId||
      item.kind!==sec.kind||!item.working||!has(item.working.stem)||
      !Number.isSafeInteger(item.working.marks)||item.working.marks<1||
      item.working.marks>100||!Number.isInteger(item.working.responseLines)||
      item.working.responseLines<0||item.working.responseLines>30)
    {errors.push('invalid/duplicate authored item '+item?.sourceQuestionId);continue;}
   usedQuestion.add(item.sourceQuestionId);
   const original=sourceEntry(doc,sec.id,item.sourceQuestionId),record=original?.academicRecord;
   if(!original||!evidenceFor(original,sid)||original.chapterId!==item.chapterId||
      original.topicId!==item.topicId||record.type!==item.kind)
    {errors.push('source binding mismatch '+item.sourceQuestionId);continue;}
   if(item.working.direction!==(medium==='ur'?'rtl':'ltr'))
    errors.push('item language direction drift: '+item.sourceQuestionId);
   const opt=studentOptions(item.working.options);
   if(!Array.isArray(item.working.options))errors.push('invalid option collection '+item.sourceQuestionId);
   if(item.kind==='mcq'){
    const base=sourceOptions(record,medium);
    if(opt.length!==4||!same(opt.map(o=>o.label),base.map(o=>o.label))||
       opt.some(o=>!has(o.text)))errors.push('invalid MCQ option identity/text '+item.sourceQuestionId);
   }else if(opt.length)errors.push('non-MCQ options must remain empty '+item.sourceQuestionId);
   const changed=baselineChanged(item,record,medium);
   if(item.provenance?.academicTextMutated!==changed||
      item.provenance?.answerKeyStatus!==(changed?'NEEDS_TEACHER_REVIEW':'SOURCE_VERIFIED')||
      item.provenance?.marksMutated!==(item.working.marks!==record.marks)||
      item.provenance?.sourceRecordId!==item.sourceQuestionId||
      item.provenance?.sourceBlockId!==sec.id)
    errors.push('untracked authoring change/answer-key drift '+item.sourceQuestionId);
  }
  try{
   const calculated=computeSection(sec);
   for(const key of ['selectedCount','attemptAny','instruction','marksPerQuestion',
    'listedPotentialMarks','totalMarks'])
    if(!same(calculated[key],sec[key]))errors.push('section calculation drift: '+sec.id+' '+key);
   total+=calculated.totalMarks;
  }catch(e){errors.push(e.message);}
 }
 if(usedQuestion.size!==doc.sourceLedger.length||usedLedger.size!==usedQuestion.size)
  errors.push('all selected source records must be retained once');
 if(total!==doc.totalMarks)errors.push('document computed marks mismatch');
 return {valid:errors.length===0,errors};
}
function assertDraft(doc){
 const result=validateNewAuthoringPaperDocument(doc);
 if(!result.valid)refuse('invalid working draft: '+result.errors.join('; '));
}
export function editNewAuthoringQuestion(doc,{sectionId,questionId,patch}={}){
 assertDraft(doc);
 if(!patch||!Object.keys(patch).length||
    Object.keys(patch).some(k=>!['stem','marks','options','responseLines'].includes(k)))
  refuse('only independently editable question fields may be patched');
 const next=clone(doc),sec=next.sections.find(s=>s.id===sectionId),
  item=sec?.items.find(x=>x.sourceQuestionId===questionId);
 if(!item)refuse('question does not belong to this new-authoring section');
 if('stem'in patch)item.working.stem=patch.stem;
 if('marks'in patch)item.working.marks=patch.marks;
 if('responseLines'in patch)item.working.responseLines=patch.responseLines;
 if('options'in patch)item.working.options=clone(patch.options);
 const source=sourceEntry(next,sectionId,questionId).academicRecord,
  lang=next.metadata.language==='urdu'?'ur':'en';
 const changed=baselineChanged(item,source,lang);
 item.provenance.academicTextMutated=changed;
 item.provenance.answerKeyStatus=changed?'NEEDS_TEACHER_REVIEW':'SOURCE_VERIFIED';
 item.provenance.marksMutated=item.working.marks!==source.marks;
 const updated=computeTotals(next);
 assertDraft(updated);return updated;
}
export function editNewAuthoringSection(doc,{sectionId,attemptAny,marksPerQuestion}={}){
 assertDraft(doc);
 const next=clone(doc),sec=next.sections.find(s=>s.id===sectionId);
 if(!sec)refuse('unknown authored section');
 if(attemptAny!==undefined)sec.attemptAny=attemptAny;
 if(marksPerQuestion!==undefined){
  if(!Number.isSafeInteger(marksPerQuestion)||marksPerQuestion<1||marksPerQuestion>100)
   refuse('section marks per question must be within 1–100');
  for(const item of sec.items){
   item.working.marks=marksPerQuestion;
   const source=sourceEntry(next,sec.id,item.sourceQuestionId).academicRecord;
   item.provenance.marksMutated=marksPerQuestion!==source.marks;
  }
 }
 const updated=computeTotals(next);
 assertDraft(updated);return updated;
}
const editableMeta=['title','examType','session','examDate','durationMinutes'];
export function editNewAuthoringMetadata(doc,patch={}){
 assertDraft(doc);
 if(!Object.keys(patch).length||Object.keys(patch).some(k=>!editableMeta.includes(k)))
  refuse('protected institution, source and class identities are not editable here');
 const next=clone(doc);
 for(const key of Object.keys(patch))next.metadata[key]=patch[key];
 assertDraft(next);return next;
}
export function projectNewAuthoringStudentPreview(doc){
 assertDraft(doc);
 return {format:'assps-unsaved-student-preview',id:doc.id,
  status:'UNSAVED_PREVIEW_NO_PRINT',metadata:clone(doc.metadata),totalMarks:doc.totalMarks,
  sections:doc.sections.map(s=>({id:s.id,kind:s.kind,order:s.order,
   instruction:s.instruction,totalMarks:s.totalMarks,
   questions:s.items.map((q,i)=>({number:i+1,id:q.id,stem:q.working.stem,
    marks:q.working.marks,options:clone(q.working.options),
    responseLines:q.working.responseLines,direction:q.working.direction}))})),
  printApproved:false,serverPublicationApproved:false};
}
// Single pure composition path from the isolated teacher selection workspace.
export function createNewAuthoringPaperFromWorkspace({workspace,projection,draftId,metadata={}}={}){
 const handoff=phase3QPreview(workspace,projection);
 return createNewAuthoringPaperDocument({handoff,draftId,metadata});
}
