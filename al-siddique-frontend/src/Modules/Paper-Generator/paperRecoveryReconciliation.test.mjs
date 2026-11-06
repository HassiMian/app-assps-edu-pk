import test from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { inspectPaperRecoverySources, attestPaperRecoverySources } from './legacyPaperRecovery.js'
import { comparePaperRecoverySources } from './paperRecoveryReconciliation.js'

const user={id:1,role:'principal',school_id:1,tenant_id:'assps'}
function area() {
  const map=new Map()
  const calls={writes:0,removes:0}
  return { calls, setItem(k,v){calls.writes++;map.set(k,v)},
    getItem(k){return map.get(k)??null},removeItem(k){calls.removes++;map.delete(k)} }
}
function fixture(oldRows,newRows) {
  const l=area(), s=area()
  l.setItem('al_siddique_paper_store',JSON.stringify({savedPapers:oldRows}))
  l.setItem('al_siddique_paper_store__tenant-assps',JSON.stringify({savedPapers:newRows}))
  const storage={localStorage:l,sessionStorage:s}
  const baseline={localWrites:l.calls.writes,sessionWrites:s.calls.writes}
  return {storage,baseline}
}
async function inspect(storage,actor=user) {
  const report=inspectPaperRecoverySources({user:actor,storage})
  return attestPaperRecoverySources({user:actor,storage,cryptography:webcrypto,report})
}
async function compare(storage,actor=user) {
  return comparePaperRecoverySources({user:actor,storage,cryptography:webcrypto,report:await inspect(storage,actor)})
}
const papers=(n,offset=0)=>Array.from({length:n},(_,i)=>({id:'paper-'+(offset+i),name:'Paper '+i,content:'content-'+(offset+i)}))
test('49 shared and nine extra papers resolve to 58 IDs, without unsafe auto merge',async()=>{
  const old=papers(49), newer=papers(49)
  newer[0]={...newer[0],content:'principal-reviewed revision'}
  newer.push(...papers(9,49))
  const {storage,baseline}=fixture(old,newer)
  const result=await compare(storage)
  assert.equal(result.uniquePaperIds,58)
  assert.equal(result.sourceCount,2)
  assert.equal(result.pairwise[0].sharedIds,49)
  assert.equal(result.pairwise[0].onlyB+result.pairwise[0].onlyA,9)
  assert.equal(result.pairwise[0].differentBodies,1)
  assert.equal(result.requiresOwnerRevisionReview,true)
  assert.equal(result.autoMerged,false)
  assert.equal(storage.localStorage.calls.writes,baseline.localWrites)
  assert.equal(storage.localStorage.calls.removes,0)
})
test('identical revision objects ignore irrelevant JSON property ordering',async()=>{
  const old=[{id:'1',content:{b:2,a:1}}],newer=[{content:{a:1,b:2},id:'1'}]
  const {storage}=fixture(old,newer);const r=await compare(storage)
  assert.equal(r.pairwise[0].matchingBodies,1)
  assert.equal(r.pairwise[0].differentBodies,0)
  assert.equal(r.requiresOwnerRevisionReview,false)
})
test('no account or school authorization means no inspection',async()=>{
  const {storage}=fixture(papers(1),papers(2))
  await assert.rejects(compare(storage,{...user,role:'student'}),/RECOVERY_IDENTITY_REVIEW_REQUIRED|PAPER_RECONCILE_AUTHORIZED_SCOPE_REQUIRED/)
  const report=await inspect(storage)
  await assert.rejects(comparePaperRecoverySources({user:{...user,school_id:2},storage,cryptography:webcrypto,report}),/RECOVERY_IDENTITY_REVIEW_REQUIRED|PAPER_RECONCILE_AUTHORIZED_SCOPE_REQUIRED/)
})
test('tampering with a source after its inspected hash fails closed',async()=>{
  const {storage}=fixture(papers(1),papers(2))
  const report=await inspect(storage)
  storage.localStorage.setItem('al_siddique_paper_store',JSON.stringify({savedPapers:papers(3)}))
  await assert.rejects(comparePaperRecoverySources({user,storage,cryptography:webcrypto,report}),/PAPER_RECONCILE_SOURCE_CHANGED/)
})
test('duplicate paper IDs inside a valid source are rejected',async()=>{
  const {storage}=fixture([{id:'same'},{id:'same'}],papers(1))
  await assert.rejects(compare(storage),/PAPER_RECONCILE_DUPLICATE_ID/)
})
test('missing IDs, malformed records or unexpected deep objects reject',async()=>{
  const {storage}=fixture([{}],papers(1))
  await assert.rejects(compare(storage),/PAPER_RECONCILE_INVALID_OR_MISSING_ID/)
})
test('source attestation hash cannot be omitted',async()=>{
  const {storage}=fixture(papers(1),papers(2))
  const report=await inspect(storage)
  report.sources.find(x=>x.state==='valid').rawSha256=null
  await assert.rejects(comparePaperRecoverySources({user,storage,cryptography:webcrypto,report}),/PAPER_RECONCILE_ATTESTATION_REQUIRED/)
})
test('same id across two sources with conflicting content is never silently overwritten',async()=>{
  const {storage}=fixture([{id:5,text:'old'}],[{id:5,text:'new'}])
  const result=await compare(storage)
  assert.equal(result.uniquePaperIds,1)
  assert.equal(result.pairwise[0].differentBodies,1)
  assert.equal(result.autoMerged,false)
  assert.equal(result.deletedOriginals,false)
})
test('changed actor identity with unchanged school cannot reuse an old snapshot',async()=>{
  const {storage}=fixture(papers(1),papers(1))
  const report=await inspect(storage)
  await assert.rejects(comparePaperRecoverySources({user:{...user,id:2},storage,cryptography:webcrypto,report}),/PAPER_RECONCILE_AUTHORIZED_SCOPE_REQUIRED/)
})
test('unrecognized prior tenant-default source is never swept automatically',async()=>{
  const {storage}=fixture(papers(1),papers(2))
  storage.localStorage.setItem('al_siddique_paper_store__tenant-default',JSON.stringify({savedPapers:papers(100)}))
  const r=await compare(storage)
  assert.equal(r.uniquePaperIds,2)
  assert.equal(r.sourceCount,2)
  assert.equal(r.sources.some(x => x.source.includes('default')),false)
})
test('a missing WebCrypto digest rejects reconciliation',async()=>{
  const {storage}=fixture(papers(1),papers(2))
  const report=await inspect(storage)
  await assert.rejects(comparePaperRecoverySources({user,storage,cryptography:{},report}),/SECURE_BROWSER_REQUIRED/)
})
test('valid but empty older source never masks a populated current source',async()=>{
  const {storage}=fixture([],papers(5))
  const r=await compare(storage)
  assert.equal(r.sourceCount,1)
  assert.equal(r.uniquePaperIds,5)
  assert.equal(r.pairwise.length,0)
})
test('snapshot that changes without changing paper count still fails SHA256',async()=>{
  const {storage}=fixture([{id:'same',text:'old'}],[{id:'same',text:'new'}])
  const report=await inspect(storage)
  storage.localStorage.setItem('al_siddique_paper_store',JSON.stringify({savedPapers:[{id:'same',text:'NEW'}]}))
  await assert.rejects(comparePaperRecoverySources({user,storage,cryptography:webcrypto,report}),/PAPER_RECONCILE_SOURCE_CHANGED/)
})
test('a JSON nested deeper than 40 is rejected rather than normalized',async()=>{
  let deep={id:'p'}
  let node=deep
  for(let i=0;i<42;i++){node.k={};node=node.k}
  const {storage}=fixture([deep],[{id:'p'}])
  await assert.rejects(compare(storage),/PAPER_RECONCILE_OVERDEEP_RECORD/)
})
