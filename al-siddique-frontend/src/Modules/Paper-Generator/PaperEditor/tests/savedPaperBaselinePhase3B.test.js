import {test} from 'node:test'
import assert from 'node:assert/strict'
import official from '../../seed-data/official-first-term-2026-v13.json' with {type:'json'}
import {captureSavedPaperBaseline,verifySavedPaperBaseline,compareCurrentSavedPaperWithBaseline,
 planIndependentPaperRevision} from '../core/SavedPaperBaseline.js'
import {createDuplicatePaperDraft} from '../../paperCreationDraft.js'
const paper=official.papers.find(p=>p.id.includes('class-7-social-studies'))
const copy=x=>JSON.parse(JSON.stringify(x))
const scope='tenant-assps-baseline-test'
const drafts=()=>({['doc__'+paper.id]:{
 baseCanonicalDocumentId:'doc__'+paper.id,baseFingerprint:'a'.repeat(64),
 draftVersion:2,savedAt:'2026-10-02T07:00:00.000Z',fieldPatches:{},
 metadataPatch:{},structured:{structuredPatches:{},insertedNodes:{},deletedNodeIds:[]},
}})
const rawStore=payload=>JSON.stringify({savedPapers:payload||[paper],subjects:[],questions:[]})
const make=(options={})=>captureSavedPaperBaseline({displayedPaper:paper,
 rawStoreJson:rawStore(),rawCanonicalDraftsJson:JSON.stringify(drafts()),tenantScope:scope,
 explicitAcknowledgement:true,capturedAt:'2026-10-02T07:00:00.000Z',...options})
test('explicit acknowledgement and signed-in school/account scope required',()=>{
 assert.throws(()=>make({explicitAcknowledgement:false}),/acknowledgement/)
 assert.throws(()=>make({tenantScope:'public'}),/Sign in/)
})
test('captures current persisted saved V13 paper and independent canonical working draft EXACTLY with SHA; never changes source or raw storage',()=>{
 const raw=rawStore(),rawD=JSON.stringify(drafts()),display=copy(paper)
 const bundle=make({displayedPaper:display})
 assert.equal(bundle.identity.savedPaperId,paper.id)
 assert.equal(bundle.approval.approvalStatus,'DATA_CAPTURE_ONLY')
 assert.equal(bundle.approval.visualEvidenceStatus,'SCREENSHOT_AND_PDF_NOT_CAPTURED')
 assert.equal(bundle.approval.renderCutoverAllowed,false)
 assert.equal(bundle.canonicalWorkingDraft.status,'CAPTURED')
 assert.equal(bundle.canonicalWorkingDraft.key,'doc__'+paper.id)
 assert.deepEqual(bundle.canonicalWorkingDraft.payload,drafts()['doc__'+paper.id])
 assert.deepEqual(bundle.sourcePaper,paper)
 assert.equal(bundle.appearanceSha256.length,64)
 assert.equal(bundle.sourceSha256.length,64)
 assert.equal(bundle.integrity.payloadSha256.length,64)
 assert.equal(verifySavedPaperBaseline(bundle).valid,true)
 assert.equal(raw,rawStore())
 assert.equal(rawD,JSON.stringify(drafts()))
 assert.deepEqual(display,paper)
})
test('download JSON round trip validates and correct paper comparison is readonly',()=>{
 const bundle=JSON.parse(JSON.stringify(make()))
 const compare=compareCurrentSavedPaperWithBaseline(bundle,{rawStoreJson:rawStore(),
  rawCanonicalDraftsJson:JSON.stringify(drafts()),tenantScope:scope})
 assert.equal(compare.matches,true)
 assert.equal(compare.sourceChanged,false)
 assert.equal(compare.draftChanged,false)
 assert.equal(compare.writePerformed,false)
})
test('stale displayed paper or overwritten teacher content fails closed before export',()=>{
 const changed={...copy(paper),config:{...paper.config,totalMarks:999}}
 assert.throws(()=>make({displayedPaper:changed}),/Displayed paper differs/)
 assert.throws(()=>make({rawStoreJson:rawStore([changed])}),/Displayed paper differs/)
 assert.throws(()=>make({rawStoreJson:rawStore([])}),/not in the current/)
 assert.throws(()=>make({rawStoreJson:rawStore([paper,paper])}),/Duplicate saved ID/)
 assert.throws(()=>make({rawStoreJson:'{broken'}),/corrupted/)
})
test('tampered bundle, fake visual approval and changed overlay are rejected',()=>{
 const base=make()
 const changed=copy(base);changed.sourcePaper.official_section[0].marks=777
 assert.throws(()=>verifySavedPaperBaseline(changed),/payload digest mismatch/)
 const fake=copy(base);fake.approval.renderCutoverAllowed=true
 assert.throws(()=>verifySavedPaperBaseline(fake),/unverified data capture/)
 const brokenOverlay=copy(base);brokenOverlay.canonicalWorkingDraft.payload.fieldPatches.test='mutated'
 assert.throws(()=>verifySavedPaperBaseline(brokenOverlay),/payload digest mismatch/)
 const brokenSha=copy(base);brokenSha.integrity.payloadSha256='f'.repeat(64)
 assert.throws(()=>verifySavedPaperBaseline(brokenSha),/payload digest mismatch/)
})
test('current source content and separate overlay changes are reported independently without overwrite',()=>{
 const base=make()
 const change=copy(paper)
 change.editorSettings.fontFamily='Unexpected test font'
 const sourceResult=compareCurrentSavedPaperWithBaseline(base,{rawStoreJson:rawStore([change]),
  rawCanonicalDraftsJson:JSON.stringify(drafts()),tenantScope:scope})
 assert.equal(sourceResult.matches,false)
 assert.equal(sourceResult.sourceChanged,true)
 assert.equal(sourceResult.draftChanged,false)
 assert.deepEqual(sourceResult.changedTopLevel,['editorSettings'])
 const newDrafts=drafts();newDrafts['doc__'+paper.id].fieldPatches.example='test'
 const draftResult=compareCurrentSavedPaperWithBaseline(base,{rawStoreJson:rawStore(),
  rawCanonicalDraftsJson:JSON.stringify(newDrafts),tenantScope:scope})
 assert.equal(draftResult.sourceChanged,false)
 assert.equal(draftResult.draftChanged,true)
 assert.equal(draftResult.writePerformed,false)
 assert.throws(()=>compareCurrentSavedPaperWithBaseline(base,{rawStoreJson:rawStore(),tenantScope:'tenant-other'}),/different tenant/)
})
test('paper without a separate canonical draft records absence, never invents overlay',()=>{
 const base=make({rawCanonicalDraftsJson:null})
 assert.equal(base.canonicalWorkingDraft.status,'NO_STORED_DRAFT')
 assert.equal(base.canonicalWorkingDraft.payload,null)
 assert.equal(base.canonicalWorkingDraft.sha256,null)
 assert.equal(verifySavedPaperBaseline(base).valid,true)
 assert.equal(compareCurrentSavedPaperWithBaseline(base,{rawStoreJson:rawStore(),tenantScope:scope}).matches,true)
})
test('ambiguous/corrupted working draft storage blocks capture instead of silently dropping current teacher changes',()=>{
 const amb=drafts();amb[paper.id]={...copy(amb['doc__'+paper.id]),baseCanonicalDocumentId:paper.id}
 assert.throws(()=>make({rawCanonicalDraftsJson:JSON.stringify(amb)}),/Two canonical/)
 const bad=drafts();bad['doc__'+paper.id].baseCanonicalDocumentId='wrong'
 assert.throws(()=>make({rawCanonicalDraftsJson:JSON.stringify(bad)}),/mismatch/)
 assert.throws(()=>make({rawCanonicalDraftsJson:'[broken'}),/corrupted/)
})
test('CAS revision proposal: stale baseline, reused source ID, fake approved copy blocked; valid copy NEVER committed',()=>{
 const base=make()
 const draft=createDuplicatePaperDraft(paper)
 assert.equal(draft.id,undefined)
 const proposal=planIndependentPaperRevision(base,{rawStoreJson:rawStore(),
  rawCanonicalDraftsJson:JSON.stringify(drafts()),tenantScope:scope,proposedCopy:draft})
 assert.equal(proposal.state,'UNCOMMITTED_PROPOSAL')
 assert.equal(proposal.writeTarget,'NEW_COPY_ONLY')
 assert.equal(proposal.serverAuthorizationRequired,true)
 assert.equal(proposal.visualApprovalPending,true)
 assert.equal(proposal.sourceId,paper.id)
 assert.equal(proposal.proposedCopy.id,undefined)
 assert.deepEqual(paper,base.sourcePaper)
 assert.throws(()=>planIndependentPaperRevision(base,{rawStoreJson:rawStore(),
  rawCanonicalDraftsJson:JSON.stringify(drafts()),tenantScope:scope,
  proposedCopy:{...draft,id:paper.id}}),/unsaved independent/)
 assert.throws(()=>planIndependentPaperRevision(base,{rawStoreJson:rawStore(),
  rawCanonicalDraftsJson:JSON.stringify(drafts()),tenantScope:scope,
  proposedCopy:{...draft,printReadiness:'APPROVED'}}),/automatically/)
 const altered=copy(paper);altered.config.totalMarks=999
 assert.throws(()=>planIndependentPaperRevision(base,{rawStoreJson:rawStore([altered]),
  rawCanonicalDraftsJson:JSON.stringify(drafts()),tenantScope:scope,proposedCopy:draft}),/changed since baseline/)
})
