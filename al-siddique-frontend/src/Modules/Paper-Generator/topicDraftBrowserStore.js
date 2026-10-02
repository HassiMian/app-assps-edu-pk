import {getTenantStorageItem,setTenantStorageItem,tenantStorageKey} from '../../services/tenantStorage'
import {createTopicDraftLibrary,inspectTopicDraftLibrary,advanceTopicDraftLibrary,restoreTopicDraftRevision}
 from './seed-data/grade9-10-staging/topicDraftLibrary.mjs'
const BASE_KEY='assps_grade9_10_topic_drafts_v1'
const parse=raw=>{try{return raw?JSON.parse(raw):null}catch{return null}}
const now=()=>new Date().toISOString()
const keyPart=value=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'')
export function topicDraftBaseKey(curriculumKey){
 const part=keyPart(curriculumKey)
 if(!part)throw new Error('Curriculum key is required for draft storage.')
 return `${BASE_KEY}__${part}`
}
export function topicDraftStorageKey(curriculumKey){return tenantStorageKey(topicDraftBaseKey(curriculumKey))}
export function loadTopicDraftLibrary({curriculumKey,sourcePdfSha256}){
 const raw=getTenantStorageItem(topicDraftBaseKey(curriculumKey))
 if(raw===null)return {library:createTopicDraftLibrary({curriculumKey,sourcePdfSha256,now:now()}),created:true}
 const parsed=parse(raw)
 const checked=inspectTopicDraftLibrary(parsed,{curriculumKey,sourcePdfSha256})
 if(!checked.valid)return {library:null,created:false,errors:checked.errors}
 return {library:parsed,created:false,errors:[]}
}
export function saveTopicDraftLibrary({expectedRevision,curriculumKey,sourcePdfSha256,drafts,blocks,knownExternalIds=[]}){
 const loaded=loadTopicDraftLibrary({curriculumKey,sourcePdfSha256})
 if(!loaded.library)return {ok:false,code:'INVALID_LIBRARY',errors:loaded.errors||['Could not load draft library.']}
 const advanced=advanceTopicDraftLibrary(loaded.library,{expectedRevision,drafts,blocks,knownExternalIds,now:now()})
 if(!advanced.ok)return advanced
 try{setTenantStorageItem(topicDraftBaseKey(curriculumKey),JSON.stringify(advanced.library))}
 catch(e){return {ok:false,code:'WRITE_FAILED',errors:['Tenant-scoped draft write failed: '+e.message]}}
 return {ok:true,library:advanced.library}
}
export function rollbackTopicDraftLibrary({expectedRevision,targetRevision,curriculumKey,sourcePdfSha256,knownExternalIds=[]}){
 const loaded=loadTopicDraftLibrary({curriculumKey,sourcePdfSha256})
 if(!loaded.library)return {ok:false,code:'INVALID_LIBRARY',errors:loaded.errors||['Could not load draft library.']}
 const restored=restoreTopicDraftRevision(loaded.library,{expectedRevision,targetRevision,knownExternalIds,now:now()})
 if(!restored.ok)return restored
 try{setTenantStorageItem(topicDraftBaseKey(curriculumKey),JSON.stringify(restored.library))}
 catch(e){return {ok:false,code:'WRITE_FAILED',errors:['Tenant-scoped rollback write failed: '+e.message]}}
 return {ok:true,library:restored.library}
}
