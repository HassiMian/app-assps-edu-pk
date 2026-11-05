import {test} from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeAssessmentIndex,normalizeVaultIndex,createIndependentVaultDraft,
  vaultRecoveryExport,extractVaultRecord,
} from '../liveSavedPapersV5.mjs'

test('A199 assessment list preserves only genuine server revisions and removes duplicates',()=>{
 const local=[{id:'local',serverPaperId:'ass-1'}]
 const entries=normalizeAssessmentIndex([
   {public_id:'ass-1',title:'Local already present',current_revision:3,current_revision_available:true},
   {public_id:'ass-4',title:'Second Term Assessment 4',current_revision:2,current_revision_available:true},
   {public_id:'ass-4',title:'Duplicate',current_revision:2},
   {public_id:'ass-5',title:'Assessment 5',current_revision:5,current_revision_available:false},
   {public_id:'unsafe/../../',title:'Unsafe',current_revision:2},
 ],local)
 assert.deepEqual(entries.map(e=>e.serverPaperId),['ass-4','ass-5'])
 assert.equal(entries[0].revisionAvailable,true)
 assert.equal(entries[1].revisionAvailable,false)
 assert.throws(()=>normalizeAssessmentIndex({data:[]}),/valid list/)
})

test('A199 authenticated Vault source is not silently fabricated or published',()=>{
 const index=normalizeVaultIndex([{id:271,name:'Second Term Islamiyat',className:'3',subjectName:'Islamiyat',revision:1},{id:271,name:'Duplicate'},{id:'../../',name:'Unsafe'}])
 assert.equal(index.length,1)
 const row=index[0]
 const response={success:true,data:{id:271,revision:2,document:{
   id:'original-approved',name:'Approved original',sections:[{id:'q1',type:'short',content:'Question one'}],
   config:{classLevel:'3',subject:'Islamiyat'},approvedAt:'today',approvedBy:17,isPublished:true,serverPaperId:'original',
 }}}
 const draft=createIndependentVaultDraft(response,row,1700000000000)
 assert.equal(draft.id,'vault-copy-271-1700000000000')
 assert.equal(draft.isPublished,false)
 assert.equal(draft.approvalStatus,'PENDING')
 assert.equal(draft.approvedAt,null)
 assert.equal(draft.approvedBy,null)
 assert.equal(draft.serverPaperId,null)
 assert.equal(draft.persistenceMode,'UNSAVED_NEW_COPY')
 assert.deepEqual(draft.sections,response.data.document.sections)
 assert.equal(response.data.document.isPublished,true,'original source must remain unchanged')
 const exportBlob=JSON.parse(vaultRecoveryExport(response,row))
 assert.equal(exportBlob.kind,'ASSPS_PAPER_VAULT_SOURCE_RECOVERY')
 assert.equal(exportBlob.sourceDocument.isPublished,true)
 assert.equal(exportBlob.releaseStatus,'UNMODIFIED_READ_ONLY_SOURCE_NOT_APPROVED')
 assert.throws(()=>extractVaultRecord({success:true,data:{id:272,document:{}}},row),/unavailable/)
 assert.throws(()=>createIndependentVaultDraft({success:true,data:{id:271,document:{sections:[]}}},row),/no compatible/)
})
