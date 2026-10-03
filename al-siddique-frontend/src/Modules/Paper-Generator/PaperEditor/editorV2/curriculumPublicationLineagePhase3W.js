// Phase 3W: LOCAL, READ-ONLY client hint about a Phase3V verified publication.
// A browser-side object is NEVER server authorization. Phase3S must re-resolve the
// current signed provider and validate exact school/tenant/source before any save.
import {PHASE3P_SCHEMA} from './curriculumPhase3PBridge.js';
export const PHASE3W_LINEAGE_SCHEMA='assps-phase3w-source-lineage-v1';
const valid=x=>typeof x==='string'&&x.trim().length>0;
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
const clone=x=>JSON.parse(JSON.stringify(x));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const refuse=x=>{throw Error('Phase3W refused: '+x);};
const identityFields=['authority','grade','subjectId','textbookId','edition','syllabusVersion'];
export function attachReadOnlyPublicationLineagePhase3W({projection,snapshot}={}){
 if(projection?.schema!==PHASE3P_SCHEMA||
    projection.status!=='READ_ONLY_APPROVED_PROJECTION'||
    !Array.isArray(projection.questions)||!projection.questions.length||
    projection.publicationLineage!==undefined||projection.revision!==undefined)
  refuse('unmodified supervised source projection required');
 if(snapshot?.status!=='PUBLISHED_APPROVED'||
    snapshot.trustOrigin!=='SERVER_INDEPENDENT_AUDIT'||
    snapshot.signatureVerification!=='PINNED_ED25519_VERIFIED'||
    !valid(snapshot.publicationId)||!Number.isSafeInteger(snapshot.revision)||
    snapshot.revision<1||!hash(snapshot.recordsDigest)||
    !Array.isArray(snapshot.records)||snapshot.records.length<1||
    !identityFields.every(k=>snapshot.curriculumIdentity?.[k]===projection.identity?.[k])||
    !same(snapshot.selection,projection.selection)||
    !same(snapshot.sourceBookIds,projection.sourceBookIds)||
    !same(snapshot.sourceChecksums,projection.sourceChecksums))
  refuse('independently signed publication identity, version and bilingual books must agree');
 const originals=new Map();
 for(const record of snapshot.records){
  if(!valid(record?.id)||originals.has(record.id)||record.review?.status!=='approved')
   refuse('duplicated or unpublished academic source record');
  originals.set(record.id,record);
 }
 const selected=new Set();
 for(const q of projection.questions){
  if(!valid(q?.id)||selected.has(q.id)||
     !same(q.academicRecord,originals.get(q.id))||
     q.chapterId!==q.academicRecord?.chapter?.id||
     q.topicId!==q.academicRecord?.topicId)
   refuse('projection question differs from signed original source/registered topic');
  selected.add(q.id);
 }
 // This is a source-identity reference, NOT a client-side approved-to-save token.
 const publicationLineage={schema:PHASE3W_LINEAGE_SCHEMA,
  publicationId:snapshot.publicationId,snapshotRevision:snapshot.revision,
  recordsDigest:snapshot.recordsDigest,
  clientAuthorizationState:'UNVERIFIED_CLIENT_ONLY'};
 return {...clone(projection),revision:snapshot.revision,publicationLineage,
  serverPublicationApproved:false,printApproved:false,legacyBankWriteAllowed:false};
}
