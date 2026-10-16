// Root-private, source-fingerprint-bound technical OCR progress; no raw textbook OCR text.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash = b => createHash('sha256').update(b).digest('hex');
export const pageKey = item => String(item.catalog)+'|'+String(item.page);
export function fingerprint(manifestBytes,textLayerBytes,stemEntries){
  const ordered=[...stemEntries].sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
  return hash(Buffer.from(JSON.stringify({
    manifest:hash(manifestBytes),textLayer:hash(textLayerBytes),
    stems:hash(Buffer.from(JSON.stringify(ordered)))
  })));
}
export function newProgress(sourceFingerprint){
  if (!/^[a-f0-9]{64}$/.test(sourceFingerprint))throw Error('INVALID_OCR_SOURCE_FINGERPRINT');
  return {schema:'ASSPS_GRADE910_OCR_RESUME_V1',sourceFingerprint,completedPages:[],
    results:[],assets:[],academicApproved:false,published:false,rawTextPersisted:false};
}
export function validateProgress(doc,expectedFingerprint,eligiblePages){
  if(!doc || doc.schema!=='ASSPS_GRADE910_OCR_RESUME_V1' ||
     doc.sourceFingerprint!==expectedFingerprint)throw Error('OCR_RESUME_SOURCE_HASH_CHANGED');
  if(!Array.isArray(doc.completedPages)||!Array.isArray(doc.results)||!Array.isArray(doc.assets))
    throw Error('INVALID_OCR_RESUME_SHAPE');
  if(doc.academicApproved!==false||doc.published!==false||doc.rawTextPersisted!==false)
    throw Error('UNTRUSTED_OCR_PROGRESS_PUBLICATION_FLAGS');
  const candidates=new Map(eligiblePages.map(x=>[pageKey(x),x]));
  const processed=new Set();
  for(const key of doc.completedPages){
    if(!candidates.has(key)||processed.has(key))throw Error('INVALID_OR_DUPLICATE_OCR_PAGE_RECEIPT');
    processed.add(key);
  }
  const assets=new Set();
  for(const a of doc.assets){
    const key=pageKey(a);
    if(!processed.has(key)||assets.has(key)||a.rawPageImagePersisted!==false||a.rawOCRTextPersisted!==false)
      throw Error('OCR_ASSET_RECEIPT_NOT_BOUNDED_OR_CONTAINS_PRIVATE_MATERIAL');
    assets.add(key);
  }
  if(assets.size!==processed.size)throw Error('OCR_PROGRESS_PAGE_COUNTS_DISAGREE');
  const originalIDs=new Map();
  for(const p of eligiblePages)for(const r of p.claims)originalIDs.set(r.questionId,pageKey(p));
  const checked=new Set();
  for(const r of doc.results){
    if(checked.has(r.questionId)||!originalIDs.has(r.questionId)||
       !processed.has(originalIDs.get(r.questionId))||
       originalIDs.get(r.questionId)!==pageKey(r)||r.autoPublished!==false||
       r.qualifiedFacultyApproved!==false||r.academicQuestionContentPageVerified!==false)
       throw Error('INVALID_OCR_QUESTION_RECEIPT');
    checked.add(r.questionId);
  }
  const target=new Set();
  for(const p of eligiblePages)if(processed.has(pageKey(p)))for(const r of p.claims)target.add(r.questionId);
  if(checked.size!==target.size)throw Error('OCR_PROGRESS_CLAIM_COVERAGE_MISMATCH');
  return doc;
}
export function persistCheckpoint(location,data) {
  const dir=path.dirname(location);
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  if((fs.statSync(dir).mode&0o077)!==0)throw Error('OCR_STATE_DIRECTORY_NOT_ROOT_PRIVATE');
  const tmp=location+'.tmp-'+process.pid;
  const fd=fs.openSync(tmp,'wx',0o600);
  try {
    fs.writeFileSync(fd,JSON.stringify(data)+'\n');
    fs.fsyncSync(fd);
  }finally{fs.closeSync(fd);}
  fs.renameSync(tmp,location);
}
